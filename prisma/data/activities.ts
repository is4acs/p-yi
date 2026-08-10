import type { Prisma } from "@prisma/client";
import type {
  AccessMode,
  ActivityCategory,
  Difficulty,
  Season,
} from "@prisma/client";

// =============================================================================
// PÉYI - Données de référence des activités (source unique)
// =============================================================================
// Consommé par deux producteurs qui doivent rester strictement alignés :
//   - prisma/seed-activites.ts        → upsert via Prisma (npm run db:seed-activites)
//   - scripts/generate-activities-sql.ts → génère supabase/activites.sql
// Toute modification ici se répercute donc automatiquement sur les deux.
// =============================================================================

// Sous-ensemble des 22 communes (mêmes données que prisma/seed.ts) upserté
// ici aussi pour que ce seed soit exécutable seul sur une base neuve.
export const CITIES = [
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
  { name: 'Matoury', slug: 'matoury', postcode: '97351', latitude: 4.8513, longitude: -52.3275 },
  { name: 'Sinnamary', slug: 'sinnamary', postcode: '97315', latitude: 5.3816, longitude: -52.9516 },
  { name: 'Iracoubo', slug: 'iracoubo', postcode: '97350', latitude: 5.4807, longitude: -53.2009 },
  { name: 'Saint-Georges', slug: 'saint-georges', postcode: '97313', latitude: 3.8934, longitude: -51.805 },
  { name: 'Maripasoula', slug: 'maripasoula', postcode: '97370', latitude: 3.64, longitude: -54.0275 },
]

