import {
  buildListingsCityMetadata,
  renderListingsCityPage,
} from "@/app/annonces/pillar-utils";

export async function generateMetadata() {
  return buildListingsCityMetadata("cayenne");
}

export default async function ListingsCayennePage() {
  return renderListingsCityPage("cayenne");
}
