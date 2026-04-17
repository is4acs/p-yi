import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Péyi — Bons plans et petites annonces de Guyane",
    template: "%s | Péyi",
  },
  description:
    "Péyi est la plateforme des bons plans et petites annonces 100% Guyane. Trouve les meilleures promos et vends près de chez toi.",
  applicationName: "Péyi",
  metadataBase: new URL("https://peyi.com"),
};

export const viewport: Viewport = {
  themeColor: "#FF8A3D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn(inter.variable, plusJakarta.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background pb-20 font-sans text-foreground antialiased sm:pb-0">
        <Header />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
