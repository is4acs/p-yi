import {
  buildActivitiesCityMetadata,
  renderActivitiesCityPage,
} from "@/app/activites/pillar-utils";

export async function generateMetadata() {
  return buildActivitiesCityMetadata("remire-montjoly");
}

export default async function ActivitiesRemireMontjolyPage() {
  return renderActivitiesCityPage("remire-montjoly");
}
