import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export async function generateMetadata() {
  return buildDealsCityMetadata("matoury");
}

export default async function DealsMatouryPage() {
  return renderDealsCityPage("matoury");
}
