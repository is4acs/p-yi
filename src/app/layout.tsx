import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Nunito } from "next/font/google";
import { cn } from "@/lib/utils";
import { WebVitals } from "@/components/analytics/WebVitals";
import { BannedBanner } from "@/components/layout/BannedBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { RouteProgress } from "@/components/layout/RouteProgress";
import { SkipLink } from "@/components/layout/SkipLink";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fetchUnreadCount } from "@/lib/messages/queries";
import { fetchUnreadNotificationsCount } from "@/lib/notifications/queries";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

// Peyi design system v1.0 : Inter (body) + Nunito (display) + JetBrains
// Mono (labels techniques, eyebrows, prix). Les trois sont chargées via
// next/font/google : Next self-hoste les fichiers au build, donc pas de
// requête runtime vers fonts.googleapis.com (meilleur CLS et FCP).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  // On charge tous les poids utiles au design : 400 pour le body de
  // secours, 700 pour les titres md, 800 pour les titres lg, 900 pour
  // les display géants. Les variantes non utilisées sont purgées au
  // build par next/font, donc pas de coût réseau inutile.
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: {
    default: "Péyi — Bons plans et petites annonces de Guyane",
    template: "%s | Péyi",
  },
  description:
    "Péyi est la plateforme des bons plans et petites annonces 100% Guyane. Trouve les meilleures promos et vends près de chez toi.",
  applicationName: "Péyi",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Péyi",
    title: "Péyi — Bons plans et petites annonces de Guyane",
    description:
      "La plateforme des bons plans et petites annonces 100% Guyane. Partage, vote, et profite des meilleures promos près de chez toi.",
    url: siteUrl,
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
  // Chrome déprécie le préfixe `apple-` et exige le meta non-préfixé pour
  // reconnaître l'app comme installable en PWA standalone. Next n'expose
  // pas encore de champ dédié dans `appleWebApp`, donc on l'injecte via
  // `other` — les deux meta coexistent (Safari lit l'un, Chrome l'autre).
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF914C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Le root layout tourne sur CHAQUE requête. Si `getCurrentUser` ou les
  // counts de badge throwent (Supabase timeout, pool Prisma saturé,
  // cookie corrompu…), Next remonte au boundary global et l'utilisateur
  // voit "Quelque chose s'est mal passé" sur TOUT le site, y compris
  // sur les pages publiques `/bons-plans` et `/annonces`. On absorbe
  // tout ici : pire cas, l'utilisateur est traité comme déconnecté
  // pour cette requête — rechargement = retour à la normale.
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[layout/root] getCurrentUser failed", err);
  }

  let unreadCount = 0;
  let unreadNotifications = 0;
  if (user) {
    try {
      [unreadCount, unreadNotifications] = await Promise.all([
        fetchUnreadCount(user.id),
        fetchUnreadNotificationsCount(user.id),
      ]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[layout/root] badge counts failed", {
        userId: user.id,
        err,
      });
    }
  }

  // JSON-LD Organization + WebSite — injectés au root pour que chaque
  // page publique hérite du signal d'identité éditoriale. Google pose
  // la knowledge panel et la sitelinks search box à partir de ça.
  const rootJsonLd = serializeJsonLd([
    buildOrganizationJsonLd(),
    buildWebSiteJsonLd(),
  ]);

  return (
    <html
      lang="fr"
      className={cn(inter.variable, nunito.variable, jetBrainsMono.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background pb-20 font-sans text-foreground antialiased sm:pb-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: rootJsonLd }}
        />
        <SkipLink />
        <ServiceWorkerRegister />
        <WebVitals />
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
        {/*
          Wrapper invisible qui sert de cible au SkipLink. On ne met pas
          `<main>` ici parce que chaque page définit son propre `<main>`
          (utile pour les landmarks ARIA et le SEO). Le wrapper reçoit
          tabIndex={-1} pour être focusable programmatiquement — quand
          le lien "Aller au contenu" est activé, le focus saute ici puis
          retombe naturellement sur le premier élément interactif de la
          page au Tab suivant.

          `overflow-x-clip` : garde-fou mobile critique. Les heroes et
          strips utilisent le pattern `-mx-4 px-4` pour faire bleeder
          leur fond jusqu'aux bords du viewport. Mais les `<main>` des
          pages listing (`/`, `/bons-plans`, `/annonces`) n'ont pas de
          `px-4` eux-mêmes — donc `-mx-4` fait déborder le layout de
          32px au total, ce qui crée un scroll horizontal parasite sur
          iPhone (« texte coupé à droite », scroll-bounce latéral).
          `clip` (vs `hidden`) ne crée pas de scroll container : la
          position:sticky des filter-bars reste ancrée sur window, pas
          sur ce wrapper. Supporté partout depuis Safari 16 / Chrome 90.
        */}
        <div
          id="main-content"
          tabIndex={-1}
          className="overflow-x-clip focus:outline-none"
        >
          {children}
        </div>
        <Footer />
        <BottomNav unreadCount={unreadCount} />
        <InstallBanner />
      </body>
    </html>
  );
}
