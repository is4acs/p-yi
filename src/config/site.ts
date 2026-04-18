import { env } from "@/lib/env";

export const siteConfig = {
  name: "Péyi",
  description:
    "Bons plans et petites annonces 100% Guyane. Trouve les meilleures promos et vends près de chez toi.",
  url: env.NEXT_PUBLIC_SITE_URL ?? "https://peyi.com",
  ogImage: "/og-image.png",
  themeColor: "#FF8A3D",
  defaultLocale: "fr",
  defaultCity: "cayenne",
  contactEmail: "hello@peyi.com",
  socials: {
    instagram: "https://instagram.com/peyi.gf",
    facebook: "https://facebook.com/peyi.gf",
  },
} as const;

export type SiteConfig = typeof siteConfig;
