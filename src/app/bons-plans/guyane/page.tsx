import { buildDealsGlobalMetadata, renderDealsGlobalPage } from "@/app/bons-plans/pillar-utils";

export async function generateMetadata() {
  return buildDealsGlobalMetadata();
}

export default async function DealsGuyanePage() {
  return renderDealsGlobalPage();
}
