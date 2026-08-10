import {
  buildActivitiesCityMetadata,
  renderActivitiesCityPage,
} from "@/app/activites/pillar-utils";

export async function generateMetadata() {
  return buildActivitiesCityMetadata("cayenne");
}

export default async function ActivitiesCayennePage() {
  return renderActivitiesCityPage("cayenne");
}
