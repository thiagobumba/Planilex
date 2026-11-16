import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-texto" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--fonte-titulo" });

export const metadata: Metadata = {
  title: "Planilex",
  description: "Controle de previsão de gastos do casamento e da casa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
