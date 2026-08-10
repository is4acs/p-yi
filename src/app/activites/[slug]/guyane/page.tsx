import type { Metadata } from "next";

import {
  buildActivitiesCategoryMetadata,
  getActivitiesCategoryStaticParams,
  renderActivitiesCategoryPage,
} from "@/app/activites/pillar-utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return getActivitiesCategoryStaticParams().map((entry) => ({
    slug: entry.category,
  }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return buildActivitiesCategoryMetadata(params.slug);
}

export default async function ActivitiesCategoryGuyanePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  return renderActivitiesCategoryPage(params.slug);
}
