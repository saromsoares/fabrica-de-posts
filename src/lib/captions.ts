import type { CaptionStyle } from '@/types/database';

type CaptionParams = {
  productName: string;
  price?: string;
  condition?: string;
  cta?: string;
  whatsapp?: string;
  instagram?: string;
  storeName?: string;
  category?: string;
};

const HASHTAGS: Record<string, string[]> = {
  'iluminacao-automotiva': ['#iluminaçãoautomotiva', '#ledautomotivo', '#tuning', '#faroisled', '#autoparts'],
  'leds': ['#led', '#ledlights', '#iluminação', '#luzled', '#eficiencia'],
  'farois': ['#farois', '#farolled', '#faroldeneblina', '#autoiluminação'],
  'acessorios': ['#acessoriosautomotivos', '#tuning', '#carros', '#autoparts'],
  'outros': ['#produtos', '#qualidade', '#novidade'],
};

const defaultHashtags = ['#oferta', '#promoção', '#qualidade', '#envioimediato'];

function getHashtags(category?: string): string {
  const tags = category ? (HASHTAGS[category] || defaultHashtags) : defaultHashtags;
  return tags.slice(0, 5).join(' ');
}

function buildContact(p: CaptionParams): string {
  const parts: string[] = [];
  if (p.whatsapp) parts.push(`📱 WhatsApp: ${p.whatsapp}`);
  if (p.instagram) parts.push(`📸 ${p.instagram}`);
  if (p.storeName) parts.push(`🏪 ${p.storeName}`);
  return parts.join('\n');
}

export function generateCaption(style: CaptionStyle, params: CaptionParams): { short: string; medium: string } {
  const contact = buildContact(params);
  const hashtags = getHashtags(params.category);
  const ctaText = params.cta || 'Garanta o seu!';

  switch (style) {
    case 'oferta':
      return {
        short: `🔥 ${params.productName} por apenas ${params.price || 'preço especial'}!\n${ctaText}\n\n${contact}\n\n${hashtags}`,
        medium: `🔥 OFERTA IMPERDÍVEL!\n\n${params.productName} com condição especial${params.condition ? `: ${params.condition}` : ''}!\n\n💰 ${params.price || 'Consulte o preço'}\n\n${ctaText}\n\n${contact}\n\n${hashtags}`,
      };

    case 'institucional':
      return {
        short: `✅ ${params.productName} — Qualidade que você pode confiar.\n\n${contact}\n\n${hashtags}`,
        medium: `✅ Conheça o ${params.productName}!\n\nQualidade premium para quem busca o melhor. ${params.condition || 'Produto com garantia e suporte completo.'}\n\nEntre em contato e saiba mais:\n${contact}\n\n${hashtags}`,
      };

    case 'lancamento':
      return {
        short: `🚀 NOVIDADE! ${params.productName} já disponível!\n${ctaText}\n\n${contact}\n\n${hashtags}`,
        medium: `🚀 ACABOU DE CHEGAR!\n\n${params.productName}\n\nO lançamento que você esperava. ${params.condition || 'Tecnologia de ponta e design inovador.'}\n\n💰 ${params.price || 'Consulte condições especiais de lançamento'}\n\n${ctaText}\n\n${contact}\n\n${hashtags}`,
      };

    case 'estoque_limitado':
      return {
        short: `⚡ ÚLTIMAS UNIDADES! ${params.productName} — ${params.price || 'Preço especial'}\n\n${contact}\n\n${hashtags}`,
        medium: `⚡ ESTOQUE LIMITADO!\n\n${params.productName}\n\n⚠️ Poucas unidades restantes! Não perca essa oportunidade.\n\n💰 ${params.price || 'Preço promocional'}\n${params.condition || ''}\n\n${ctaText}\n\n${contact}\n\n${hashtags}`,
      };

    case 'beneficio':
      return {
        short: `💡 ${params.productName} — Mais performance, mais segurança.\n\n${contact}\n\n${hashtags}`,
        medium: `💡 Por que escolher ${params.productName}?\n\n✅ Alta durabilidade\n✅ Performance superior\n✅ Fácil instalação\n${params.condition ? `✅ ${params.condition}` : ''}\n\n${params.price ? `💰 A partir de ${params.price}` : ''}\n\n${ctaText}\n\n${contact}\n\n${hashtags}`,
      };

    default:
      return {
        short: `${params.productName} — ${params.price || 'Consulte'}\n\n${contact}\n\n${hashtags}`,
        medium: `${params.productName}\n\n${params.condition || ''}\n\n${params.price ? `💰 ${params.price}` : ''}\n\n${ctaText}\n\n${contact}\n\n${hashtags}`,
      };
  }
}

export const CAPTION_STYLES: { value: CaptionStyle; label: string; emoji: string }[] = [
  { value: 'oferta', label: 'Oferta Agressiva', emoji: '🔥' },
  { value: 'institucional', label: 'Institucional', emoji: '✅' },
  { value: 'lancamento', label: 'Lançamento', emoji: '🚀' },
  { value: 'estoque_limitado', label: 'Estoque Limitado', emoji: '⚡' },
  { value: 'beneficio', label: 'Benefício/Uso', emoji: '💡' },
];
