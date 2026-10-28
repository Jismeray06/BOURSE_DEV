import { APIRequestContext, request } from '@playwright/test';
import { readFileSync } from 'node:fs';

export const API = process.env.API_URL ?? 'http://localhost:3001';
export const FRONT = process.env.FRONT_URL ?? 'http://localhost:3000';

export const accounts = {
  admin: { email: process.env.T_ADMIN_EMAIL ?? 'admin.test@example.com', password: process.env.T_ADMIN_PASSWORD ?? 'AdminTest-2026!' },
  manager: { email: process.env.T_MANAGER_EMAIL ?? 'manager.test@example.com', password: process.env.T_MANAGER_PASSWORD ?? 'ManagerTest-2026!' },
  scol: { email: process.env.T_SCOL_EMAIL ?? 'scolarite.test@example.com', password: process.env.T_SCOL_PASSWORD ?? 'ScolTest-2026!' },
  student: { email: process.env.T_STUDENT_EMAIL ?? 'aina.rabearisoa@isstm.mg', password: process.env.T_STUDENT_PASSWORD ?? 'StudentTest-2026!' },
  student2: { email: process.env.T_STUDENT2_EMAIL ?? 'andry.rakoto@isstm.mg', password: process.env.T_STUDENT_PASSWORD ?? 'StudentTest-2026!' },
} as const;

export type Role = keyof typeof accounts;

export async function login(_api: APIRequestContext, role: Role) {
  // Sessions créées une seule fois par global-setup.ts
  return JSON.parse(readFileSync('.cache/sessions.json', 'utf8'))[role] as { token: string; user: any };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function newApi() {
  return request.newContext();
}
