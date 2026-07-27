import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Charla — Practice Spanish with Sofía",
    short_name: "Charla",
    description: "Voice-based Spanish conversation practice with an AI tutor.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff7ee",
    theme_color: "#fff7ee",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
