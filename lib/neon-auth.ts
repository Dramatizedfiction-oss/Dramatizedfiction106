import { createClient } from "@neondatabase/neon-js";

const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
const neonDataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

if (!neonAuthUrl) {
  throw new Error("Missing NEXT_PUBLIC_NEON_AUTH_URL");
}

if (!neonDataApiUrl) {
  throw new Error("Missing NEXT_PUBLIC_NEON_DATA_API_URL");
}

const neonClient = createClient({
  auth: {
    url: neonAuthUrl,
  },
  dataApi: {
    url: neonDataApiUrl,
  },
});

export const authClient = neonClient.auth;
