import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mr Pizza · Horários da equipa",
  description:
    "Cria o horário semanal da equipa do Mr Pizza: turnos, horas por pessoa e avisos de cobertura.",
  applicationName: "Mr Pizza",
  appleWebApp: {
    capable: true,
    title: "Mr Pizza",
    statusBarStyle: "default",
  },
  other: {
    // O Next escreve mobile-web-app-capable; o Safari antigo só reconhece esta.
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ee",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
