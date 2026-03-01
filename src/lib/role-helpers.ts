// src/lib/role-helpers.ts
// Helper centralizado para verificações de role

import type { Profile } from '@/types/database';

/**
 * Verifica se o perfil tem permissões de admin (admin ou super_admin)
 */
export function isAdminRole(profile: Pick<Profile, 'role' | 'is_super_admin'> | null): boolean {
  if (!profile) return false;
  return profile.role === 'admin' || profile.role === 'super_admin' || profile.is_super_admin === true;
}

/**
 * Verifica se o perfil é fabricante (ou admin, que tem acesso de fabricante)
 */
export function isFabricanteRole(profile: Pick<Profile, 'role' | 'is_super_admin'> | null): boolean {
  if (!profile) return false;
  return profile.role === 'fabricante' || isAdminRole(profile);
}

/**
 * Verifica se o perfil é lojista
 */
export function isLojistaRole(profile: Pick<Profile, 'role'> | null): boolean {
  if (!profile) return false;
  return profile.role === 'lojista';
}
