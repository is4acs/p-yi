import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export const metadata = buildDealsCityMetadata("matoury");

export default async function DealsMatouryPage() {
  return renderDealsCityPage("matoury");
}
