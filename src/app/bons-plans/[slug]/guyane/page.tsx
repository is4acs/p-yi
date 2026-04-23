import type { Metadata } from "next";

import {
  buildDealsCategoryMetadata,
  getDealsCategoryStaticParams,
  renderDealsCategoryPage,
} from "@/app/bons-plans/pillar-utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return getDealsCategoryStaticParams().map((entry) => ({ slug: entry.category }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return buildDealsCategoryMetadata(params.slug);
}

export default async function DealsCategoryGuyanePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  return renderDealsCategoryPage(params.slug);
}
