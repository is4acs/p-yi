import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export async function generateMetadata() {
  return buildDealsCityMetadata("remire-montjoly");
}

export default async function DealsRemireMontjolyPage() {
  return renderDealsCityPage("remire-montjoly");
}
