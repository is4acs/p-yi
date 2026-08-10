import {
  buildActivitiesGlobalMetadata,
  renderActivitiesGlobalPage,
} from "@/app/activites/pillar-utils";

export async function generateMetadata() {
  return buildActivitiesGlobalMetadata();
}

export default async function ActivitiesGuyanePage() {
  return renderActivitiesGlobalPage();
}
