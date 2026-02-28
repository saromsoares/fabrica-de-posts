-- ============================================================
-- MIGRATION: populate_base_templates
-- Date: 2026-02-28
-- Description: Insert 10 base templates (5 feed + 5 story)
-- Each template has a config_json with layout zones, styles and AI prompt hints
-- ============================================================

INSERT INTO public.templates (name, format, config_json, active) VALUES

-- ==================== FEED (1:1 - 1080x1080) ====================

('Promoção Destaque', 'feed', '{
  "layout": "promo_highlight",
  "description": "Fundo vibrante com produto centralizado, preço em destaque e badge de desconto",
  "dimensions": { "width": 1080, "height": 1080 },
  "zones": {
    "product_image": { "x": 190, "y": 80, "width": 700, "height": 700, "fit": "contain" },
    "badge": { "x": 50, "y": 50, "type": "circle", "size": 160, "text": "OFF" },
    "product_name": { "x": 540, "y": 820, "fontSize": 42, "fontWeight": "bold", "align": "center", "maxWidth": 900 },
    "price": { "x": 540, "y": 900, "fontSize": 56, "fontWeight": "bold", "align": "center" },
    "brand_name": { "x": 540, "y": 1020, "fontSize": 24, "align": "center" },
    "logo": { "x": 930, "y": 930, "width": 120, "height": 120, "fit": "contain" }
  },
  "style": {
    "background": "brand_primary",
    "text_color": "#FFFFFF",
    "badge_color": "#FF3B30",
    "price_color": "#FFDD00"
  },
  "ai_prompt_hint": "Foque em urgência, escassez e preço atrativo. Use emojis de fogo e alerta."
}', true),

('Lançamento Elegante', 'feed', '{
  "layout": "launch_elegant",
  "description": "Layout minimalista com fundo branco, produto em destaque e tipografia sofisticada",
  "dimensions": { "width": 1080, "height": 1080 },
  "zones": {
    "product_image": { "x": 140, "y": 40, "width": 800, "height": 800, "fit": "contain" },
    "tag_line": { "x": 540, "y": 20, "fontSize": 18, "fontWeight": "normal", "align": "center", "text": "NOVO" },
    "product_name": { "x": 540, "y": 870, "fontSize": 38, "fontWeight": "bold", "align": "center", "maxWidth": 900 },
    "description": { "x": 540, "y": 930, "fontSize": 22, "align": "center", "maxWidth": 800, "maxLines": 2 },
    "brand_name": { "x": 540, "y": 1030, "fontSize": 20, "align": "center" },
    "logo": { "x": 40, "y": 40, "width": 100, "height": 100, "fit": "contain" }
  },
  "style": {
    "background": "#FFFFFF",
    "text_color": "#1A1A1A",
    "tag_color": "brand_primary",
    "accent_line": true
  },
  "ai_prompt_hint": "Tom sofisticado e aspiracional. Destaque novidade e exclusividade. Sem exagero em emojis."
}', true),

('Comparativo Antes/Depois', 'feed', '{
  "layout": "before_after",
  "description": "Split vertical com antes e depois, ideal para mostrar resultado ou comparação",
  "dimensions": { "width": 1080, "height": 1080 },
  "zones": {
    "left_image": { "x": 0, "y": 0, "width": 530, "height": 1080, "fit": "cover", "label": "SEM" },
    "right_image": { "x": 550, "y": 0, "width": 530, "height": 1080, "fit": "cover", "label": "COM" },
    "divider": { "x": 530, "y": 0, "width": 20, "height": 1080, "color": "#FFFFFF" },
    "product_name": { "x": 540, "y": 950, "fontSize": 36, "fontWeight": "bold", "align": "center" },
    "brand_name": { "x": 540, "y": 1010, "fontSize": 22, "align": "center" },
    "logo": { "x": 930, "y": 30, "width": 100, "height": 100, "fit": "contain" }
  },
  "style": {
    "background": "#000000",
    "text_color": "#FFFFFF",
    "label_color": "brand_primary"
  },
  "ai_prompt_hint": "Destaque a transformação e benefício do produto. Use antes/depois como gatilho visual."
}', true),

