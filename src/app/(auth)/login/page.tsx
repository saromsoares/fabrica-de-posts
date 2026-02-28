// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

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

  const supabase = createClientComponentClient();
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fábrica de Post</h1>
          <p className="text-gray-500 mt-2">
            {isSignUp ? 'Crie sua conta' : 'Entre na sua conta'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome completo (só no cadastro) */}
            {isSignUp && (
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Nome completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome ou nome da empresa"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              />
            </div>

            {/* Senha */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              />
            </div>

            {/* Seleção de perfil (só no cadastro) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Qual é o seu perfil?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <RoleCard
                    selected={role === 'lojista'}
                    onClick={() => setRole('lojista')}
                    emoji="🛍️"
                    title="Lojista"
                    subtitle="Revendedor"
                    description="Crio posts para vender produtos"
                  />
                  <RoleCard
                    selected={role === 'fabricante'}
                    onClick={() => setRole('fabricante')}
                    emoji="🏭"
                    title="Fabricante"
                    subtitle="Fornecedor"
                    description="Forneço produtos e catálogo"
                  />
                </div>
              </div>
            )}

            {/* Mensagens de erro/sucesso */}
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl">
                {message}
              </div>
            )}

            {/* Botão de submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-black text-white font-medium rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading
                ? 'Carregando...'
                : isSignUp
                  ? 'Criar conta'
                  : 'Entrar'}
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
              className="text-sm text-gray-500 hover:text-gray-900 transition"
            >
              {isSignUp
                ? 'Já tem uma conta? Entrar'
                : 'Não tem conta? Criar conta'}
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
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
}

function RoleCard({
  selected,
  onClick,
  emoji,
  title,
  subtitle,
  description,
}: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all duration-200
        ${
          selected
            ? 'border-black bg-gray-50 shadow-sm'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
    >
      {/* Indicador de seleção */}
      <div
        className={`
          absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
          ${selected ? 'border-black bg-black' : 'border-gray-300'}
        `}
      >
        {selected && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      <span className="text-2xl mb-2">{emoji}</span>
      <span className="font-semibold text-gray-900 text-sm">{title}</span>
      <span className="text-xs text-gray-500">{subtitle}</span>
      <span className="text-xs text-gray-400 mt-1">{description}</span>
    </button>
  );
}
