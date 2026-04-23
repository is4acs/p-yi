import {
  buildListingsCityMetadata,
  renderListingsCityPage,
} from "@/app/annonces/pillar-utils";

export const metadata = buildListingsCityMetadata("matoury");

export default async function ListingsMatouryPage() {
  return renderListingsCityPage("matoury");
}
