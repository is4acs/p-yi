import type { Metadata } from "next";

import {
  buildListingsCategoryMetadata,
  getListingsCategoryStaticParams,
  renderListingsCategoryPage,
} from "@/app/annonces/pillar-utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return getListingsCategoryStaticParams().map((entry) => ({
    slug: entry.category,
  }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return buildListingsCategoryMetadata(params.slug);
}

export default async function ListingsCategoryGuyanePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  return renderListingsCategoryPage(params.slug);
}
