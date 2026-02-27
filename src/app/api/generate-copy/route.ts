import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave da OpenAI não configurada. Adicione OPENAI_API_KEY nas variáveis de ambiente.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      productName,
      price,
      condition,
      whatsapp,
      instagram,
      storeName,
      factoryName,
      objective, // 'oferta' | 'institucional' | 'lancamento' | 'estoque_limitado' | 'beneficio'
    } = body;

    if (!productName) {
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
      return NextResponse.json({ error: 'A IA não retornou nenhum texto.' }, { status: 500 });
    }

    return NextResponse.json({ caption });
  } catch (error) {
    console.error('Erro ao gerar copy:', error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json({ error: 'Chave da OpenAI inválida.' }, { status: 401 });
      }
      if (error.status === 429) {
        return NextResponse.json({ error: 'Limite de requisições da OpenAI atingido. Tente novamente em alguns segundos.' }, { status: 429 });
      }
      return NextResponse.json({ error: `Erro da OpenAI: ${error.message}` }, { status: error.status || 500 });
    }

    return NextResponse.json(
      { error: 'Erro interno ao gerar a legenda. Tente novamente.' },
      { status: 500 }
    );
  }
}
