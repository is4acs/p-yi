import {
  buildActivitiesCityMetadata,
  renderActivitiesCityPage,
} from "@/app/activites/pillar-utils";

export async function generateMetadata() {
  return buildActivitiesCityMetadata("saint-laurent-du-maroni");
}

export default async function ActivitiesSaintLaurentDuMaroniPage() {
  return renderActivitiesCityPage("saint-laurent-du-maroni");
}
