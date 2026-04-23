import {
  buildListingsCityMetadata,
  renderListingsCityPage,
} from "@/app/annonces/pillar-utils";

export const metadata = buildListingsCityMetadata("remire-montjoly");

export default async function ListingsRemireMontjolyPage() {
  return renderListingsCityPage("remire-montjoly");
}
