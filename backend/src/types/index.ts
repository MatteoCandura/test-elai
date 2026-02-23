export type ColumnType = 'text' | 'number' | 'date';

export interface ColumnDefinition {
  name: string;
  suggestedType: ColumnType;
  assignedType: ColumnType;
}

export type Permission = 'view_all' | 'delete_all' | 'edit_all' | 'manage_users';

export const VALID_PERMISSIONS: readonly Permission[] = [
  'view_all',
  'delete_all',
  'edit_all',
  'manage_users',
] as const;

export interface JwtPayload {
  userId: string;
  email: string;
  permissions: Permission[];
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
