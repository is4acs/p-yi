// =============================================================================
// PÉYI - Seed des activités & lieux à découvrir (verticale voyage/tourisme)
// =============================================================================
// Usage : npm run db:seed-activites
//
// Les données vivent dans prisma/data/activities.ts (source unique, partagée
// avec le générateur SQL). Ce fichier ne fait que les pousser en base via
// Prisma. Idempotent : upsert par slug, relançable sans dégât.
//
// Pas d'images seedées : le bucket Supabase `activities` est vide au départ,
// l'UI affiche un placeholder tant que l'admin n'a pas uploadé.
// =============================================================================

// Charge `.env` AVANT d'instancier PrismaClient. Contrairement au CLI Prisma
// (`prisma migrate`, `prisma db seed`), le client ne lit aucun fichier
// d'environnement tout seul : lancé via `tsx`, ce script ne verrait pas
// DATABASE_URL et échouerait sur « Environment variable not found ». dotenv
// est silencieux s'il n'y a pas de `.env`, donc l'import est sans effet de bord.
import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { ACTIVITIES, CITIES } from "./data/activities";

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding activités Péyi...')

  for (const city of CITIES) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: city,
    })
  }
  console.log(`✅ ${CITIES.length} communes vérifiées`)

  const cityIdBySlug = new Map<string, string>()
  for (const city of await prisma.city.findMany({ select: { id: true, slug: true } })) {
    cityIdBySlug.set(city.slug, city.id)
  }

  for (const activity of ACTIVITIES) {
    const cityId = cityIdBySlug.get(activity.citySlug)
    if (!cityId) {
      throw new Error(`Commune introuvable pour le slug "${activity.citySlug}"`)
    }

    const { citySlug: _citySlug, ...fields } = activity
    const data = {
      ...fields,
      cityId,
      isFree: activity.isFree ?? false,
      bookingRequired: activity.bookingRequired ?? false,
      status: 'PUBLISHED' as const,
    }

    await prisma.activity.upsert({
      where: { slug: activity.slug },
      update: data,
      create: data,
    })
  }
  console.log(`✅ ${ACTIVITIES.length} activités publiées`)

  console.log('✨ Seed activités terminé !')
}

main()
  .catch((e) => {
    console.error('❌ Erreur de seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
