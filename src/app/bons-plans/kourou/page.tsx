import { buildDealsCityMetadata, renderDealsCityPage } from "@/app/bons-plans/pillar-utils";

export const metadata = buildDealsCityMetadata("kourou");

export default async function DealsKourouPage() {
  return renderDealsCityPage("kourou");
}
