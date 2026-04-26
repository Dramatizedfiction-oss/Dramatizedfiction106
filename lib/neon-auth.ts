import { createClient } from "@neondatabase/neon-js";

const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;

if (!neonAuthUrl) {
  throw new Error("Missing NEXT_PUBLIC_NEON_AUTH_URL");
}

const neonClient = createClient({
  auth: {
    url: neonAuthUrl,
  },
});

export const authClient = neonClient.auth;