export type ActivitySeed = {
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

const RAW_ACTIVITIES: ActivitySeed[] = [
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

  // ---------------------------------------------------------------------------
  // Deuxième vague : incontournables complémentaires, pour densifier la carte.
  // Coordonnées publiées (OSM / ONF / Conservatoire du littoral / réserves
  // naturelles) sauf mention « position approchée » dans le commentaire —
  // celles-là sont dérivées d'un point kilométrique documenté et se corrigent
  // en 10 s avec le sélecteur de position du back-office.
  // ---------------------------------------------------------------------------

  {
    slug: 'cascades-de-fourgassie',
    name: 'Cascades de Fourgassié',
    tagline: 'La cascade la plus accessible de Guyane : 15 minutes de marche depuis la piste, vasques et rochers plats pour la journée.',
    description: `À trois quarts d'heure de Cayenne, la crique Fourgassié dévale une succession de dalles rocheuses dans un décor de forêt. Un sentier aménagé de caillebotis et de passerelles mène aux chutes en un quart d'heure ; un second itinéraire longe la crique sur 45 minutes pour ceux qui veulent marcher un peu plus.

C'est le spot familial du week-end : rochers plats pour poser les affaires, vasques peu profondes, ombre permanente. Arrive tôt le dimanche, le parking se remplit vite.`,
    category: 'NATURE',
    tags: ['cascade', 'baignade', 'famille', 'gratuit'],
    latitude: 4.64443,
    longitude: -52.30028,
    citySlug: 'roura',
    startPoint: 'Piste de Fourgassié, ~12 km après le bourg de Roura sur la route de Kaw',
    accessModes: ['CAR', 'TRACK', 'WALK'],
    durationMinutes: 120,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: 'Les 3 derniers kilomètres se font sur une piste en bon état, praticable en voiture de tourisme par temps sec. Rochers glissants.',
    isFree: true,
  },
  {
    slug: 'reserve-naturelle-tresor',
    name: 'Réserve naturelle régionale Trésor',
    tagline: "Un sentier botanique sur caillebotis à flanc de montagne de Kaw, dans l'une des forêts les plus riches de Guyane.",
    description: `Sur les pentes de la montagne de Kaw, la réserve Trésor protège 2 500 hectares de forêt primaire. Son sentier botanique de 1,8 km, entièrement sécurisé et jalonné de panneaux, traverse plusieurs étages de végétation : bas-fonds humides, forêt de pente, crête. Un second sentier « carbone » de 1,4 km complète la visite.

L'un des rares endroits où l'on comprend concrètement ce qu'est la biodiversité amazonienne, sans matériel ni guide obligatoire.`,
    category: 'NATURE',
    tags: ['sentier', 'botanique', 'famille', 'gratuit', 'forêt primaire'],
    latitude: 4.61028,
    longitude: -52.27917,
    citySlug: 'roura',
    startPoint: 'PK 27,3 de la route de Kaw (D6), à ~18 km du bourg de Roura',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 120,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: 'Caillebotis glissants après la pluie. Route de Kaw sinueuse — prudence, surtout au retour de nuit.',
    isFree: true,
  },
  {
    slug: 'montagne-des-singes',
    name: 'Montagne des Singes',
    tagline: 'La rando classique de Kourou : une grande boucle en forêt jusqu’au sommet, avec de vraies chances de croiser des singes.',
    description: `À une douzaine de kilomètres au sud-ouest de Kourou, ce massif de 161 m culmine au-dessus de la savane. L'ONF y a aménagé deux parcours : un sentier botanique court (650 m) et la « grande boucle », 2 à 2h30 de marche en forêt avec quelques belles montées.

Sapajous et singes hurleurs se font entendre tôt le matin, et la vue depuis la crête porte jusqu'au Centre spatial.`,
    category: 'NATURE',
    tags: ['rando', 'singes', 'forêt', 'gratuit'],
    latitude: 5.07172,
    longitude: -52.69279,
    citySlug: 'kourou',
    startPoint: 'Parking du sentier, route du Dégrad Saramaka (PK 14-15) depuis la RN1',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 150,
    difficulty: 'MODERATE',
    seasons: ['ALL_YEAR'],
    accessNote: "Site privé du CNES géré par l'ONF : accès piéton libre, mais reste sur les sentiers balisés. Pars tôt pour la faune et la fraîcheur.",
    isFree: true,
  },
  {
    slug: 'saut-maripa',
    name: 'Saut Maripa',
    tagline: "Le plus spectaculaire saut de l'Oyapock, à la frontière brésilienne, remonté en pirogue depuis Saint-Georges.",
    description: `En amont de Saint-Georges, l'Oyapock se brise sur une barre rocheuse dans un fracas permanent : le saut Maripa marque la limite de remontée de la marée sur le fleuve. On l'atteint en pirogue depuis Saint-Georges (environ une heure), avec un débarquement à Pied-Saut puis 2 km de marche sur l'ancienne voie ferrée du bagne.

Un sentier botanique aménagé longe la rive gauche — la rive droite, c'est déjà le Brésil.`,
    category: 'NAUTICAL',
    tags: ['saut', 'pirogue', 'frontière', 'oyapock'],
    latitude: 3.9025,
    longitude: -51.8133,
    citySlug: 'saint-georges',
    startPoint: 'Dégrad de Saint-Georges (pirogue) ou entrée de piste sur la RN2',
    accessModes: ['PIROGUE', 'FOUR_WHEEL_DRIVE', 'WALK'],
    durationMinutes: 300,
    difficulty: 'MODERATE',
    seasons: ['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON'],
    accessNote: "Saut réputé dangereux : ne t'approche pas des rapides et pars avec un piroguier du coin. La piste d'accès (20 km) demande un 4x4, surtout en saison des pluies.",
    priceMinCents: 3500,
    priceMaxCents: 6000,
    bookingRequired: true,
  },
  {
    slug: 'ile-du-grand-connetable',
    name: 'Réserve naturelle de l’île du Grand-Connétable',
    tagline: "Un rocher au large de l'Approuague, seul site de nidification d'oiseaux marins entre l'Amazone et l'Orénoque.",
    description: `À 18 km au large de l'embouchure de l'Approuague, les îles du Grand et du Petit Connétable abritent des dizaines de milliers d'oiseaux marins : frégates superbes, sternes de Cayenne et royales, mouettes atricilles, noddis bruns. C'est le seul site de reproduction sur 2 000 km de côte.

Le débarquement est interdit, mais les sorties encadrées longent l'île au plus près — spectacle garanti, notamment en période de nidification.`,
    category: 'WILDLIFE',
    tags: ['oiseaux', 'bateau', 'réserve', 'insolite'],
    latitude: 4.82668,
    longitude: -51.94394,
    citySlug: 'regina',
    startPoint: "Sorties en mer encadrées depuis l'Approuague ou Cayenne",
    accessModes: ['BOAT'],
    durationMinutes: 480,
    difficulty: 'MODERATE',
    seasons: ['ALL_YEAR'],
    accessNote: "Débarquement interdit (réserve naturelle nationale). Sorties uniquement avec un opérateur agréé et selon l'état de la mer — prévois de quoi lutter contre le mal de mer.",
    priceMinCents: 9000,
    priceMaxCents: 15000,
    bookingRequired: true,
  },
  {
    slug: 'assister-a-un-lancement',
    name: 'Assister à un lancement depuis Kourou',
    tagline: 'Le sol qui tremble, la nuit qui devient jour : voir décoller Ariane 6 ou Vega, l’expérience guyanaise par excellence.',
    description: `Quelques fois par an, la Guyane retient son souffle. Depuis les sites d'observation du CNES (Toucan, Ibis, Agami, Colibri) ou depuis les points publics gratuits — plage de Kourou, bord de mer, colline de la Carapa — on assiste au décollage à quelques kilomètres du pas de tir.

Le grondement arrive plusieurs secondes après la lumière, et la trajectoire reste visible plusieurs minutes au-dessus de l'Atlantique. Cale ton séjour sur un lancement si tu peux : rien d'autre en Guyane ne produit cet effet.`,
    category: 'SPACE',
    tags: ['fusée', 'espace', 'incontournable', 'gratuit', 'famille'],
    latitude: 5.1595,
    longitude: -52.6503,
    citySlug: 'kourou',
    startPoint: 'Sites d’observation du CNES (sur inscription) ou points publics gratuits à Kourou',
    accessModes: ['CAR'],
    durationMinutes: 240,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "Calendrier des lancements souvent décalé à la dernière minute (météo, technique) : garde de la souplesse. Les sites CNES demandent une inscription préalable et une pièce d'identité ; les points publics de Kourou restent libres d'accès.",
    isFree: true,
    bookingRequired: true,
  },
  {
    slug: 'fort-ceperou',
    name: 'Fort Cépérou',
    tagline: "Le berceau de Cayenne : les vestiges du fort de 1643 et le plus beau point de vue sur la ville et l'estuaire.",
    description: `C'est ici que Cayenne est née, sur la colline dominant l'embouchure du fleuve. Le fort érigé en 1643 porte le nom d'un chef amérindien ; Vauban fortifia ensuite toute la ville, avant que les Portugais ne détruisent l'essentiel entre 1809 et 1817.

Il reste des pans de murs, un phare et surtout un panorama à 180° : le port, le Vieux Cayenne, la mer couleur latérite et, au sud-ouest, la rivière de Cayenne.`,
    category: 'HERITAGE',
    tags: ['histoire', 'panorama', 'gratuit', 'centre-ville'],
    latitude: 4.93763,
    longitude: -52.336843,
    citySlug: 'cayenne',
    address: 'Colline de Cépérou, au-dessus du port, Cayenne',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 45,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: 'Montée à pied depuis la place du Coq ou le port. Évite le site à la nuit tombée.',
    isFree: true,
  },
  {
    slug: 'mont-grand-matoury',
    name: 'Réserve naturelle du Mont Grand Matoury',
    tagline: 'La plus grande réserve périurbaine de France : 2 123 hectares de forêt primaire aux portes de Cayenne.',
    description: `Un morceau de forêt tropicale humide intact à vingt minutes de l'aéroport. Le sentier de Lamirande grimpe jusqu'au sommet (234 m) en traversant plusieurs types de forêt ; le sentier des Américains, boucle de 3 km, suit la vallée de la crique Tompic entre le Mont Grand Matoury et le Mont de la Désirée.

Idéal pour une demi-journée quand on n'a pas le temps de descendre sur Kaw ou Roura.`,
    category: 'NATURE',
    tags: ['rando', 'forêt primaire', 'gratuit', 'proche cayenne'],
    latitude: 4.8637,
    longitude: -52.3565,
    citySlug: 'matoury',
    startPoint: 'Sentier de Lamirande, accès depuis la RN2 (entre PROGT et la mairie de Matoury)',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 240,
    difficulty: 'MODERATE',
    seasons: ['ALL_YEAR'],
    accessNote: 'Montée raide et glissante après la pluie. Emporte 2 L d’eau : il n’y a aucun point d’eau sur le parcours.',
    isFree: true,
  },
  {
    slug: 'marche-de-cayenne',
    name: 'Marché de Cayenne',
    tagline: 'Bouillon d’awara, soupe chinoise, piments et paniers en arouman : le ventre de la Guyane sous une halle métallique.',
    description: `La halle du marché de Cayenne concentre tout le métissage guyanais : maraîchers hmong, épices créoles, poissons du littoral, plantes médicinales, artisanat amérindien et bushinengué, et les fameuses soupes vietnamiennes servies dès le petit matin.

Viens tôt et le ventre vide. C'est le meilleur endroit pour repartir avec du couac, du piment végétarien et de l'huile de carapa.`,
    category: 'GASTRONOMY',
    tags: ['marché', 'street food', 'artisanat', 'gratuit', 'centre-ville'],
    latitude: 4.9355,
    longitude: -52.3322,
    citySlug: 'cayenne',
    address: 'Halle du marché, centre-ville de Cayenne',
    accessModes: ['CAR'],
    durationMinutes: 90,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    isFree: true,
    openingHours: {
      wednesday: [['06:00', '13:00']],
      friday: [['06:00', '13:00']],
      saturday: [['06:00', '13:00']],
      exceptions: [
        'Horaires indicatifs — le marché est surtout animé les mercredi, vendredi et samedi matin.',
      ],
    },
  },
  {
    slug: 'place-des-palmistes',
    name: 'Place des Palmistes et Vieux Cayenne',
    tagline: 'Palmiers royaux, maisons créoles et terrasses : le cœur historique de Cayenne se visite à pied.',
    description: `La place des Palmistes et ses grands palmiers royaux forment le salon de Cayenne : marchands de glaces le soir, concerts, parties de dominos. Autour, le Vieux Cayenne aligne ses maisons créoles à balcons de bois, la préfecture (ancienne habitation jésuite), l'hôtel de ville et le musée départemental Alexandre-Franconie.

Une boucle d'une heure suffit pour en faire le tour — à combiner avec le marché et le fort Cépérou.`,
    category: 'CULTURE',
    tags: ['patrimoine', 'balade', 'gratuit', 'centre-ville', 'famille'],
    latitude: 4.9372,
    longitude: -52.3297,
    citySlug: 'cayenne',
    address: 'Place des Palmistes, Cayenne',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 60,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    isFree: true,
  },
  {
    slug: 'eglise-saint-joseph-iracoubo',
    name: 'Église Saint-Joseph d’Iracoubo',
    tagline: "L'intérieur entièrement peint par un bagnard : la plus étonnante église de Guyane, au bord de la RN1.",
    description: `Vue de l'extérieur, une modeste église de bourg. À l'intérieur, une explosion de couleurs : entre 1893 et 1898, le bagnard Pierre Huguet a couvert chaque centimètre de voûte, de mur et de colonne de motifs et de scènes religieuses, en échange de sa liberté.

Classée monument historique, elle se visite gratuitement et vaut largement l'arrêt sur la route de Saint-Laurent.`,
    category: 'HERITAGE',
    tags: ['bagne', 'patrimoine', 'gratuit', 'insolite'],
    latitude: 5.4807,
    longitude: -53.2009,
    citySlug: 'iracoubo',
    address: 'Bourg d’Iracoubo, en bordure de la RN1',
    accessModes: ['CAR'],
    durationMinutes: 45,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "Ouverture parfois irrégulière : demande la clé à la mairie ou au presbytère si l'église est fermée.",
    isFree: true,
  },
  {
    slug: 'saint-georges-de-l-oyapock',
    name: 'Saint-Georges-de-l’Oyapock et le pont frontière',
    tagline: 'Le bout de la RN2 : un bourg fluvial franco-brésilien, son marché et le pont qui enjambe l’Oyapock.',
    description: `Terminus de la route de l'Est, Saint-Georges vit au rythme du fleuve et de la frontière. On y traverse en pirogue vers Oiapoque côté brésilien en dix minutes, on y mange açaí et tapioca, et le pont binational — inauguré en 2017 — enjambe l'Oyapock quelques kilomètres en amont.

Point de départ des remontées vers le saut Maripa et les villages du haut Oyapock.`,
    category: 'CULTURE',
    tags: ['frontière', 'fleuve', 'brésil', 'marché'],
    latitude: 3.8934,
    longitude: -51.805,
    citySlug: 'saint-georges',
    startPoint: 'Bourg et dégrad de Saint-Georges, terminus de la RN2',
    accessModes: ['CAR', 'PIROGUE'],
    durationMinutes: 480,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "190 km de RN2 goudronnée depuis Cayenne (~3h). Passeport ou CNI obligatoire pour passer côté brésilien, et contrôles fréquents sur la route.",
    isFree: true,
  },
  {
    slug: 'maripasoula-haut-maroni',
    name: 'Maripasoula et le Haut-Maroni',
    tagline: 'La plus vaste commune de France, accessible en avion ou après deux jours de pirogue : la porte du pays wayana.',
    description: `Maripasoula, c'est 18 360 km² — la plus grande commune de France — et aucune route pour y arriver. On y vient en avion depuis Cayenne (1h) ou en remontant le Maroni en pirogue depuis Saint-Laurent, deux jours de sauts et de forêt.

Sur place : orpaillage légal, artisanat wayana et aluku, remontée vers les villages du Haut-Maroni et immersion dans une Guyane que la côte ne laisse pas soupçonner.`,
    category: 'ADVENTURE',
    tags: ['fleuve', 'insolite', 'wayana', 'avion', 'pirogue'],
    latitude: 3.64,
    longitude: -54.0275,
    citySlug: 'maripasoula',
    startPoint: 'Aérodrome de Maripasoula (vols depuis Cayenne) ou dégrad de Saint-Laurent en pirogue',
    accessModes: ['PLANE', 'PIROGUE'],
    durationMinutes: 4320,
    difficulty: 'HARD',
    seasons: ['ALL_YEAR'],
    accessNote: "Aucune route n'arrive à Maripasoula. Vols vite complets, distributeur unique et réseau capricieux : prévois du liquide et de la marge sur ton retour.",
    isFree: true,
  },
  {
    slug: 'descente-du-maroni-en-pirogue',
    name: 'Le Maroni en pirogue',
    tagline: 'Remonter le fleuve-frontière depuis Saint-Laurent, entre villages bushinengué, criques et sauts.',
    description: `Le Maroni est l'autoroute de l'Ouest guyanais. Depuis le dégrad de Saint-Laurent, les pirogues remontent vers Apatou, Grand-Santi et Papaïchton, en longeant les villages aluku et ndjuka installés sur les deux rives — la gauche, c'est le Suriname.

Les sorties à la journée combinent en général passage de sauts, arrêt baignade et déjeuner dans un village. C'est la manière la plus juste de comprendre l'Ouest.`,
    category: 'NAUTICAL',
    tags: ['pirogue', 'fleuve', 'bushinengué', 'frontière'],
    latitude: 5.506,
    longitude: -54.034,
    citySlug: 'saint-laurent-du-maroni',
    startPoint: 'Dégrad de Saint-Laurent-du-Maroni (départs pirogue)',
    accessModes: ['PIROGUE'],
    durationMinutes: 360,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "Niveau du fleuve très variable : en saison sèche, certains sauts se franchissent à pied à côté de la pirogue. Passage côté Suriname = sortie de territoire, prends une pièce d'identité.",
    priceMinCents: 3000,
    priceMaxCents: 8000,
    bookingRequired: true,
  },
  {
    slug: 'pripris-de-yiyi',
    name: 'Pripris de Yiyi et Maison de la Nature',
    tagline: '15 000 hectares de marais côtiers, un sentier sur pilotis et deux observatoires pour la faune.',
    description: `Entre Kourou et Sinnamary, les pripris de Yiyi étalent leurs prairies flottantes, îlots de palmiers et savanes marécageuses. Un sentier de 2,5 km sur caillebotis les traverse, avec deux observatoires pour guetter caïmans, ibis et hoccos. Deux itinéraires nautiques permettent aussi de s'y enfoncer en canoë.

À l'entrée, la Maison de la Nature abrite expositions, aquarium et vivarium — bonne mise en jambes pour les enfants.`,
    category: 'WILDLIFE',
    tags: ['marais', 'oiseaux', 'famille', 'gratuit', 'sentier'],
    // Position approchée : dérivée du PK 125 de la RN1 (~10 km de Sinnamary
    // en direction d'Iracoubo), aucune coordonnée publiée trouvée.
    latitude: 5.415,
    longitude: -53.0356,
    citySlug: 'sinnamary',
    startPoint: 'Maison de la Nature de Sinnamary, PK 125 de la RN1',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 120,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: 'Anti-moustiques indispensable, surtout en fin de journée. Le sentier est praticable toute l’année mais glissant après la pluie.',
    isFree: true,
    openingHours: {
      wednesday: [['09:00', '12:00'], ['13:30', '17:30']],
      saturday: [['09:00', '12:00'], ['13:30', '17:30']],
      sunday: [['09:00', '12:00'], ['13:30', '17:30']],
      exceptions: [
        'Horaires de la Maison de la Nature — le sentier reste accessible en dehors.',
      ],
    },
  },
  {
    slug: 'habitation-loyola',
    name: 'Habitation Loyola',
    tagline: "La plus grande plantation jésuite de Guyane, fouillée depuis 1994 : moulin, chapelle et mémoire de l'esclavage.",
    description: `Fondée en 1668 et exploitée par les jésuites jusqu'en 1769, Loyola couvrait plus de 1 000 hectares où travaillaient jusqu'à 500 personnes réduites en esclavage. Le site produisait la moitié du cacao et du café de la colonie.

Les fouilles ont dégagé la maison de maître, la chapelle et son cimetière, la forge, les magasins et un moulin à vent en pierre de taille. Le sentier est en accès libre ; les visites guidées, elles, racontent vraiment le site.`,
    category: 'HERITAGE',
    tags: ['histoire', 'esclavage', 'archéologie', 'gratuit'],
    // Position approchée : le site est à quelques centaines de mètres de la
    // route de Rémire (près de Guyane 1ère), aucune coordonnée publiée trouvée.
    latitude: 4.8853,
    longitude: -52.2806,
    citySlug: 'remire-montjoly',
    startPoint: 'Entrée du sentier sur la route du bourg de Rémire, à proximité de Guyane 1ère',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 90,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "Sentier en accès libre toute l'année. Visites guidées ponctuelles (Journées du patrimoine, campagnes de fouilles) — vérifie les dates avant de venir pour ça.",
    isFree: true,
  },
  {
    slug: 'sentier-molokoi',
    name: 'Sentier Molokoï',
    tagline: 'Le plus long itinéraire balisé de Guyane : 18 km et 560 m de dénivelé entre la RN2 et le village de Cacao.',
    description: `Le Molokoï relie l'Auberge des Orpailleurs, sur la route de l'Est, au village hmong de Cacao : 18 km de forêt primaire sur les flancs de la montagne Cacao, jusqu'à 376 m d'altitude. Onze kilomètres jusqu'au carbet de bivouac, sept ensuite pour redescendre sur Cacao.

Faisable en une journée si tu marches bien, mais la version deux jours avec nuit en hamac au carbet (point d'eau sur la crique Boulanger) est nettement plus belle.`,
    category: 'ADVENTURE',
    tags: ['rando', 'bivouac', 'forêt primaire', 'sportif', 'gratuit'],
    // Position approchée : extrémité Cacao du sentier ; l'autre départ se
    // trouve à l'Auberge des Orpailleurs sur la RN2.
    latitude: 4.572,
    longitude: -52.462,
    citySlug: 'roura',
    startPoint: 'Deux départs : Auberge des Orpailleurs (RN2) ou village de Cacao',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 600,
    difficulty: 'HARD',
    seasons: ['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON'],
    accessNote: "Itinéraire engagé : préviens quelqu'un, emporte hamac, moustiquaire et 3 L d'eau. Boueux et glissant en saison des pluies. Organise ta récupération à l'autre bout.",
    isFree: true,
  },
  {
    slug: 'plage-de-montjoly',
    name: 'Plage de Montjoly',
    tagline: 'La grande plage de l’île de Cayenne : cocotiers, coureurs au coucher du soleil et pontes de tortues en saison.',
    description: `Plusieurs kilomètres de sable bordés de cocotiers et de raisiniers, entre la pointe de Montjoly et la plage de Gosselin. C'est le rendez-vous de fin de journée de l'île de Cayenne : marche, footing, foot sur le sable, carbets à pique-nique.

D'avril à juillet, des tortues vertes et olivâtres viennent y pondre — les associations locales organisent des veilles encadrées. La baignade, elle, reste peu profonde et l'eau chargée de limon amazonien.`,
    category: 'FAMILY',
    tags: ['plage', 'famille', 'gratuit', 'tortues', 'coucher de soleil'],
    // Position approchée : la plage s'étire sur plusieurs kilomètres, le
    // point retenu correspond à sa partie centrale.
    latitude: 4.879,
    longitude: -52.252,
    citySlug: 'remire-montjoly',
    address: 'Front de mer de Montjoly, Rémire-Montjoly',
    accessModes: ['CAR', 'WALK'],
    durationMinutes: 180,
    difficulty: 'EASY',
    seasons: ['ALL_YEAR'],
    accessNote: "Baignade sans surveillance et eau turbide (limon de l'Amazone, c'est normal). En saison de ponte, pas de lampe blanche ni de flash sur la plage la nuit.",
    isFree: true,
  },
]

// =============================================================================
// Contacts & réservation
// =============================================================================
// Chaque fiche doit offrir un point de sortie vers « où réserver / qui
// contacter ». Deux niveaux, volontairement distincts :
//
//  1. CONTACTS ci-dessous : opérateur, institution ou gestionnaire OFFICIEL du
//     site, vérifié un par un. Aucun numéro ni URL n'est inventé — une donnée
//     de contact fausse est pire que pas de donnée du tout (on envoie les gens
//     appeler un inconnu). Ce qui n'a pas pu être vérifié n'est pas renseigné.
//
//  2. Fallback : le portail officiel du Comité du Tourisme de la Guyane, qui
//     référence les prestataires par site. C'est la bonne porte d'entrée pour
//     les sites naturels en accès libre, qui n'ont ni opérateur ni billetterie.
//
// Le back-office (/admin/activites) permet d'affiner fiche par fiche : c'est
// là qu'il faut saisir les opérateurs locaux au fil des partenariats.

const GUYANE_TOURISM_PORTAL = "https://www.guyane-amazonie.fr";

type ActivityContact = {
  website?: string;
  bookingUrl?: string;
  phone?: string;
};

const CONTACTS: Record<string, ActivityContact> = {
  "iles-du-salut": {
    // Promaritime — seule liaison quotidienne Kourou / île Royale.
    website: "https://www.promaritimeguyane.fr",
    bookingUrl: "https://www.promaritimeguyane.fr/billetterie",
    phone: "05 94 28 42 36",
  },
  "centre-spatial-guyanais": {
    website: "https://centrespatialguyanais.cnes.fr",
    phone: "05 94 33 77 77",
  },
  "assister-a-un-lancement": {
    website: "https://centrespatialguyanais.cnes.fr",
    phone: "05 94 33 77 77",
  },
  "camp-de-la-transportation": {
    // CIAP, géré par la ville de Saint-Laurent-du-Maroni.
    website:
      "https://www.saintlaurentdumaroni.fr/centre-interpretation-art-patrimoine/",
  },
  "marais-de-kaw": {
    // Plusieurs piroguiers agréés : le portail officiel les référence tous.
    website: "https://www.guyane-amazonie.fr/experience/nature/marais-kaw/",
  },
  "reserve-naturelle-tresor": {
    website: "https://reserves-naturelles.org/reserves/tresor/",
    phone: "05 94 38 12 89",
  },
  "ile-du-grand-connetable": {
    website: "https://www.reserve-connetable.com",
  },
  "habitation-loyola": {
    website: "https://habitationloyola.org",
  },
  "pripris-de-yiyi": {
    website: "https://www.ville-sinnamary.fr/mes-loisirs/maison-de-la-nature/",
    phone: "06 94 26 88 76",
  },
  "ilet-la-mere": {
    website: "https://iletlamere.tropicalizes.fr",
  },
  "crique-gabrielle": {
    website: "https://www.t-airnatureguyane.com/excursion/crique-gabriel/",
  },
  "centre-amerindien-kalawachi": {
    website: "https://www.facebook.com/centreamerindienkalawachi/",
  },
  "bagne-des-annamites": {
    website:
      "http://www.montsinery-tonnegrande.fr/culture-sport-et-loisirs/activites-culturelles-et-patrimoine/bagne-des-annamites/",
  },
};

/**
 * Activités enrichies de leur contact. Une valeur posée directement sur la
 * fiche (ex. le site et le téléphone du Zoo de Guyane) reste prioritaire ;
 * sinon on prend le contact vérifié, sinon le portail officiel.
 */
export const ACTIVITIES: ActivitySeed[] = RAW_ACTIVITIES.map((activity) => {
  const contact = CONTACTS[activity.slug] ?? {};
  return {
    ...activity,
    website: activity.website ?? contact.website ?? GUYANE_TOURISM_PORTAL,
    bookingUrl: activity.bookingUrl ?? contact.bookingUrl,
    phone: activity.phone ?? contact.phone,
  };
})
