'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  LayoutDashboard, Sparkles, Package, Clock, Palette,
  Image as ImageIcon, TrendingUp, Zap, ArrowRight,
  Factory, Store, ShieldCheck,
} from 'lucide-react';

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

interface DashboardStats {
  totalArtes: number;
  totalProdutos: number;
  artesEsteMes: number;
  hasBrandKit: boolean;
}

interface RecentGeneration {
  id: string;
  image_url: string | null;
  format: string;
  created_at: string;
  product: { name: string; image_url: string | null } | null;
}

type UserRole = 'lojista' | 'fabricante' | 'admin';

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

export default function DashboardHome() {
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('lojista');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: totalArtes },
        { count: totalProdutos },
        { count: artesEsteMes },
        { data: brandKit },
        { data: profile },
        { data: recentData },
      ] = await Promise.all([
        supabase.from('generations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('generations').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', monthStart),
        supabase.from('brand_kits').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
        supabase.from('generations')
          .select('id, image_url, format, created_at, product:products(name, image_url)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4),
      ]);

      if (!cancelled) {
        setStats({
          totalArtes: totalArtes || 0,
          totalProdutos: totalProdutos || 0,
          artesEsteMes: artesEsteMes || 0,
          hasBrandKit: !!brandKit,
        });
        setRecent((recentData as unknown as RecentGeneration[]) || []);
        setUserName(profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || '');
        setUserRole((profile?.role as UserRole) || 'lojista');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Artes Geradas',
      value: stats?.totalArtes || 0,
      icon: ImageIcon,
      color: 'text-brand-400',
      bg: 'bg-brand-600/10',
    },
    {
      label: 'Este Mês',
      value: stats?.artesEsteMes || 0,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-600/10',
    },
    {
      label: 'Produtos',
      value: stats?.totalProdutos || 0,
      icon: Package,
      color: 'text-blue-400',
      bg: 'bg-blue-600/10',
    },
    {
      label: 'Brand Kit',
      value: stats?.hasBrandKit ? 'Ativo' : 'Pendente',
      icon: Palette,
      color: stats?.hasBrandKit ? 'text-purple-400' : 'text-amber-400',
      bg: stats?.hasBrandKit ? 'bg-purple-600/10' : 'bg-amber-600/10',
      href: '/dashboard/brand-kit',
    },
  ];

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Greeting & Role Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-800 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="text-brand-400" size={24} />
            {userName ? `Olá, ${userName}!` : 'Dashboard'}
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            {userRole === 'fabricante' 
              ? 'Gestão de catálogo e performance de revenda' 
              : userRole === 'admin'
              ? 'Painel de controle administrativo'
              : 'Visão geral da sua fábrica de posts'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-900/80 border border-dark-800/50 rounded-full self-start sm:self-auto">
          {userRole === 'fabricante' ? (
            <>
              <Factory size={14} className="text-blue-400" />
              <span className="text-[10px] font-700 uppercase tracking-wider text-blue-400">Fabricante</span>
            </>
          ) : userRole === 'admin' ? (
            <>
              <ShieldCheck size={14} className="text-purple-400" />
              <span className="text-[10px] font-700 uppercase tracking-wider text-purple-400">Administrador</span>
            </>
          ) : (
            <>
              <Store size={14} className="text-brand-400" />
              <span className="text-[10px] font-700 uppercase tracking-wider text-brand-400">Lojista</span>
            </>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const content = (
            <div
              className={`${card.bg} border border-dark-800/30 rounded-2xl p-4 ${card.href ? 'hover:border-dark-700/50 transition-all cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <card.icon size={18} className={card.color} />
                <span className="text-xs text-dark-400 font-500">{card.label}</span>
              </div>
              <p className={`text-2xl font-800 ${card.color}`}>
                {typeof card.value === 'number' ? card.value.toLocaleString('pt-BR') : card.value}
              </p>
            </div>
          );
          return card.href ? (
            <Link key={card.label} href={card.href}>{content}</Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/produtos"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-brand-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-brand-600/15">
            <Sparkles size={20} className="text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Gerar Nova Arte</p>
            <p className="text-xs text-dark-400 mt-0.5">Escolha um produto e crie um post</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-brand-400 transition-colors" />
        </Link>

        <Link
          href="/dashboard/historico"
          className="flex items-center gap-4 p-4 bg-dark-900/60 border border-dark-800/40 rounded-2xl hover:border-purple-500/30 transition-all group"
        >
          <div className="p-3 rounded-xl bg-purple-600/15">
            <Clock size={20} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-700 text-white">Minhas Artes</p>
            <p className="text-xs text-dark-400 mt-0.5">Acesse, baixe e compartilhe suas artes</p>
          </div>
          <ArrowRight size={16} className="text-dark-600 group-hover:text-purple-400 transition-colors" />
        </Link>
      </div>

      {/* Últimas artes - Padronização Visual 1:1 Fundo Branco */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-700 text-white flex items-center gap-2">
              <Zap size={14} className="text-brand-400" />
              Últimas Artes
            </h2>
            <Link
              href="/dashboard/historico"
              className="text-xs text-dark-400 hover:text-brand-400 transition-colors"
            >
              Ver todas →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recent.map((gen) => (
              <Link
                key={gen.id}
                href="/dashboard/historico"
                className="group bg-dark-900/40 border border-dark-800/30 rounded-2xl overflow-hidden hover:border-dark-700/50 transition-all"
              >
                {/* Padronização Visual: Fundo Branco, 1:1, 80% do produto */}
                <div className="aspect-square bg-white p-4 flex items-center justify-center relative overflow-hidden">
                  {gen.image_url ? (
                    <img
                      src={gen.image_url}
                      alt={gen.product?.name || 'Arte'}
                      className="max-w-[85%] max-h-[85%] object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-md"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-dark-950">
                      <ImageIcon size={24} className="text-dark-700" />
                    </div>
                  )}
                  {/* Badge de Formato */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-dark-900/60 backdrop-blur-md rounded text-[8px] font-800 uppercase tracking-tighter text-white/80 border border-white/10">
                    {gen.format}
                  </div>
                </div>
                <div className="p-3 border-t border-dark-800/30">
                  <p className="text-[11px] text-dark-200 font-700 truncate">
                    {gen.product?.name || 'Produto'}
                  </p>
                  <p className="text-[10px] text-dark-500 mt-0.5">
                    {new Date(gen.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding hint */}
      {!stats?.hasBrandKit && (
        <div className="bg-amber-600/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Palette size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-600 text-amber-300">Configure seu Brand Kit</p>
              <p className="text-xs text-dark-400 mt-1">
                Adicione sua logo, cores e dados de contato para personalizar todas as artes automaticamente.
              </p>
              <Link
                href="/dashboard/brand-kit"
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-amber-400 hover:text-amber-300 font-600"
              >
                Configurar agora <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
