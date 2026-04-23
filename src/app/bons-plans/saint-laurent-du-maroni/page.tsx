import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export async function generateMetadata() {
  return buildDealsCityMetadata("saint-laurent-du-maroni");
}

export default async function DealsSaintLaurentDuMaroniPage() {
  return renderDealsCityPage("saint-laurent-du-maroni");
}
