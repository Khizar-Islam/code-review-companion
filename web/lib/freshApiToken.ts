import { getSession } from "next-auth/react";

// For client components: re-reads the session (which mints a new API token
// server-side) instead of trusting the useSession copy, which may have been
// fetched long enough ago for its token to have expired.
export async function freshApiToken(): Promise<string> {
  const session = await getSession();
  if (!session?.apiToken) {
    throw new Error("Your session has expired — please sign in again");
  }
  return session.apiToken;
}
