import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export async function generateMetadata() {
  return buildDealsCityMetadata("cayenne");
}

export default async function DealsCayennePage() {
  return renderDealsCityPage("cayenne");
}
