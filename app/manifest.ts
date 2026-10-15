import type { MetadataRoute } from "next";

/** "Add to home screen" on phones. Icons: scripts/make-brand-assets.ts. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dramatized Fiction",
    short_name: "Dramatized",
    description: "Serialized stories, one episode at a time.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0a10",
    theme_color: "#0b0a10",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
