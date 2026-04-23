import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export const metadata = buildDealsCityMetadata("cayenne");

export default async function DealsCayennePage() {
  return renderDealsCityPage("cayenne");
}
