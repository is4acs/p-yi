import {
  buildListingsCityMetadata,
  renderListingsCityPage,
} from "@/app/annonces/pillar-utils";

export async function generateMetadata() {
  return buildListingsCityMetadata("kourou");
}

export default async function ListingsKourouPage() {
  return renderListingsCityPage("kourou");
}
