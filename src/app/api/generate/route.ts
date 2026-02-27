import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  instagram:
    'Crie um post para Instagram com até 2200 caracteres. Inclua hashtags relevantes no final (5-10). Use emojis de forma moderada. Formate com quebras de linha para legibilidade.',
  twitter:
    'Crie um post para Twitter/X com até 280 caracteres. Seja conciso e impactante. Pode incluir 1-3 hashtags.',
  linkedin:
    'Crie um post profissional para LinkedIn. Use storytelling, seja informativo e inclua uma chamada para ação. Formate com parágrafos curtos.',
  facebook:
    'Crie um post para Facebook com tom conversacional. Pode ser mais longo, use parágrafos e inclua uma pergunta para engajamento.',
  tiktok:
    'Crie um roteiro curto para TikTok. Comece com um gancho nos primeiros 3 segundos. Inclua hashtags trending. Mantenha dinâmico e direto.',
  generic:
    'Crie um post para redes sociais. Seja claro e envolvente.',
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  profissional: 'Use tom profissional, autoritário e confiante.',
  casual: 'Use tom casual, amigável e descontraído.',
  humoristico: 'Use humor inteligente, seja engraçado mas relevante.',
  inspirador: 'Use tom inspirador e motivacional, toque nas emoções.',
  educativo: 'Use tom educativo, explique conceitos de forma clara e acessível.',
  vendas: 'Use tom persuasivo, destaque benefícios e inclua chamada para ação forte.',
};

export async function POST(request: NextRequest) {
  try {
    const { topic, platform, tone } = await request.json();

    if (!topic || !platform || !tone) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: topic, platform, tone' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Fallback: gera um post template sem IA
      return NextResponse.json({
        content: generateFallbackPost(topic, platform, tone),
      });
    }

    const systemPrompt = `Você é um especialista em marketing digital e criação de conteúdo para redes sociais no Brasil.
${PLATFORM_INSTRUCTIONS[platform] || PLATFORM_INSTRUCTIONS.generic}
${TONE_INSTRUCTIONS[tone] || ''}
Responda APENAS com o conteúdo do post, sem explicações adicionais. Escreva em português brasileiro.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Crie um post sobre: ${topic}` },
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      return NextResponse.json({
        content: data.choices[0].message.content.trim(),
      });
    }

    return NextResponse.json(
      { error: 'Erro ao gerar conteúdo' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

function generateFallbackPost(topic: string, platform: string, tone: string): string {
  const toneEmojis: Record<string, string> = {
    profissional: '💼',
    casual: '😎',
    humoristico: '😂',
    inspirador: '✨',
    educativo: '📚',
    vendas: '🎯',
  };

  const emoji = toneEmojis[tone] || '📝';

  if (platform === 'twitter') {
    return `${emoji} ${topic}\n\nO que vocês acham? 👇\n\n#${topic.split(' ')[0]} #conteudo`;
  }

  return `${emoji} ${topic}\n\nEste é um post de exemplo. Para gerar posts com IA, adicione sua chave OPENAI_API_KEY no arquivo .env.local\n\n💡 Configure e comece a criar conteúdo incrível!\n\n#fabricadeposts #conteudo #ia`;
}
