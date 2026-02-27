import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/* Rate limiter simples em memória por IP */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 300000);

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const { allowed, remaining } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde 1 minuto e tente novamente.' },
        { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave da OpenAI não configurada no servidor. Contate o administrador.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { productName, price, condition, whatsapp, instagram, storeName, factoryName, objective } = body;

    if (!productName || typeof productName !== 'string') {
      return NextResponse.json({ error: 'Nome do produto é obrigatório.' }, { status: 400 });
    }

    const objectiveMap: Record<string, string> = {
      oferta: 'Oferta agressiva com foco em preço e urgência. Use gatilhos de escassez e ação imediata.',
      institucional: 'Tom institucional, transmitindo confiança, qualidade e profissionalismo da loja.',
      lancamento: 'Anúncio de lançamento/novidade. Gere curiosidade e empolgação.',
      estoque_limitado: 'Urgência por estoque limitado. Crie FOMO (medo de perder) e escassez.',
      beneficio: 'Foco nos benefícios e vantagens do produto para o cliente. Eduque e convença.',
    };
    const objectivePrompt = objectiveMap[objective] || objectiveMap['oferta'];

    const prompt = `Você é um copywriter especialista em Instagram para lojas e revendedores brasileiros. Gere UMA legenda para Instagram altamente persuasiva.

DADOS DO POST:
- Produto: ${productName}
${price ? `- Preço: ${price}` : ''}
${condition ? `- Condição/Destaque: ${condition}` : ''}
${factoryName ? `- Marca/Fábrica: ${factoryName}` : ''}
${storeName ? `- Loja: ${storeName}` : ''}
${whatsapp ? `- WhatsApp: ${whatsapp}` : ''}
${instagram ? `- Instagram: ${instagram}` : ''}

OBJETIVO: ${objectivePrompt}

REGRAS:
- Escreva em português brasileiro
- Use emojis estrategicamente (não exagere, 3-5 emojis máx)
- Use gatilhos mentais (escassez, autoridade, prova social, urgência)
- Inclua uma CTA (chamada para ação) forte no final
- Inclua o WhatsApp na CTA se fornecido
- Inclua hashtags relevantes no final (5-8 hashtags)
- Mantenha a legenda curta e impactante (máximo 150 palavras)
- NÃO use aspas em volta da legenda
- NÃO inclua explicações, apenas a legenda pronta para postar`;

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um copywriter brasileiro expert em social media para lojas. Responda APENAS com a legenda, sem explicações extras.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const caption = completion.choices[0]?.message?.content?.trim() || '';

    if (!caption) {
      return NextResponse.json({ error: 'A IA não retornou nenhum texto. Tente novamente.' }, { status: 502 });
    }

    return NextResponse.json(
      { caption },
      { headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  } catch (error) {
    console.error('Erro ao gerar copy:', error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json({ error: 'Chave da OpenAI inválida. Contate o administrador.' }, { status: 503 });
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Limite da OpenAI atingido. Tente em alguns segundos.' },
          { status: 429, headers: { 'Retry-After': '10' } }
        );
      }
      return NextResponse.json(
        { error: `Erro da OpenAI: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Erro interno ao gerar a legenda. Tente novamente.' },
      { status: 500 }
    );
  }
}
