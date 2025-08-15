import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.apiToken as string | undefined;
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`${process.env.API_INTERNAL_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`API ${path} ${res.status}`);
  return res.json() as Promise<T>;
}
