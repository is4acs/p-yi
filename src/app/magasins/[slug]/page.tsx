import type { Metadata } from "next";

import {
  buildStoreMetadata,
  getStoreStaticParams,
  renderStorePage,
} from "@/app/magasins/pillar-utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStoreStaticParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return buildStoreMetadata(params.slug);
}

export default async function StorePillarPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  return renderStorePage(params.slug);
}
