import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KUMO · Carta japonesa",
  description: "Descubre la carta de sushi, ramen y comida oriental de KUMO.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
