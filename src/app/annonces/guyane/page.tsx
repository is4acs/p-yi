import {
  buildListingsGlobalMetadata,
  renderListingsGlobalPage,
} from "@/app/annonces/pillar-utils";

export const metadata = buildListingsGlobalMetadata();

export default async function ListingsGuyanePage() {
  return renderListingsGlobalPage();
}
