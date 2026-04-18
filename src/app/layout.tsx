import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { BannedBanner } from "@/components/layout/BannedBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { RouteProgress } from "@/components/layout/RouteProgress";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fetchUnreadCount } from "@/lib/messages/queries";
import { fetchUnreadNotificationsCount } from "@/lib/notifications/queries";
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
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Péyi",
    title: "Péyi — Bons plans et petites annonces de Guyane",
    description:
      "La plateforme des bons plans et petites annonces 100% Guyane. Partage, vote, et profite des meilleures promos près de chez toi.",
    url: "https://peyi.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Péyi — Bons plans de Guyane",
    description:
      "Partage, vote et profite des meilleurs bons plans de Guyane.",
  },
  // Icons are generated dynamically by src/app/icon.tsx and apple-icon.tsx.
  // Next auto-wires them into <head>, no need to list them here.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Péyi",
    // "default" = white status bar with dark icons, matches our light theme.
    // "black-translucent" would let content flow behind the status bar —
    // we'd need extra safe-area padding everywhere, not worth it right now.
    statusBarStyle: "default",
  },
  formatDetection: {
    // Disable iOS's auto-linking of phone numbers in our marketing copy —
    // we want the explicit `tel:` links we build ourselves to be the only
    // clickable phone numbers. Emails stay auto-detected.
    telephone: false,
  },
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
  const user = await getCurrentUser();
  // Fetch both counters in parallel for the nav — kept small because they hit
  // every request. Both are indexed in Prisma so they stay cheap.
  const [unreadCount, unreadNotifications] = user
    ? await Promise.all([
        fetchUnreadCount(user.id),
        fetchUnreadNotificationsCount(user.id),
      ])
    : [0, 0];

  return (
    <html
      lang="fr"
      className={cn(inter.variable, plusJakarta.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background pb-20 font-sans text-foreground antialiased sm:pb-0">
        <ServiceWorkerRegister />
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <Header
          user={user}
          unreadCount={unreadCount}
          unreadNotifications={unreadNotifications}
        />
        {user?.isBanned &&
          (!user.bannedUntil || user.bannedUntil > new Date()) && (
            <BannedBanner bannedUntil={user.bannedUntil} />
          )}
        {children}
        <Footer />
        <BottomNav unreadCount={unreadCount} />
        <InstallBanner />
      </body>
    </html>
  );
}
