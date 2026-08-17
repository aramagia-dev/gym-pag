import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DarkGradientBg } from "@/components/ui/elegant-dark-pattern";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gym Pag | Entrenamiento",
  description: "Organice sus ejercicios y rutinas de entrenamiento.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><DarkGradientBg>{children}</DarkGradientBg></body>
    </html>
  );
}
