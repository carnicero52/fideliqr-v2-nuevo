import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FideliQR - Sistema de Fidelización Digital",
  description: "Sistema de fidelización de clientes con códigos QR. Premia a tus clientes leales de forma simple y efectiva.",
  keywords: ["fidelización", "clientes", "QR", "puntos", "recompensas", "lealtad"],
  authors: [{ name: "FideliQR" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "FideliQR - Sistema de Fidelización Digital",
    description: "Premia a tus clientes leales de forma simple y efectiva",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
