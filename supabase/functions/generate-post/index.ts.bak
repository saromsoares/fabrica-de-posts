import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  loja: 50,
  pro: 999999,
};

interface GenerateRequest {
  product_id: string;
  format: "feed" | "story";
  template_id?: string;
  tone?: string;
  custom_prompt?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- 1. Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Token de autenticacao nao fornecido.", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return jsonError("Usuario nao autenticado.", 401);

    // --- 2. Parse body ---
    const body: GenerateRequest = await req.json();
    const { product_id, format, template_id, tone, custom_prompt } = body;

    if (!product_id || !format) return jsonError("product_id e format sao obrigatorios.", 400);
    if (!['feed', 'story'].includes(format)) return jsonError("format deve ser 'feed' ou 'story'.", 400);

    // --- 3. Fetch profile & check usage ---
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, plan")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) return jsonError("Perfil nao encontrado.", 404);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usageData } = await supabase
      .from("usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .single();

    const currentCount = usageData?.count ?? 0;
    const limit = PLAN_LIMITS[profile.plan] ?? PLAN_LIMITS.free;

    if (currentCount >= limit) {
      return jsonError(
        `Limite de ${limit} geracoes/mes atingido no plano ${profile.plan}. Faca upgrade para continuar.`,
        429
      );
    }

    // --- 4. Fetch product + category (ENHANCED: full context) ---
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, description, image_url, tags, main_benefit, technical_specs, factory_id, categories:category_id(name)")
      .eq("id", product_id)
      .single();

    if (productError || !product) return jsonError("Produto nao encontrado.", 404);

    // --- 4b. Fetch FACTORY context (via product.factory_id) ---
    let factoryContext: any = null;
    if (product.factory_id) {
      const { data: factory } = await supabaseAdmin
        .from("factories")
        .select("name, niche, brand_differentials, brand_voice, target_audience")
        .eq("id", product.factory_id)
        .single();
      factoryContext = factory;
    }

    // --- 5. Fetch brand kit ---
    const { data: brandKit } = await supabaseAdmin
      .from("brand_kits")
      .select("store_name, instagram_handle, whatsapp, primary_color, secondary_color")
      .eq("user_id", user.id)
      .single();

    // --- 5b. Fetch LOJISTA profile context ---
    const { data: lojistaProfile } = await supabaseAdmin
      .from("profiles")
      .select("store_type, location_city, location_state, store_voice")
      .eq("id", user.id)
      .single();

    // --- 6. Fetch template (if provided) ---
    let template: any = null;
    if (template_id) {
      const { data: tpl } = await supabase
        .from("templates")
        .select("id, name, format, config_json")
        .eq("id", template_id)
        .single();
      template = tpl;
    }

    // --- 7. Generate 3 CAPTIONS with GPT (CONTEXT ENGINE v4) ---
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY nao configurada nos secrets do Supabase");
      return jsonError("Chave da OpenAI nao configurada.", 500);
    }

    const systemPrompt = buildContextSystemPrompt(product, factoryContext, brandKit, lojistaProfile);
    const userPrompt = buildCaptionUserPrompt(product, format, tone, custom_prompt, template);

