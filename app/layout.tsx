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
};

export const viewport: Viewport = {
  themeColor: "#f7f3ee",
  width: "device-width",
  initialScale: 1,
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
