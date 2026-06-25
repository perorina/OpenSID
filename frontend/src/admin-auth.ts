import { apiGet, apiPost } from "./api";
import type { AdminUser } from "./api";

export async function restoreAdminSession() {
  try {
    return (await apiGet<{ user: AdminUser }>("/admin/me")).user;
  } catch {
    return (await apiPost<{ user: AdminUser }>("/admin/auth/refresh", undefined, false)).user;
  }
}

export async function loginAdmin(credentials: { username: string; password: string }) {
  return (await apiPost<{ user: AdminUser }>("/admin/auth/masuk", credentials, false)).user;
}

export async function logoutAdmin() {
  await apiPost<{ loggedOut: boolean }>("/admin/auth/keluar");
}
