# 🏭 Fábrica de Posts — Plataforma de Artes Automáticas

Plataforma SaaS onde revendedores e lojas geram posts profissionais em minutos. Marketing pronto sem designer, padronizado, rápido e com alta recorrência de uso.

## ✨ Funcionalidades

### Lojista
- **Brand Kit** — Logo, cores, @Instagram, WhatsApp. Configurar uma vez e usar sempre.
- **Catálogo de Produtos** — Busca e filtro por categoria/tags.
- **Templates** — Feed (1080×1080) e Story (1080×1920) prontos para uso.
- **Gerador de Artes** — Produto + Template + Dados rápidos → Preview → Download PNG.
- **Copy Automática** — Legendas prontas em 5 estilos (oferta, institucional, lançamento, estoque limitado, benefício).
- **Histórico** — Re-download e reutilização de artes anteriores.
- **Controle de Uso** — Limites por plano (Free: 5/mês, Loja: 30/mês, Pro: 200/mês).

### Admin
- CRUD completo de Produtos (nome, categoria, imagem, tags, ativo/inativo).
- CRUD de Templates (formato, config_json, preview, ativo/inativo).
- Gestão de clientes (alterar plano, role, ver status de onboarding).

### Landing Pública
- Home, Como Funciona, Preços, FAQ.

## 🛠 Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Storage, RPC Functions)
- **Render:** `html-to-image` (geração client-side)
- **Ícones:** Lucide React

## 🚀 Setup

```bash
git clone https://github.com/saromsoares/fabrica-de-posts.git
cd fabrica-de-posts
npm install
cp .env.example .env.local
# Edite o .env.local com suas chaves Supabase
npm run dev
```

### Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://rmtcsflathasvhpaahtq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 🗃 Database

| Tabela | Descrição |
|---|---|
| `profiles` | Usuários (role, plan, onboarding_complete) |
| `brand_kits` | Marca do cliente (logo, cores, contato) |
| `categories` | Categorias de produtos |
| `products` | Catálogo (nome, imagem, categoria, tags) |
| `templates` | Templates de arte (format, config_json) |
| `generations` | Histórico de artes geradas |
| `usage` | Controle de uso mensal |

**Functions RPC:** `increment_usage()`, `get_usage()`

**Storage:** logos, product-images, template-previews, generated-arts

## 📄 Licença

MIT
