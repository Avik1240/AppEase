import { headers } from "next/headers";

export type SessionIdentity = {
  id: string;
  role: string;
  fullName: string;
};

/**
 * Reads the identity middleware already verified for this request (via
 * auth.getUser() + a single profiles query) instead of re-fetching it in
 * every Server Component. Only valid on routes middleware actually guards
 * (/customer, /salon, /admin) — returns null anywhere else, including
 * public pages, since middleware clears these headers when there's no user.
 */
export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  const h = await headers();
  const id = h.get("x-user-id");
  if (!id) return null;
  return {
    id,
    role: h.get("x-user-role") ?? "customer",
    fullName: decodeURIComponent(h.get("x-user-name") ?? ""),
  };
}
