'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Sparkles, Copy, Check, Instagram, Twitter, Linkedin, Facebook } from 'lucide-react';

interface PostGeneratorProps {
  onGenerated: () => void;
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter, color: 'from-sky-400 to-blue-600' },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'from-blue-500 to-blue-700' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'from-blue-600 to-indigo-700' },
  { value: 'tiktok', label: 'TikTok', color: 'from-pink-500 to-cyan-400' },
];

const TONES = [
  { value: 'profissional', label: '💼 Profissional' },
  { value: 'casual', label: '😎 Casual' },
  { value: 'humoristico', label: '😂 Humorístico' },
  { value: 'inspirador', label: '✨ Inspirador' },
  { value: 'educativo', label: '📚 Educativo' },
  { value: 'vendas', label: '🎯 Vendas' },
];

export default function PostGenerator({ onGenerated }: PostGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [tone, setTone] = useState('profissional');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setResult('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, platform, tone }),
      });

      const data = await res.json();

      if (data.content) {
        setResult(data.content);

        // Salva no Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('posts').insert({
            user_id: user.id,
            content: data.content,
            platform,
            tone,
            prompt_used: topic,
            title: topic.substring(0, 80),
          });
          onGenerated();
        }
      }
    } catch (err) {
      console.error('Erro ao gerar:', err);
      setResult('Erro ao gerar post. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in-up">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-800 tracking-tight">
          Criar novo <span className="text-brand-500">post</span>
        </h1>
        <p className="text-dark-400 mt-2">
          Descreva o tema e a IA gera o conteúdo ideal para sua rede social.
        </p>
      </div>

      {/* Generator Card */}
      <div className="bg-dark-900/60 backdrop-blur-sm border border-dark-800/50 rounded-3xl p-6 md:p-8">
        {/* Topic Input */}
        <div className="mb-6">
          <label className="block text-sm font-500 text-dark-300 mb-2">
            Sobre o que é o post?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: Dicas de produtividade para empreendedores, lançamento do meu novo curso de marketing digital..."
            rows={3}
            className="w-full px-4 py-3 bg-dark-950/80 border border-dark-700/40 rounded-2xl text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/15 transition-all resize-none"
          />
        </div>

        {/* Platform Selection */}
        <div className="mb-6">
          <label className="block text-sm font-500 text-dark-300 mb-3">
            Plataforma
          </label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-500 transition-all ${
                    platform === p.value
                      ? `bg-gradient-to-r ${p.color} text-white shadow-lg`
                      : 'bg-dark-800/50 text-dark-300 hover:bg-dark-800 hover:text-white'
                  }`}
                >
                  {Icon && <Icon size={16} />}
                  {!Icon && <span>🎵</span>}
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tone Selection */}
        <div className="mb-8">
          <label className="block text-sm font-500 text-dark-300 mb-3">
            Tom de voz
          </label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-500 transition-all ${
                  tone === t.value
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'bg-dark-800/50 text-dark-300 hover:bg-dark-800 hover:text-white border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !topic.trim()}
          className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-600 text-lg rounded-2xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(224,96,78,0.25)] flex items-center justify-center gap-3"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Gerar Post com IA
            </>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="mt-6 animate-fade-in-up">
            <div className="bg-dark-950/80 border border-dark-700/40 rounded-2xl p-6 relative group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-500 text-brand-400 uppercase tracking-wider">
                  Post Gerado
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-dark-400 hover:text-white hover:bg-dark-800 transition-all"
                >
                  {copied ? (
                    <>
                      <Check size={14} /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copiar
                    </>
                  )}
                </button>
              </div>
              <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                {result}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