('Carrossel Informativo', 'feed', '{
  "layout": "info_carousel",
  "description": "Card com ícone, título e descrição — ideal para benefícios ou especificações do produto",
  "dimensions": { "width": 1080, "height": 1080 },
  "zones": {
    "icon": { "x": 540, "y": 250, "size": 120, "type": "emoji" },
    "title": { "x": 540, "y": 420, "fontSize": 48, "fontWeight": "bold", "align": "center", "maxWidth": 800 },
    "body_text": { "x": 540, "y": 520, "fontSize": 28, "align": "center", "maxWidth": 750, "maxLines": 4 },
    "page_indicator": { "x": 540, "y": 1000, "type": "dots", "total": 5 },
    "brand_name": { "x": 540, "y": 1040, "fontSize": 20, "align": "center" },
    "logo": { "x": 40, "y": 40, "width": 80, "height": 80, "fit": "contain" }
  },
  "style": {
    "background": "brand_primary",
    "text_color": "#FFFFFF",
    "icon_bg": "rgba(255,255,255,0.15)"
  },
  "ai_prompt_hint": "Gere 5 slides: 1-capa com nome do produto, 2/3/4-benefícios com emoji, 5-CTA com contato."
}', true),

('Depoimento Cliente', 'feed', '{
  "layout": "testimonial",
  "description": "Quote de cliente com aspas grandes, foto do produto ao fundo com overlay",
  "dimensions": { "width": 1080, "height": 1080 },
  "zones": {
    "background_image": { "x": 0, "y": 0, "width": 1080, "height": 1080, "fit": "cover", "overlay": "rgba(0,0,0,0.65)" },
    "quote_mark": { "x": 100, "y": 300, "fontSize": 120, "text": "❝" },
    "quote_text": { "x": 540, "y": 450, "fontSize": 32, "align": "center", "maxWidth": 800, "maxLines": 4, "italic": true },
    "customer_name": { "x": 540, "y": 700, "fontSize": 22, "align": "center" },
    "stars": { "x": 540, "y": 750, "type": "rating", "value": 5 },
    "product_name": { "x": 540, "y": 950, "fontSize": 28, "fontWeight": "bold", "align": "center" },
    "logo": { "x": 930, "y": 930, "width": 100, "height": 100, "fit": "contain" }
  },
  "style": {
    "background": "#1A1A1A",
    "text_color": "#FFFFFF",
    "quote_color": "brand_primary",
    "stars_color": "#FFD700"
  },
  "ai_prompt_hint": "Crie um depoimento fictício mas realista de um cliente satisfeito. Inclua nome e cidade."
}', true),

-- ==================== STORY (9:16 - 1080x1920) ====================

('Story Oferta Relâmpago', 'story', '{
  "layout": "flash_sale_story",
  "description": "Story com countdown visual, produto grande e CTA forte para link/swipe up",
  "dimensions": { "width": 1080, "height": 1920 },
  "zones": {
    "header_badge": { "x": 540, "y": 120, "type": "pill", "text": "⚡ OFERTA RELÂMPAGO", "fontSize": 24 },
    "product_image": { "x": 140, "y": 250, "width": 800, "height": 800, "fit": "contain" },
    "product_name": { "x": 540, "y": 1100, "fontSize": 44, "fontWeight": "bold", "align": "center", "maxWidth": 900 },
    "old_price": { "x": 400, "y": 1200, "fontSize": 28, "strikethrough": true, "align": "right" },
    "new_price": { "x": 680, "y": 1200, "fontSize": 48, "fontWeight": "bold", "align": "left" },
    "cta_button": { "x": 540, "y": 1400, "width": 600, "height": 80, "text": "QUERO AGORA →", "fontSize": 28, "borderRadius": 40 },
    "brand_name": { "x": 540, "y": 1750, "fontSize": 22, "align": "center" },
    "logo": { "x": 490, "y": 1800, "width": 100, "height": 80, "fit": "contain" }
  },
  "style": {
    "background": "#000000",
    "text_color": "#FFFFFF",
    "badge_color": "#FF3B30",
    "price_old_color": "#888888",
    "price_new_color": "#00FF88",
    "cta_color": "brand_primary"
  },
  "ai_prompt_hint": "Legenda curta e urgente (max 3 linhas). Foque em escassez e tempo limitado."
}', true),

('Story Novidade', 'story', '{
  "layout": "new_arrival_story",
  "description": "Layout clean para apresentar produto novo com elegância",
  "dimensions": { "width": 1080, "height": 1920 },
  "zones": {
    "tag": { "x": 540, "y": 150, "type": "pill", "text": "NOVIDADE ✨", "fontSize": 22 },
    "product_image": { "x": 90, "y": 300, "width": 900, "height": 900, "fit": "contain" },
    "product_name": { "x": 540, "y": 1280, "fontSize": 40, "fontWeight": "bold", "align": "center", "maxWidth": 900 },
    "description": { "x": 540, "y": 1370, "fontSize": 24, "align": "center", "maxWidth": 800, "maxLines": 3 },
    "cta_text": { "x": 540, "y": 1550, "fontSize": 20, "align": "center", "text": "Arraste pra cima e saiba mais" },
    "arrow_up": { "x": 540, "y": 1620, "type": "icon", "name": "chevron-up" },
    "logo": { "x": 490, "y": 1800, "width": 100, "height": 80, "fit": "contain" }
  },
  "style": {
    "background": "#FFFFFF",
    "text_color": "#1A1A1A",
    "tag_color": "brand_primary",
    "cta_color": "#888888"
  },
  "ai_prompt_hint": "Tom elegante e curto. Gere curiosidade sobre o produto sem revelar tudo."
}', true),

