import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Mr Pizza · Horários da equipa",
    short_name: "Mr Pizza",
    description:
      "Cria o horário semanal da equipa do Mr Pizza: turnos, horas por pessoa e avisos de cobertura.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f3ee",
    theme_color: "#f7f3ee",
    lang: "pt-PT",
    dir: "ltr",
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
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
