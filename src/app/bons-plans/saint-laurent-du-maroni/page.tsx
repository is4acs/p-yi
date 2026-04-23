import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export const metadata = buildDealsCityMetadata("saint-laurent-du-maroni");

export default async function DealsSaintLaurentDuMaroniPage() {
  return renderDealsCityPage("saint-laurent-du-maroni");
}
