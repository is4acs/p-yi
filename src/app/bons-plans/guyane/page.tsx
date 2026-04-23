import { buildDealsGlobalMetadata, renderDealsGlobalPage } from "@/app/bons-plans/pillar-utils";

export const metadata = buildDealsGlobalMetadata();

export default async function DealsGuyanePage() {
  return renderDealsGlobalPage();
}
