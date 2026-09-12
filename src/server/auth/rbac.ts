import type { UserRole } from '@prisma/client';

/**
 * Role-based access control.
 *
 * Permissions are coarse on purpose — a dress shop has three kinds of people,
 * not a permission matrix. Split a permission only when someone actually needs
 * one half of it without the other.
 */
export type Permission =
  | 'catalog:read'
  | 'catalog:write'
  | 'inventory:write'
  | 'order:read:any'
  | 'order:fulfill'
  | 'order:refund'
  | 'customer:read'
  | 'discount:write'
  | 'settings:write'
  | 'audit:read'
  | 'user:manage';

const STAFF_PERMISSIONS: Permission[] = [
  'catalog:read',
  'catalog:write',
  'inventory:write',
  'order:read:any',
  'order:fulfill',
  'customer:read',
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...STAFF_PERMISSIONS,
  'order:refund',
  'discount:write',
  'settings:write',
  'audit:read',
  'user:manage',
];

const PERMISSIONS_BY_ROLE: Record<UserRole, readonly Permission[]> = {
  CUSTOMER: [],
  STAFF: STAFF_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS_BY_ROLE[role].includes(permission);
}

/** Any role that may open the admin area at all. */
export const STAFF_ROLES: readonly UserRole[] = ['STAFF', 'ADMIN'];

export function isStaff(role: UserRole | undefined | null): boolean {
  return role === 'STAFF' || role === 'ADMIN';
}
