import {
  buildActivitiesCityMetadata,
  renderActivitiesCityPage,
} from "@/app/activites/pillar-utils";

export async function generateMetadata() {
  return buildActivitiesCityMetadata("macouria");
}

export default async function ActivitiesMacouriaPage() {
  return renderActivitiesCityPage("macouria");
}