('Story Enquete/Interação', 'story', '{
  "layout": "poll_story",
  "description": "Story interativo com pergunta e 2 opções (simula enquete do Instagram)",
  "dimensions": { "width": 1080, "height": 1920 },
  "zones": {
    "question": { "x": 540, "y": 200, "fontSize": 36, "fontWeight": "bold", "align": "center", "maxWidth": 900 },
    "product_image": { "x": 190, "y": 350, "width": 700, "height": 700, "fit": "contain" },
    "option_a": { "x": 290, "y": 1150, "width": 500, "height": 80, "text": "Opção A", "borderRadius": 40 },
    "option_b": { "x": 790, "y": 1150, "width": 500, "height": 80, "text": "Opção B", "borderRadius": 40 },
    "hint_text": { "x": 540, "y": 1350, "fontSize": 18, "align": "center", "text": "Toque para votar!" },
    "brand_name": { "x": 540, "y": 1800, "fontSize": 20, "align": "center" },
    "logo": { "x": 490, "y": 1840, "width": 100, "height": 60, "fit": "contain" }
  },
  "style": {
    "background": "brand_primary",
    "text_color": "#FFFFFF",
    "option_bg": "rgba(255,255,255,0.2)",
    "option_border": "#FFFFFF"
  },
  "ai_prompt_hint": "Crie uma pergunta engajadora sobre o produto com 2 opções divertidas. Tom descontraído."
}', true),

('Story Bastidores', 'story', '{
  "layout": "behind_scenes_story",
  "description": "Visual estilo casual/bastidores com moldura polaroid e texto manuscrito",
  "dimensions": { "width": 1080, "height": 1920 },
  "zones": {
    "polaroid_frame": { "x": 90, "y": 200, "width": 900, "height": 1050, "padding": 30, "rotation": -2 },
    "product_image": { "x": 120, "y": 230, "width": 840, "height": 840, "fit": "cover" },
    "handwritten_text": { "x": 540, "y": 1120, "fontSize": 28, "align": "center", "maxWidth": 800, "font": "handwriting" },
    "emoji_stickers": { "x": 850, "y": 180, "type": "sticker_cluster", "count": 3 },
    "cta_text": { "x": 540, "y": 1500, "fontSize": 22, "align": "center" },
    "brand_name": { "x": 540, "y": 1800, "fontSize": 20, "align": "center" },
    "logo": { "x": 490, "y": 1840, "width": 100, "height": 60, "fit": "contain" }
  },
  "style": {
    "background": "#F5F0E8",
    "text_color": "#333333",
    "polaroid_shadow": true,
    "sticker_emojis": ["🔥", "💡", "✨"]
  },
  "ai_prompt_hint": "Tom informal e autêntico, como se estivesse mostrando o produto nos bastidores. Inclua emojis."
}', true),

('Story Dica Rápida', 'story', '{
  "layout": "quick_tip_story",
  "description": "Card educativo com ícone, dica curta e produto relacionado",
  "dimensions": { "width": 1080, "height": 1920 },
  "zones": {
    "header": { "x": 540, "y": 150, "type": "pill", "text": "💡 DICA", "fontSize": 22 },
    "tip_title": { "x": 540, "y": 350, "fontSize": 40, "fontWeight": "bold", "align": "center", "maxWidth": 900 },
    "tip_body": { "x": 540, "y": 480, "fontSize": 26, "align": "center", "maxWidth": 800, "maxLines": 4 },
    "divider": { "x": 540, "y": 680, "width": 200, "height": 3, "color": "brand_primary" },
    "product_image": { "x": 240, "y": 750, "width": 600, "height": 600, "fit": "contain" },
    "product_name": { "x": 540, "y": 1420, "fontSize": 30, "fontWeight": "bold", "align": "center" },
    "cta_button": { "x": 540, "y": 1550, "width": 500, "height": 70, "text": "Saiba mais →", "fontSize": 24, "borderRadius": 35 },
    "logo": { "x": 490, "y": 1820, "width": 100, "height": 60, "fit": "contain" }
  },
  "style": {
    "background": "#1A1A1A",
    "text_color": "#FFFFFF",
    "header_color": "#FFD700",
    "cta_color": "brand_primary"
  },
  "ai_prompt_hint": "Gere uma dica útil e curta relacionada ao uso ou benefício do produto. Tom educativo."
}', true);
