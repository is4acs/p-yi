import {
  buildListingsCityMetadata,
  renderListingsCityPage,
} from "@/app/annonces/pillar-utils";

export async function generateMetadata() {
  return buildListingsCityMetadata("remire-montjoly");
}

export default async function ListingsRemireMontjolyPage() {
  return renderListingsCityPage("remire-montjoly");
}
