import {
  buildListingsCityMetadata,
  renderListingsCityPage,
} from "@/app/annonces/pillar-utils";

export const metadata = buildListingsCityMetadata("cayenne");

export default async function ListingsCayennePage() {
  return renderListingsCityPage("cayenne");
}
