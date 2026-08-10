import {
  buildActivitiesCityMetadata,
  renderActivitiesCityPage,
} from "@/app/activites/pillar-utils";

export async function generateMetadata() {
  return buildActivitiesCityMetadata("roura");
}

export default async function ActivitiesRouraPage() {
  return renderActivitiesCityPage("roura");
}
