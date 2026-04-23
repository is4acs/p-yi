import {
  buildListingsGlobalMetadata,
  renderListingsGlobalPage,
} from "@/app/annonces/pillar-utils";

export async function generateMetadata() {
  return buildListingsGlobalMetadata();
}

export default async function ListingsGuyanePage() {
  return renderListingsGlobalPage();
}
