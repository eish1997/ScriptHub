import { rolePermissions, type Permission, type RuntimeRole } from './mockRuntime';

export function hasPermission(role: RuntimeRole, permission: Permission) {
  return (rolePermissions[role] as string[]).includes(permission);
}
