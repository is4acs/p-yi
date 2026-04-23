import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export async function generateMetadata() {
  return buildDealsCityMetadata("kourou");
}

export default async function DealsKourouPage() {
  return renderDealsCityPage("kourou");
}
