// =============================================================================
// PÉYI - Seed des activités & lieux à découvrir (verticale voyage/tourisme)
// =============================================================================
// Usage : npm run db:seed-activites
//
// 15 sites réels de Guyane, géolocalisés et répartis sur le territoire
// (littoral, Ouest, Est, intérieur) pour tester la carte immédiatement.
// Les coordonnées viennent d'OpenStreetMap / sources officielles (ONF,
// Conservatoire du littoral). Idempotent : upsert par slug.
//
// Pas d'images seedées : le bucket Supabase `activities` est vide au
// départ, l'UI affiche un placeholder tant que l'admin n'a pas uploadé.
// =============================================================================

import { PrismaClient, Prisma } from '@prisma/client'
import type { AccessMode, ActivityCategory, Difficulty, Season } from '@prisma/client'

const prisma = new PrismaClient()

// Sous-ensemble des 22 communes (mêmes données que prisma/seed.ts) upserté
// ici aussi pour que ce seed soit exécutable seul sur une base neuve.
const CITIES = [
  { name: 'Cayenne', slug: 'cayenne', postcode: '97300', latitude: 4.9227, longitude: -52.3269 },
  { name: 'Rémire-Montjoly', slug: 'remire-montjoly', postcode: '97354', latitude: 4.8951, longitude: -52.2713 },
  { name: 'Kourou', slug: 'kourou', postcode: '97310', latitude: 5.1595, longitude: -52.6503 },
  { name: 'Saint-Laurent-du-Maroni', slug: 'saint-laurent-du-maroni', postcode: '97320', latitude: 5.5018, longitude: -54.028 },
  { name: 'Macouria', slug: 'macouria', postcode: '97355', latitude: 4.9797, longitude: -52.4275 },
  { name: 'Roura', slug: 'roura', postcode: '97311', latitude: 4.7264, longitude: -52.3411 },
  { name: 'Montsinéry-Tonnegrande', slug: 'montsinery-tonnegrande', postcode: '97356', latitude: 4.8878, longitude: -52.515 },
  { name: 'Régina', slug: 'regina', postcode: '97390', latitude: 4.3125, longitude: -52.135 },
  { name: 'Awala-Yalimapo', slug: 'awala-yalimapo', postcode: '97319', latitude: 5.7425, longitude: -53.9289 },
  { name: 'Saül', slug: 'saul', postcode: '97314', latitude: 3.6219, longitude: -53.205 },
]

type ActivitySeed = {
  slug: string
  name: string
  tagline: string
  description: string
  category: ActivityCategory
  tags: string[]
  latitude: number
  longitude: number
  citySlug: string
  address?: string
  startPoint?: string
  accessModes: AccessMode[]
  durationMinutes?: number
  difficulty?: Difficulty
  seasons: Season[]
  accessNote?: string
  priceMinCents?: number
  priceMaxCents?: number
  isFree?: boolean
  bookingRequired?: boolean
  bookingUrl?: string
  phone?: string
  whatsapp?: string
  website?: string
  instagram?: string
  openingHours?: Prisma.InputJsonValue
}

const OPEN_DAILY_ZOO = {
  monday: [['09:30', '17:30']],
  tuesday: [['09:30', '17:30']],
  wednesday: [['09:30', '17:30']],
  thursday: [['09:30', '17:30']],
  friday: [['09:30', '17:30']],
  saturday: [['09:30', '17:30']],
  sunday: [['09:30', '17:30']],
}

