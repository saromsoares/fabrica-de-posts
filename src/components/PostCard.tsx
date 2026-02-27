'use client';

import { useState } from 'react';
import { Copy, Check, Trash2, Heart, Instagram, Twitter, Linkedin, Facebook } from 'lucide-react';
import type { Generation } from '@/types/database';

interface PostCardProps {
  post: Generation;
  index: number;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, status: string) => void;
}

const platformIcons: Record<string, React.ElementType> = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
};

const platformColors: Record<string, string> = {
  instagram: 'text-pink-400',
  twitter: 'text-sky-400',
  linkedin: 'text-blue-400',
  facebook: 'text-blue-500',
  tiktok: 'text-cyan-400',
  generic: 'text-dark-400',
};

export default function PostCard({ post, index, onDelete, onToggleFavorite }: PostCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(post.caption || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Icon = platformIcons[post.platform];
  const timeAgo = getTimeAgo(post.created_at);

  return (
    <div
      className="group bg-dark-900/60 border border-dark-800/40 rounded-2xl p-5 hover:border-dark-700/60 transition-all duration-300 animate-fade-in-up flex flex-col"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={platformColors[post.platform]}>
            {Icon ? <Icon size={16} /> : <span>🎵</span>}
          </span>
          <span className="text-xs text-dark-400 capitalize">{post.platform}</span>
          <span className="text-dark-700">·</span>
          <span className="text-xs text-dark-500">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleFavorite(post.id, post.status)}
            className="p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
          >
            <Heart
              size={14}
              className={
                post.status === 'favorito'
                  ? 'text-brand-500 fill-brand-500'
                  : 'text-dark-500'
              }
            />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
          >
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} className="text-dark-500" />
            )}
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} className="text-dark-500 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <h3 className="font-display font-600 text-sm text-dark-200 mb-2 line-clamp-1">
          {post.title}
        </h3>
      )}

      {/* Content */}
      <p className="text-sm text-dark-300 leading-relaxed line-clamp-5 flex-1">
        {post.caption}
      </p>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-dark-800/30 flex items-center gap-2">
        <span className="text-[10px] px-2 py-1 rounded-md bg-dark-800/50 text-dark-400 capitalize">
          {post.tone}
        </span>
        {post.status === 'favorito' && (
          <span className="text-[10px] px-2 py-1 rounded-md bg-brand-600/10 text-brand-400">
            ★ Favorito
          </span>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('pt-BR');
}
