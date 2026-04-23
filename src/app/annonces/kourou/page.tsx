import {
  buildListingsCityMetadata,
  renderListingsCityPage,
} from "@/app/annonces/pillar-utils";

export const metadata = buildListingsCityMetadata("kourou");

export default async function ListingsKourouPage() {
  return renderListingsCityPage("kourou");
}