const ACTIVITIES: ActivitySeed[] = [
  {
    slug: 'iles-du-salut',
    name: 'Îles du Salut',
    tagline: "L'archipel du bagne : vestiges chargés d'histoire, cocotiers et eaux turquoise au large de Kourou.",
    description: `Royale, Saint-Joseph et l'île du Diable forment l'archipel le plus célèbre de Guyane. On y débarque après ~1h de traversée depuis Kourou pour arpenter les vestiges du bagne (quartiers des condamnés, chapelle, hôpital), croiser agoutis, paons et singes, et se baigner dans la piscine des bagnards côté Saint-Joseph.

Compte une journée complète : tour de Royale (1h30 de marche), traversée en surf-boat vers Saint-Joseph selon la mer, déjeuner tiré du sac ou à l'auberge. L'île du Diable, elle, ne se visite pas.`,
    category: 'HERITAGE',
    tags: ['incontournable', 'histoire', 'famille', 'îlet'],
    latitude: 5.287,
    longitude: -52.5896,
    citySlug: 'kourou',
    startPoint: 'Ponton des Roches, Kourou (navettes catamaran)',
    accessModes: ['BOAT'],
    durationMinutes: 480,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: 'Traversée ~1h, mer parfois agitée en début de journée — réserve la navette la veille, départs le matin.',
    priceMinCents: 4500,
    priceMaxCents: 6900,
    bookingRequired: true,
  },
  {
    slug: 'savane-roche-virginie',
    name: 'Savane-roche Virginie',
    tagline: "Le seul inselberg accessible depuis la route : 2h de forêt primaire pour un panorama à 360° sur la canopée.",
    description: `Un sentier ONF de 2,9 km (comptez ~2h aller) traverse forêt primaire, talwegs et zones humides avant de déboucher sur la dalle rocheuse : un inselberg de 138 m d'altitude posé au milieu de l'océan vert, avec ses broméliacées et ses mares temporaires.

Le site est classé réserve biologique depuis 2022. Bivouac possible sur la zone aménagée en contrebas de la roche — lever de soleil inoubliable.`,
    category: 'NATURE',
    tags: ['rando', 'inselberg', 'bivouac', 'panorama'],
    latitude: 4.19653,
    longitude: -52.15208,
    citySlug: 'regina',
    startPoint: 'PK 122,5 de la RN2 direction Saint-Georges (parking du sentier ONF)',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 300,
    difficulty: 'MODERATE',
    seasons: ['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON'],
    accessNote: 'Sentier boueux et glissant en saison des pluies. Pars tôt : la roche est brûlante à la mi-journée, emporte 2 L d\'eau par personne.',
    isFree: true,
  },
  {
    slug: 'plage-des-hattes',
    name: 'Plage des Hattes — ponte des tortues luths',
    tagline: "L'un des premiers sites de ponte de tortues luths au monde, sur la plage du village kali'na d'Awala-Yalimapo.",
    description: `Face à l'embouchure du Maroni, la plage des Hattes accueille chaque année l'un des plus grands rassemblements de tortues luths de la planète — jusqu'à plusieurs dizaines de pontes par nuit en pic de saison, ainsi que des tortues vertes.

La ponte s'observe de nuit, à marée haute, d'avril à juillet ; les éclosions se poursuivent jusqu'en septembre. Reste à distance, sans lampe blanche ni flash — des éco-volontaires encadrent le site en saison.`,
    category: 'WILDLIFE',
    tags: ['tortues', 'famille', 'gratuit', 'plage'],
    latitude: 5.744,
    longitude: -53.9345,
    citySlug: 'awala-yalimapo',
    startPoint: "Plage de Yalimapo, face à l'embouchure du Maroni",
    accessModes: ['CAR'],
    durationMinutes: 120,
    difficulty: 'EASY',
    seasons: ['RAINY_SEASON', 'MAIN_DRY_SEASON'],
    accessNote: "Ponte d'avril à juillet, de nuit à marée haute ; éclosions jusqu'en septembre. 3h30 de route depuis Cayenne — prévois de dormir sur place.",
    isFree: true,
  },
  {
    slug: 'centre-spatial-guyanais',
    name: 'Centre spatial guyanais & Musée de l\'espace',
    tagline: "Le port spatial de l'Europe : visite des installations de lancement Ariane 6 et Vega, et musée de l'espace.",
    description: `Impossible de passer à Kourou sans voir d'où décollent Ariane 6 et Vega. La visite guidée en bus (~3h, gratuite sur réservation) emmène au pied des ensembles de lancement et au centre de contrôle Jupiter ; le Musée de l'espace complète avec ses salles interactives et son planétarium.

Les jours de lancement, les visites sont suspendues — mais des sites d'observation publics permettent de vivre un décollage, l'expérience la plus marquante de Guyane.`,
    category: 'SPACE',
    tags: ['espace', 'fusée', 'famille', 'visite guidée'],
    latitude: 5.1721,
    longitude: -52.687,
    citySlug: 'kourou',
    address: 'Centre spatial guyanais, Kourou',
    accessModes: ['CAR'],
    durationMinutes: 180,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "Visites du CSG gratuites sur réservation (pièce d'identité obligatoire, enfants 8 ans et +). Planning suspendu les jours de lancement.",
    priceMinCents: 400,
    priceMaxCents: 700,
    bookingRequired: true,
  },
  {
    slug: 'camp-de-la-transportation',
    name: 'Camp de la Transportation',
    tagline: "Le camp d'arrivée de tous les bagnards de Guyane, au cœur de Saint-Laurent-du-Maroni.",
    description: `Entre 1858 et 1946, tous les condamnés à la transportation débarquaient ici avant d'être répartis dans les camps de la colonie pénitentiaire. Cases, quartier de réclusion, cellule attribuée à Papillon : le site, remarquablement conservé, se découvre en visite guidée depuis le CIAP.

Prolonge avec les rues coloniales du quartier officiel et les bords du Maroni, face au Suriname.`,
    category: 'HERITAGE',
    tags: ['bagne', 'histoire', 'visite guidée', 'famille'],
    latitude: 5.5037,
    longitude: -54.0299,
    citySlug: 'saint-laurent-du-maroni',
    address: 'Esplanade Laurent Baudin, Saint-Laurent-du-Maroni',
    accessModes: ['CAR'],
    durationMinutes: 90,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: 'Accès libre à la cour ; l\'intérieur (réclusion, cellules) se visite uniquement en visite guidée, plusieurs départs par jour.',
    priceMinCents: 500,
    priceMaxCents: 850,
  },
  {
    slug: 'marche-de-cacao',
    name: 'Marché de Cacao',
    tagline: 'Le dimanche matin, le village hmong de Cacao devient le plus savoureux marché de Guyane.',
    description: `Installée sur les collines de la Comté depuis 1977, la communauté hmong a fait de Cacao le potager de la Guyane. Chaque dimanche, son marché déborde de fruits, légumes, broderies et surtout de soupes chinoises et nems dévorés sur place dès le matin.

Complète la sortie avec le musée « Le Planeur bleu » (insectes et papillons) et une balade au bord de la rivière.`,
    category: 'GASTRONOMY',
    tags: ['marché', 'hmong', 'famille', 'dimanche'],
    latitude: 4.5747,
    longitude: -52.4653,
    citySlug: 'roura',
    address: 'Bourg de Cacao, Roura',
    accessModes: ['CAR'],
    durationMinutes: 120,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "Route de montagne sinueuse après la RN2 — compte ~1h15 depuis Cayenne et arrive avant 9h pour les soupes.",
    isFree: true,
    openingHours: { sunday: [['08:00', '13:00']] },
  },
  {
    slug: 'marais-de-kaw',
    name: 'Marais de Kaw',
    tagline: "Une des plus grandes zones humides de France : caïmans rouges la nuit, oiseaux à l'aube, en pirogue.",
    description: `Au pied de la montagne de Kaw, 94 000 hectares de marais abritent caïmans noirs et rouges, ibis rouges, hoazins et une flore aquatique spectaculaire. Les sorties se font en pirogue depuis le dégrad, de jour pour les oiseaux ou de nuit pour approcher les caïmans à la lampe.

Plusieurs opérateurs proposent aussi la nuit en carbet flottant au milieu du marais — brume de l'aube garantie.`,
    category: 'WILDLIFE',
    tags: ['caïmans', 'pirogue', 'nocturne', 'oiseaux'],
    latitude: 4.493,
    longitude: -52.048,
    citySlug: 'roura',
    startPoint: 'Dégrad de Kaw, au bout de la D6 (montagne de Kaw)',
    accessModes: ['CAR', 'PIROGUE'],
    durationMinutes: 240,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: 'Route de la montagne de Kaw par endroits dégradée — prudence de nuit et par temps de pluie. Sorties uniquement avec un piroguier agréé.',
    priceMinCents: 4500,
    priceMaxCents: 6500,
    bookingRequired: true,
  },
  {
    slug: 'sentier-du-rorota',
    name: 'Sentier du Rorota',
    tagline: "La boucle familiale de l'île de Cayenne : lacs, paresseux et vues sur les îlets de Rémire.",
    description: `Au-dessus de Rémire-Montjoly, cette boucle de ~6,5 km fait le tour des lacs du Rorota qui alimentaient autrefois Cayenne en eau. Sous-bois frais, passages aménagés, points de vue sur l'océan et les îlets — et de vraies chances d'apercevoir paresseux à trois doigts, tamarins et iguanes.

C'est LA rando d'initiation de l'île de Cayenne, faisable avec des enfants habitués à marcher.`,
    category: 'NATURE',
    tags: ['rando', 'famille', 'lacs', 'paresseux'],
    latitude: 4.8877,
    longitude: -52.2585,
    citySlug: 'remire-montjoly',
    startPoint: 'Parking du sentier, route de Rémire (PK 7)',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 150,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: 'Passages glissants après la pluie — bonnes chaussures et eau. Départ avant 9h pour la fraîcheur et les animaux.',
    isFree: true,
  },
  {
    slug: 'ilet-la-mere',
    name: 'Îlet la Mère',
    tagline: "À 40 minutes de bateau du Dégrad-des-Cannes, l'îlet aux saïmiris curieux et aux sentiers face à l'océan.",
    description: `Ancienne léproserie puis annexe du bagne, l'îlet la Mère est aujourd'hui un site du Conservatoire du littoral peuplé d'une colonie de saïmiris (singes-écureuils) peu farouches. Deux sentiers en boucle font le tour de l'île entre vestiges, cocotiers et rochers de bord de mer.

Traversée en navette depuis la marina du Dégrad-des-Cannes, journée pique-nique idéale avec des enfants.`,
    category: 'NATURE',
    tags: ['îlet', 'saïmiris', 'pique-nique', 'famille'],
    latitude: 4.892,
    longitude: -52.1844,
    citySlug: 'remire-montjoly',
    startPoint: 'Marina du Dégrad-des-Cannes (navettes)',
    accessModes: ['BOAT'],
    durationMinutes: 300,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "Ni eau potable ni vente sur place : emporte pique-nique et eau. Ne nourris pas les saïmiris, ils se servent tout seuls dans les sacs ouverts.",
    priceMinCents: 3000,
    priceMaxCents: 4000,
    bookingRequired: true,
  },
  {
    slug: 'chutes-voltaire',
    name: 'Chutes Voltaire',
    tagline: "73 km de piste puis 1h de layon pour se baigner au pied des chutes mythiques de l'Ouest guyanais.",
    description: `Les chutes Voltaire dévalent une série de gradins rocheux au cœur de la forêt, au bout de la piste Paul-Isnard. Après le parking de l'auberge, un sentier de ~3,3 km longe la crique jusqu'aux vasques où l'on se baigne dans une eau ambrée.

L'aventure, c'est la piste elle-même : 73 km de latérite depuis Saint-Laurent, ponts de bois et bourbiers selon la saison.`,
    category: 'ADVENTURE',
    tags: ['cascade', 'piste', 'baignade', '4x4'],
    latitude: 5.05199,
    longitude: -54.08963,
    citySlug: 'saint-laurent-du-maroni',
    startPoint: "Piste Paul-Isnard PK 73 (parking de l'auberge), puis sentier 3,3 km",
    accessModes: ['FOUR_WHEEL_DRIVE', 'WALK'],
    durationMinutes: 480,
    difficulty: 'MODERATE',
    seasons: ['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON'],
    accessNote: "Piste Paul-Isnard : 4x4 obligatoire, souvent impraticable après de fortes pluies. Fais le plein à Saint-Laurent et préviens quelqu'un de ton itinéraire.",
    isFree: true,
  },
  {
    slug: 'saul',
    name: 'Saül et ses sentiers',
    tagline: "Le village du bout du monde, accessible uniquement en avion, au départ de dizaines de km de sentiers balisés.",
    description: `Enclavé au centre exact de la Guyane, Saül (une centaine d'habitants) n'est relié au littoral que par les airs. Autour du bourg et de son église en bois, un réseau de sentiers entretenus — Belvédère, Roche Bateau, Gros Arbres, Monts La Fumée — plonge dans une forêt primaire exceptionnelle, porte d'entrée du Parc amazonien.

On y reste deux jours minimum : gîtes et carbets au village, ravitaillement limité à l'épicerie locale.`,
    category: 'NATURE',
    tags: ['rando', 'forêt primaire', 'insolite', 'parc amazonien'],
    latitude: 3.6219,
    longitude: -53.2042,
    citySlug: 'saul',
    startPoint: 'Aérodrome de Saül (vols quotidiens depuis Cayenne-Matoury)',
    accessModes: ['PLANE'],
    durationMinutes: 2880,
    difficulty: 'MODERATE',
    seasons: ['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON'],
    accessNote: "Vol ~50 min depuis Cayenne (petits porteurs vite complets, réserve tôt). Aucune route n'arrive à Saül — pas de distributeur ni de réseau fiable.",
    isFree: true,
  },
  {
    slug: 'centre-amerindien-kalawachi',
    name: 'Centre amérindien Kalawachi',
    tagline: 'Six peuples autochtones transmettent leurs savoirs dans ce village reconstitué au bord de la crique Passoura.',
    description: `Sur 3 hectares en bordure de crique, l'association Kalawachi (Kali'na, Arawak, Wayana, Palikur, Teko, Wayampi) a reconstitué carbets et habitats traditionnels pour faire vivre les cultures amérindiennes de Guyane : artisanat, cachiri, contes, danses et cuisine traditionnelle.

Visites et journées découvertes sur réservation, souvent couplées à une baignade en crique — une immersion culturelle rare à 10 minutes de Kourou.`,
    category: 'CULTURE',
    tags: ['amérindien', 'artisanat', 'famille', 'carbet'],
    latitude: 5.1318,
    longitude: -52.6452,
    citySlug: 'kourou',
    startPoint: 'Route du Dégrad Saramaka, PK 3,5 (Kourou)',
    accessModes: ['CAR'],
    durationMinutes: 180,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    priceMinCents: 1500,
    priceMaxCents: 4500,
    bookingRequired: true,
  },
  {
    slug: 'bagne-des-annamites',
    name: 'Bagne des Annamites',
    tagline: 'Dans la forêt de Montsinéry, les vestiges émouvants du camp des prisonniers indochinois, crique de baignade au bout.',
    description: `De 1931 à 1946, le camp Crique Anguille détint plus de 500 prisonniers indochinois condamnés aux travaux forcés. Un sentier sur caillebotis (~5 km aller-retour) mène aux vestiges envahis par la forêt — cases, cachots, four à pain — avec des panneaux qui racontent cette histoire méconnue.

La balade se termine à la crique Anguille, parfaite pour se rafraîchir avant le retour.`,
    category: 'HERITAGE',
    tags: ['bagne', 'rando', 'histoire', 'baignade'],
    latitude: 4.82587,
    longitude: -52.51642,
    citySlug: 'montsinery-tonnegrande',
    startPoint: 'Parking du sentier, PK 14,5 de la D5 (route de Tonnégrande)',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 150,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: 'Caillebotis glissants après la pluie, anti-moustiques indispensable. Maillot conseillé pour la crique Anguille.',
    isFree: true,
  },
  {
    slug: 'zoo-de-guyane',
    name: 'Zoo de Guyane',
    tagline: "450 animaux guyanais qu'on ne croise (presque) jamais en forêt, et une passerelle dans la canopée.",
    description: `Jaguars, tapirs, loutres géantes, singes atèles, harpie féroce : le zoo-refuge de Macouria présente 75 espèces exclusivement guyanaises dans un parc ombragé de 6 hectares, dont beaucoup d'animaux saisis ou recueillis. Le parcours de canopée sur passerelles suspendues offre un point de vue unique sur les enclos.

Prévois une demi-journée, en fin d'après-midi pour les nourrissages — poussettes OK sur la majorité du circuit.`,
    category: 'FAMILY',
    tags: ['famille', 'animaux', 'canopée', 'poussette'],
    latitude: 4.948,
    longitude: -52.4923,
    citySlug: 'macouria',
    address: 'CD5 PK 29, route du Gallion, Macouria',
    accessModes: ['CAR'],
    durationMinutes: 180,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    priceMinCents: 1050,
    priceMaxCents: 1700,
    phone: '05 94 31 73 06',
    website: 'https://www.zoodeguyane.com',
    openingHours: OPEN_DAILY_ZOO,
  },
  {
    slug: 'crique-gabrielle',
    name: 'Crique Gabrielle',
    tagline: "Balade en pirogue sur l'eau noire entre les fromagers, pontons de baignade et carbets, à 40 min de Cayenne.",
    description: `Affluent de la rivière Oyak, la crique Gabrielle est la sortie pirogue classique des familles de l'île de Cayenne : embarquement au pont de Roura ou au village Dacca, remontée de l'eau sombre sous la voûte forestière, arrêt baignade aux pontons et repas au carbet.

Une immersion amazonienne accessible à tous, sans marche d'approche — parfaite première crique.`,
    category: 'NAUTICAL',
    tags: ['pirogue', 'baignade', 'famille', 'carbet'],
    latitude: 4.7195,
    longitude: -52.333,
    citySlug: 'roura',
    startPoint: 'Embarcadère du pont de Roura ou village Dacca (départs pirogue)',
    accessModes: ['CAR', 'PIROGUE'],
    durationMinutes: 180,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "Courant et niveau d'eau hauts en pleine saison des pluies — les sorties partent surtout le matin.",
    priceMinCents: 2900,
    priceMaxCents: 4400,
    bookingRequired: true,
  },
]

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
