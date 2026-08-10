import {
  buildActivitiesCityMetadata,
  renderActivitiesCityPage,
} from "@/app/activites/pillar-utils";

export async function generateMetadata() {
  return buildActivitiesCityMetadata("kourou");
}

export default async function ActivitiesKourouPage() {
  return renderActivitiesCityPage("kourou");
}
