// eslint.config.mjs — ESLint 9 flat config para Next.js 15
// eslint-config-next@16 já exporta flat config nativo (array)
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  // Configuração base do Next.js (core-web-vitals inclui React, React Hooks, @next/next)
  ...nextCoreWebVitals,

  // Regras customizadas do projeto
  {
    rules: {
      // TypeScript — warn para não bloquear builds durante migração
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // React
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',

      // Console — warn (não error) para permitir console.log de debug durante dev
      'no-console': 'warn',

      // Next.js Image — warn (não error) para migração gradual de <img> para <Image>
      '@next/next/no-img-element': 'warn',

      // React purity — warn (regra nova e restritiva no ESLint 9, padrão correto de async em useEffect)
      'react-hooks/purity': 'warn',
      // setState em effect — warn (padrão correto: setState dentro de async function em useEffect)
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/react-in-jsx-scope': 'off',
    },
  },

  // Ignorar pastas que não devem ser lintadas
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'public/**',
      'supabase/**',
      '*.config.js',
      '*.config.mjs',
      '*.config.cjs',
    ],
  },
];

export default config;
