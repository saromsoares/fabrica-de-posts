// src/hooks/useAdminTestMode.ts
// Hook para gerenciar o modo de teste do Super Admin
// Permite que o admin visualize e interaja com o dashboard como Lojista ou Fabricante
// sem alterar seu role real no banco de dados.

import { useState, useEffect, useCallback } from 'react';

export type TestRole = 'lojista' | 'fabricante' | null;

const STORAGE_KEY = 'admin_test_role';

export function useAdminTestMode() {
  const [testRole, setTestRoleState] = useState<TestRole>(null);

  // Inicializar a partir do sessionStorage (persiste na aba, limpa ao fechar)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(STORAGE_KEY) as TestRole | null;
    if (stored === 'lojista' || stored === 'fabricante') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTestRoleState(stored);
    }
  }, []);

  const enterTestMode = useCallback((role: 'lojista' | 'fabricante') => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, role);
    setTestRoleState(role);
  }, []);

  const exitTestMode = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
    setTestRoleState(null);
  }, []);

  return { testRole, enterTestMode, exitTestMode };
}
