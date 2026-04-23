import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export const metadata = buildDealsCityMetadata("remire-montjoly");

export default async function DealsRemireMontjolyPage() {
  return renderDealsCityPage("remire-montjoly");
}
