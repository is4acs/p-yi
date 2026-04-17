import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { RouteProgress } from "@/components/layout/RouteProgress";
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
  icons: {
    icon: "/favicon.ico",
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
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <Header
          user={user}
          unreadCount={unreadCount}
          unreadNotifications={unreadNotifications}
        />
        {children}
        <BottomNav unreadCount={unreadCount} />
      </body>
    </html>
  );
}
