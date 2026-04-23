import {
  buildListingsCityMetadata,
  renderListingsCityPage,
} from "@/app/annonces/pillar-utils";

export async function generateMetadata() {
  return buildListingsCityMetadata("saint-laurent-du-maroni");
}

export default async function ListingsSaintLaurentDuMaroniPage() {
  return renderListingsCityPage("saint-laurent-du-maroni");
}
