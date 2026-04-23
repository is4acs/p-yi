import {
  buildListingsCityMetadata,
  renderListingsCityPage,
} from "@/app/annonces/pillar-utils";

export async function generateMetadata() {
  return buildListingsCityMetadata("matoury");
}

export default async function ListingsMatouryPage() {
  return renderListingsCityPage("matoury");
}
