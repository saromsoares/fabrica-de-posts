'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setMessage('Verifique seu e-mail para confirmar o cadastro!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-dark-950 border border-dark-700/50 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all';

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute top-[-30%] right-[-20%] w-[700px] h-[700px] bg-brand-600/15 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand-600 flex items-center justify-center">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-800 tracking-tight">
            Fábrica de <span className="text-brand-500">Posts</span>
          </h1>
          <p className="text-dark-400 mt-2">{isSignUp ? 'Crie sua conta gratuita' : 'Entre na sua conta'}</p>
        </div>

        <div className="bg-dark-900/80 backdrop-blur-xl border border-dark-800/60 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div>
                <label className="block text-sm font-500 text-dark-300 mb-2">Nome completo</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Seu nome" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-500 text-dark-300 mb-2">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="seu@email.com" required />
            </div>
            <div>
              <label className="block text-sm font-500 text-dark-300 mb-2">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" minLength={6} required />
            </div>

            {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
            {message && <div className="px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">{message}</div>}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-display font-600 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(224,96,78,0.25)]">
              {loading ? 'Carregando...' : isSignUp ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="text-sm text-dark-400 hover:text-brand-400 transition-colors">
              {isSignUp ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
