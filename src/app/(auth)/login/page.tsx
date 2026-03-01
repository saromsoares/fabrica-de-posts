// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, User, Loader2, CheckCircle2, AlertCircle, Store, Factory } from 'lucide-react';

type UserRole = 'lojista' | 'fabricante';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('lojista');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
          },
        });
        if (error) throw error;
        setMessage('Conta criada! Verifique seu e-mail para confirmar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputBase = 'w-full px-4 py-3 bg-dark-900/80 border border-dark-700/60 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all text-sm';

  return (
    <div className="min-h-screen flex bg-dark-950">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] flex-col justify-between p-12 bg-gradient-to-br from-dark-900 via-dark-950 to-dark-900 border-r border-dark-800/40 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-600/8 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-500/6 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-display font-800 text-lg tracking-tight text-white">
            Fábrica de <span className="text-brand-400">Posts</span>
          </span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-800 uppercase tracking-widest text-brand-400">Plataforma de marketing</p>
            <h2 className="font-display text-4xl xl:text-5xl font-800 leading-tight text-white">
              Posts prontos<br />
              <span className="text-brand-400">em 2 minutos</span>
            </h2>
            <p className="text-dark-400 text-base leading-relaxed max-w-sm">
              Escolha o produto, aplique sua marca e gere artes profissionais para postar agora.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['Catálogo de produtos', 'Templates profissionais', 'Copy automática', 'Feed + Stories'].map((feat) => (
              <span key={feat} className="px-3 py-1.5 bg-dark-800/60 border border-dark-700/40 rounded-full text-xs font-600 text-dark-300">
                {feat}
              </span>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2">
              {['#e85d75', '#4f8ef7', '#34d399', '#f59e0b'].map((color, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-dark-950 flex items-center justify-center text-xs font-700 text-white" style={{ backgroundColor: color }}>
                  {['L', 'F', 'L', 'F'][i]}
                </div>
              ))}
            </div>
            <p className="text-dark-400 text-xs">Lojistas e fabricantes já usam a plataforma</p>
          </div>
        </div>

        {/* Bottom */}
        <p className="text-dark-600 text-xs relative z-10">© 2025 Fábrica de Posts. Todos os direitos reservados.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-display font-800 text-base tracking-tight text-white">
            Fábrica de <span className="text-brand-400">Posts</span>
          </span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-2xl font-800 text-white mb-1.5">
              {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="text-dark-400 text-sm">
              {isSignUp
                ? 'Preencha os dados abaixo para começar'
                : 'Entre com seu e-mail e senha para continuar'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome completo — só no cadastro */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="block text-xs font-700 text-dark-300 uppercase tracking-wider">
                  Nome completo
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome ou nome da empresa"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>
            )}

            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-700 text-dark-300 uppercase tracking-wider">
                E-mail
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={`${inputBase} pl-10`}
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-700 text-dark-300 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`${inputBase} pl-10`}
                />
              </div>
            </div>

            {/* Seleção de perfil — só no cadastro */}
            {isSignUp && (
              <div className="space-y-2">
                <label className="block text-xs font-700 text-dark-300 uppercase tracking-wider">
                  Qual é o seu perfil?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <RoleCard
                    selected={role === 'lojista'}
                    onClick={() => setRole('lojista')}
                    icon={Store}
                    title="Lojista"
                    subtitle="Revendedor"
                    description="Crio posts para vender produtos"
                    accentColor="brand"
                  />
                  <RoleCard
                    selected={role === 'fabricante'}
                    onClick={() => setRole('fabricante')}
                    icon={Factory}
                    title="Fabricante"
                    subtitle="Fornecedor"
                    description="Forneço produtos e catálogo"
                    accentColor="blue"
                  />
                </div>
              </div>
            )}

            {/* Feedback messages */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {message && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle2 size={15} className="text-green-400 mt-0.5 shrink-0" />
                <p className="text-green-400 text-sm">{message}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-brand-600 hover:bg-brand-700 text-white font-700 text-sm rounded-xl transition-all shadow-lg shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 focus:ring-offset-dark-950 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {isSignUp ? 'Criando conta...' : 'Entrando...'}
                </>
              ) : (
                isSignUp ? 'Criar conta' : 'Entrar'
              )}
            </button>
          </form>

          {/* Toggle login/signup */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="text-sm text-dark-400 hover:text-white transition-colors"
            >
              {isSignUp
                ? 'Já tem uma conta? '
                : 'Não tem conta? '}
              <span className="text-brand-400 font-700 hover:text-brand-300">
                {isSignUp ? 'Entrar' : 'Criar conta'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— Componente RoleCard ——— */

interface RoleCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  accentColor: 'brand' | 'blue';
}

function RoleCard({ selected, onClick, icon: Icon, title, subtitle, description, accentColor }: RoleCardProps) {
  const accent = accentColor === 'brand'
    ? { border: 'border-brand-500/40', bg: 'bg-brand-600/10', icon: 'text-brand-400', text: 'text-brand-400' }
    : { border: 'border-blue-500/40', bg: 'bg-blue-600/10', icon: 'text-blue-400', text: 'text-blue-400' };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-start text-left p-4 rounded-xl border-2 transition-all duration-200
        ${selected
          ? `${accent.border} ${accent.bg}`
          : 'border-dark-700/40 bg-dark-900/60 hover:border-dark-600/60 hover:bg-dark-800/60'
        }
      `}
    >
      {/* Selection indicator */}
      <div className={`
        absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
        ${selected ? `${accent.border} ${accent.bg}` : 'border-dark-600'}
      `}>
        {selected && (
          <div className={`w-2 h-2 rounded-full ${accentColor === 'brand' ? 'bg-brand-400' : 'bg-blue-400'}`} />
        )}
      </div>

      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${selected ? accent.bg : 'bg-dark-800/60'}`}>
        <Icon size={16} className={selected ? accent.icon : 'text-dark-400'} />
      </div>
      <span className={`font-700 text-sm mb-0.5 ${selected ? 'text-white' : 'text-dark-200'}`}>{title}</span>
      <span className={`text-[10px] font-600 uppercase tracking-wider ${selected ? accent.text : 'text-dark-500'}`}>{subtitle}</span>
      <span className="text-xs text-dark-500 mt-1 leading-relaxed">{description}</span>
    </button>
  );
}
