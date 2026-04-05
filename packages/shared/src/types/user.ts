export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface UserSummary {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}
