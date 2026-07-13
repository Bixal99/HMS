"use server";

import { revokeCurrentSession } from "@/lib/session";

/** Revokes the database Session row and clears the Auth.js session cookie. */
export async function logoutAction(): Promise<void> {
  await revokeCurrentSession();
}
