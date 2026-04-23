import type { Metadata } from "next";

type BuildSeoMetadataInput = {
  title: string;
  description: string;
  canonical: string;
  index?: boolean;
  follow?: boolean;
  type?: "website" | "article";
};

function normalizeDescription(description: string): string {
  return description.replace(/\s+/g, " ").trim();
}

export function buildSeoMetadata({
  title,
  description,
  canonical,
  index = true,
  follow = true,
  type = "website",
}: BuildSeoMetadataInput): Metadata {
  const normalizedDescription = normalizeDescription(description);

  return {
    title,
    description: normalizedDescription,
    alternates: {
      canonical,
    },
    robots: {
      index,
      follow,
    },
    openGraph: {
      type,
      title,
      description: normalizedDescription,
      url: canonical,
      siteName: "Péyi",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: normalizedDescription,
    },
  };
}