    const captionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.8,
      }),
    });

    if (!captionResponse.ok) {
      const err = await captionResponse.text();
      console.error("OpenAI caption error:", err);
      return jsonError("Erro ao gerar legendas com IA.", 502);
    }

    const captionData = await captionResponse.json();
    const rawContent = captionData.choices?.[0]?.message?.content?.trim() ?? "";

    // Parse JSON response (with fallback regex extraction)
    let captions: Array<{ style: string; text: string; hashtags: string }> = [];
    try {
      const parsed = JSON.parse(rawContent);
      captions = parsed.captions || parsed;
    } catch {
      // Try to extract JSON from within the text
      const jsonMatch = rawContent.match(/\{[\s\S]*"captions"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          captions = parsed.captions || parsed;
        } catch {
          console.error("Failed to parse AI captions JSON:", rawContent);
        }
      }
    }

    // If parsing completely failed, create a single fallback caption
    if (!captions || captions.length === 0) {
      // Use the raw text as a single caption fallback
      if (rawContent.length > 10) {
        captions = [
          { style: "oferta", text: rawContent, hashtags: "" },
        ];
      } else {
        return jsonError("Erro ao gerar legendas.", 500);
      }
    }

    // Use the first caption as the "main" caption for backward compatibility
    const mainCaption = captions[0]
      ? `${captions[0].text}${captions[0].hashtags ? '\n\n' + captions[0].hashtags : ''}`
      : "";

    // --- 8. Generate image with DALL-E 3 ---
    const imagePrompt = buildImagePrompt(product, brandKit, format, template);

    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: format === "story" ? "1024x1792" : "1024x1024",
        quality: "standard",
      }),
    });

    if (!imageResponse.ok) {
      const err = await imageResponse.text();
      console.error("DALL-E error:", err);
      return jsonError("Erro ao gerar imagem com IA.", 502);
    }

    const imageData = await imageResponse.json();
    const dalleImageUrl = imageData.data?.[0]?.url;
    if (!dalleImageUrl) return jsonError("IA nao retornou imagem.", 502);

    // --- 9. Download and upload to Storage ---
    const imgFetch = await fetch(dalleImageUrl);
    const imgBlob = await imgFetch.blob();
    const imgArrayBuffer = await imgBlob.arrayBuffer();
    const fileName = `${user.id}/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("generated-arts")
      .upload(fileName, imgArrayBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return jsonError("Erro ao salvar imagem.", 500);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("generated-arts")
      .getPublicUrl(fileName);

    const storedImageUrl = publicUrlData.publicUrl;

    // --- 10. Save generation ---
    const templateName = template?.name ?? null;
    const { data: generation, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        product_id: product_id,
        template_id: template_id ?? null,
        image_url: storedImageUrl,
        caption: mainCaption,
        format: format,
        fields_data: {
          tone: tone ?? "default",
          custom_prompt: custom_prompt ?? null,
          template_name: templateName,
          template_layout: template?.config_json?.layout ?? null,
          dalle_prompt: imagePrompt,
          model_caption: "gpt-4o-mini",
          model_image: "dall-e-3",
          // Store all 3 captions in fields_data for frontend
          ai_captions: captions,
          context_engine_version: "v4",
        },
      })
      .select()
      .single();

    if (genError) {
      console.error("Insert generation error:", genError);
      return jsonError("Erro ao salvar geracao.", 500);
    }

    // --- 11. Update usage ---
    const { error: upsertError } = await supabaseAdmin
      .from("usage")
      .upsert(
        { user_id: user.id, month: currentMonth, count: currentCount + 1 },
        { onConflict: "user_id,month" }
      );

    if (upsertError) console.error("Usage upsert error:", upsertError);

    // --- 12. Return (with all 3 captions) ---
    return new Response(
      JSON.stringify({
        success: true,
        generation: {
          id: generation.id,
          image_url: storedImageUrl,
          caption: mainCaption,
          captions: captions,
          format: format,
          template_name: templateName,
          created_at: generation.created_at,
        },
        usage: {
          count: currentCount + 1,
          limit: limit,
          plan: profile.plan,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonError("Erro interno do servidor.", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status }
  );
}

/* ═══════════════════════════════════════════════════════
   CONTEXT ENGINE v4 — Dynamic System Prompt
   ═══════════════════════════════════════════════════════ */

function buildContextSystemPrompt(
  product: any,
  factory: any,
  brandKit: any,
  lojistaProfile: any
): string {
  const lines: string[] = [];

  lines.push("Voce e um copywriter brasileiro especialista em marketing para Instagram.");
  lines.push("Sua tarefa e criar legendas de venda persuasivas e naturais.");
  lines.push("");

  // Factory context
  lines.push("CONTEXTO DA FABRICA:");
  if (factory?.name) lines.push(`- Marca: ${factory.name}`);
  if (factory?.niche) lines.push(`- Nicho: ${factory.niche}`);
  else lines.push("- Nicho: nao informado");
  if (factory?.brand_differentials) lines.push(`- Diferenciais: ${factory.brand_differentials}`);
  if (factory?.brand_voice) lines.push(`- Tom da marca: ${factory.brand_voice}`);
  else lines.push("- Tom da marca: profissional e confiavel");
  if (factory?.target_audience) lines.push(`- Publico-alvo: ${factory.target_audience}`);
  else lines.push("- Publico-alvo: lojistas e revendedores");
  lines.push("");

  // Store context
  lines.push("CONTEXTO DA LOJA:");
  if (brandKit?.store_name) lines.push(`- Loja: ${brandKit.store_name}`);
  else lines.push("- Loja: Loja parceira");
  if (lojistaProfile?.store_type) lines.push(`- Tipo: ${lojistaProfile.store_type}`);
  if (lojistaProfile?.location_city || lojistaProfile?.location_state) {
    const parts = [lojistaProfile.location_city, lojistaProfile.location_state].filter(Boolean);
    lines.push(`- Cidade/Estado: ${parts.join(", ")}`);
  }
  if (lojistaProfile?.store_voice) lines.push(`- Tom da loja: ${lojistaProfile.store_voice}`);
  else lines.push("- Tom da loja: amigavel e direto");
  if (brandKit?.instagram_handle) {
    const handle = brandKit.instagram_handle.replace("@", "");
    lines.push(`- Instagram: @${handle}`);
  }
  if (brandKit?.whatsapp) lines.push(`- WhatsApp: ${brandKit.whatsapp}`);
  lines.push("");

  // Product context
  lines.push("PRODUTO:");
  lines.push(`- Nome: ${product.name}`);
  if (product.description) lines.push(`- Descricao: ${product.description}`);
  const categoryName = product.categories?.name;
  if (categoryName) lines.push(`- Categoria: ${categoryName}`);
  if (product.main_benefit) lines.push(`- Beneficio principal: ${product.main_benefit}`);
  else if (product.description) lines.push(`- Beneficio principal: ${product.description}`);
  if (product.technical_specs) lines.push(`- Especificacoes: ${product.technical_specs}`);
  lines.push("");

  // Generation rules
  lines.push("GERE EXATAMENTE 3 LEGENDAS DIFERENTES:");
  lines.push("");
  lines.push("1. OFERTA DIRETA — Foco em preco, promocao, chamada para comprar agora. Usar urgencia.");
  lines.push("2. INSTITUCIONAL — Foco nos beneficios do produto, qualidade da marca, confianca.");
  lines.push("3. ESCASSEZ — Foco em estoque limitado, ultimas unidades, oportunidade unica.");
  lines.push("");
  lines.push("REGRAS:");
  lines.push("- Cada legenda deve ter entre 150-300 caracteres (ideal para Instagram)");
  lines.push("- Incluir 1 CTA por legenda (ex: \"Chama no WhatsApp\", \"Link na bio\", \"Comenta EU QUERO\")");
  if (brandKit?.instagram_handle) {
    const handle = brandKit.instagram_handle.replace("@", "");
    lines.push(`- Incluir o @${handle} naturalmente quando fizer sentido`);
  }
  lines.push("- Incluir 5-8 hashtags relevantes ao final de cada legenda");
  const voice = lojistaProfile?.store_voice || factory?.brand_voice || "amigavel e direto";
  lines.push(`- Tom: ${voice} — nunca formal demais, nunca vulgar`);
  lines.push("- Usar emojis com moderacao (2-4 por legenda)");
  lines.push("- NUNCA inventar preco, desconto ou promocao que nao foi informada");
  lines.push("- Responder APENAS em JSON valido no formato:");
  lines.push('{');
  lines.push('  "captions": [');
  lines.push('    { "style": "oferta", "text": "...", "hashtags": "..." },');
  lines.push('    { "style": "institucional", "text": "...", "hashtags": "..." },');
  lines.push('    { "style": "escassez", "text": "...", "hashtags": "..." }');
  lines.push('  ]');
  lines.push('}');

  return lines.join("\n");
}

function buildCaptionUserPrompt(
  product: any,
  format: string,
  tone?: string,
  customPrompt?: string,
  template?: any
): string {
  const parts: string[] = [];
  parts.push(`Gere as 3 legendas para o produto "${product.name}" no formato ${format === "story" ? "Story" : "Feed"}.`);
  if (tone) parts.push(`Tom preferido: ${tone}.`);
  if (template?.name) parts.push(`Template: ${template.name}.`);
  if (template?.config_json?.ai_prompt_hint) parts.push(`Estilo: ${template.config_json.ai_prompt_hint}.`);
  if (customPrompt) parts.push(`Instrucao extra do usuario: ${customPrompt}`);
  if (format === "story") parts.push("Para Story, legendas mais curtas e diretas.");
  parts.push("Responda APENAS com o JSON, sem explicacoes.");
  return parts.join(" ");
}

function buildImagePrompt(
  product: any,
  brandKit: any,
  format: string,
  template?: any
): string {
  const primaryColor = brandKit?.primary_color ?? "#000000";
  const secondaryColor = brandKit?.secondary_color ?? "#FFFFFF";
  const storeName = brandKit?.store_name ?? "";
  const categoryName = product.categories?.name ?? "";
  const layout = template?.config_json?.layout ?? "default";
  const templateDesc = template?.config_json?.description ?? "";

  let prompt = `Professional e-commerce product photo for Instagram ${format === "story" ? "Story (vertical 9:16)" : "Feed post (square 1:1)"}.\n`;
  prompt += `Product: ${product.name}.\n`;
  if (product.description) prompt += `Description: ${product.description}.\n`;
  if (categoryName) prompt += `Category: ${categoryName}.\n`;
  if (templateDesc) prompt += `Layout style: ${templateDesc}.\n`;

  switch (layout) {
    case "promo_highlight":
      prompt += `Vibrant colored background matching brand color ${primaryColor}. Product centered with dramatic lighting. Space for price text at bottom. Bold, eye-catching promotional feel.\n`;
      break;
    case "launch_elegant":
      prompt += `Clean white background, minimalist studio photography. Product hero shot with soft shadows. Sophisticated and premium feel.\n`;
      break;
    case "before_after":
      prompt += `Split composition showing the product impact. Professional comparison layout. Clear visual difference between left and right sides.\n`;
      break;
    case "testimonial":
      prompt += `Product photo with dark cinematic overlay. Moody, trustworthy atmosphere. Space for quote text overlay.\n`;
      break;
    case "flash_sale_story":
      prompt += `Dark background with dramatic product spotlight. Urgent, high-energy feel. Neon accent lighting.\n`;
      break;
    case "new_arrival_story":
      prompt += `Clean white background, product floating with subtle shadow. Fresh, modern, inviting.\n`;
      break;
    case "behind_scenes_story":
      prompt += `Casual, authentic behind-the-scenes feel. Warm tones, natural lighting. Like a phone photo but well composed.\n`;
      break;
    case "quick_tip_story":
      prompt += `Dark elegant background. Product displayed as educational content. Professional but approachable.\n`;
      break;
    default:
      prompt += `Clean white background, studio lighting, high-end product photography style.\n`;
  }

  prompt += `Brand colors: primary ${primaryColor}, accent ${secondaryColor}.\n`;
  if (storeName) prompt += `Subtle brand watermark text "${storeName}" in corner.\n`;
  prompt += `Modern, professional. No text overlays except brand name. Sharp focus, soft shadows.`;

  return prompt;
}
