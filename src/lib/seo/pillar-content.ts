import {
  CORE_CITIES,
  DEAL_CATEGORY_PILLARS,
  GUIDE_SLUGS,
  LISTING_CATEGORY_PILLARS,
  STORE_PILLARS,
  type ExploreLink,
  type FaqItem,
  type GuideSlug,
  type SeoCategory,
  type SeoCity,
  getDealsCategoryPath,
  getDealsCityPath,
  getListingsCategoryPath,
  getListingsCityPath,
} from "@/lib/seo/local-pages";

type GuideContent = {
  title: string;
  h1: string;
  description: string;
  intro: string;
  faq: FaqItem[];
  links: ExploreLink[];
};

const GUIDE_CONTENT: Record<GuideSlug, GuideContent> = {
  "bons-plans-guyane": {
    title: "Guide bons plans en Guyane",
    h1: "Guide pratique des bons plans en Guyane",
    description:
      "Nos méthodes locales pour repérer les promos vraiment utiles en Guyane, comparer les enseignes et éviter les fausses bonnes affaires.",
    intro:
      "Trouver un bon plan en Guyane demande une approche locale. Les stocks varient vite, certaines offres ne sont valables qu’en magasin et les bons rayons ne sont pas toujours les mêmes entre Cayenne, Matoury et Kourou. Dans ce guide, on te donne une méthode simple: vérifier la date de publication, comparer le prix avec l’ancien prix affiché, contrôler la commune et repérer les enseignes qui publient régulièrement. L’objectif est clair: gagner du temps, acheter au bon moment et éviter les déplacements inutiles. Tu trouveras aussi des liens directs vers les pages bons plans par ville et par catégorie pour filtrer rapidement ce qui t’intéresse vraiment.",
    faq: [
      {
        question: "Comment savoir si un bon plan est encore valable en Guyane ?",
        answer:
          "Vérifie la date de publication, la date d’expiration si elle est affichée, puis regarde la commune et l’enseigne. Sur Péyi, les offres les plus fraîches remontent en priorité.",
      },
      {
        question: "Quelle page consulter en premier pour les promos locales ?",
        answer:
          "Commence par la page Bons plans Guyane, puis affine par ville (Cayenne, Matoury, Kourou, Rémire-Montjoly, Saint-Laurent-du-Maroni) ou par catégorie selon ton besoin.",
      },
    ],
    links: [
      { href: "/bons-plans/guyane", label: "Voir tous les bons plans en Guyane" },
      { href: "/bons-plans/cayenne", label: "Voir les bons plans à Cayenne" },
      {
        href: "/bons-plans/supermarche-alimentation/guyane",
        label: "Voir les promos supermarché en Guyane",
      },
    ],
  },
  "petites-annonces-guyane": {
    title: "Guide petites annonces Guyane",
    h1: "Guide des petites annonces en Guyane",
    description:
      "Les réflexes à adopter pour acheter ou vendre en Guyane via des annonces claires, localisées et fiables.",
    intro:
      "Pour bien utiliser les petites annonces en Guyane, le plus important est la précision locale. Une annonce utile indique une commune claire, un prix réaliste, des photos nettes et une description qui répond aux questions avant même le premier message. Côté acheteur, commence par filtrer par ville puis par catégorie, et compare plusieurs annonces proches avant de te déplacer. Côté vendeur, un titre précis et des informations concrètes réduisent les échanges inutiles et accélèrent la vente. Ce guide te donne une méthode simple pour publier mieux, négocier proprement et trouver plus vite ce qui te convient dans le contexte guyanais.",
    faq: [
      {
        question: "Comment améliorer la visibilité de mon annonce en Guyane ?",
        answer:
          "Utilise un titre précis, des photos récentes, un prix cohérent avec le marché local et une description complète. Mentionne la commune et, si utile, le quartier.",
      },
      {
        question: "Quelle est la meilleure façon de rechercher une annonce locale ?",
        answer:
          "Commence par la page Annonces Guyane, puis filtre par ville et catégorie. Tu trouveras plus rapidement des résultats pertinents que sur une recherche trop large.",
      },
    ],
    links: [
      { href: "/annonces/guyane", label: "Voir toutes les annonces en Guyane" },
      { href: "/annonces/voitures/guyane", label: "Voir les annonces voiture en Guyane" },
      { href: "/annonces/immobilier/guyane", label: "Voir les annonces immobilier en Guyane" },
    ],
  },
  "vendre-sa-voiture-en-guyane": {
    title: "Vendre sa voiture en Guyane : guide local",
    h1: "Vendre sa voiture en Guyane: méthode locale efficace",
    description:
      "Un plan d’action concret pour publier une annonce voiture crédible en Guyane et vendre plus vite au bon prix.",
    intro:
      "En Guyane, une annonce voiture performante repose sur trois piliers: transparence, preuves visuelles et informations utiles dès la première lecture. Indique clairement le kilométrage, l’année, le carburant, l’état général et l’historique d’entretien disponible. Ajoute des photos prises en plein jour, avec l’extérieur, l’intérieur et les points sensibles. Pour le prix, compare des véhicules proches en version, motorisation et commune afin d’éviter d’être hors marché. Un bon descriptif réduit les messages répétitifs et attire des contacts plus qualifiés. Avec cette méthode, tu augmentes tes chances de vendre rapidement sans brader.",
    faq: [
      {
        question: "Quelles informations sont indispensables dans une annonce voiture ?",
        answer:
          "Le modèle exact, l’année, le kilométrage, le carburant, le prix, l’état et les éventuels frais à prévoir. Plus l’annonce est claire, plus les contacts sont sérieux.",
      },
      {
        question: "Faut-il inclure beaucoup de photos ?",
        answer:
          "Oui. Des photos nettes et variées inspirent confiance et évitent de perdre du temps avec des demandes basiques. Montre aussi les éventuels défauts de façon honnête.",
      },
    ],
    links: [
      { href: "/annonces/voitures/guyane", label: "Voir les annonces voiture en Guyane" },
      { href: "/annonces/cayenne", label: "Voir les annonces à Cayenne" },
      { href: "/annonces/kourou", label: "Voir les annonces à Kourou" },
    ],
  },
  "trouver-un-appartement-en-guyane": {
    title: "Trouver un appartement en Guyane : guide local",
    h1: "Trouver un appartement en Guyane sans perdre de temps",
    description:
      "Une méthode locale pour repérer les annonces de location appartement en Guyane et sélectionner rapidement les options sérieuses.",
    intro:
      "La recherche d’appartement en Guyane peut aller vite si tu filtres correctement dès le départ. Commence par la commune, puis affine sur la surface, le nombre de pièces et le budget mensuel réel. Lis les annonces en détail: une bonne fiche précise les caractéristiques essentielles, montre des photos exploitables et indique les conditions de location sans ambiguïté. Prépare un dossier prêt à envoyer pour sécuriser les biens intéressants rapidement. En combinant filtre local, comparaison des annonces similaires et messages clairs, tu limites les visites inutiles et tu augmentes tes chances de trouver un logement adapté.",
    faq: [
      {
        question: "Quelle est la première étape pour chercher un appartement ?",
        answer:
          "Définis une commune cible et une fourchette de budget réaliste, puis filtre les annonces sur ces deux critères avant d’ouvrir les fiches en détail.",
      },
      {
        question: "Comment repérer une annonce de location sérieuse ?",
        answer:
          "Regarde la clarté du descriptif, la cohérence des photos, la présence des caractéristiques principales et la réactivité du contact. Une annonce complète réduit les zones floues.",
      },
    ],
    links: [
      {
        href: "/annonces/location-appartement/guyane",
        label: "Voir les locations d’appartement en Guyane",
      },
      { href: "/annonces/remire-montjoly", label: "Voir les annonces à Rémire-Montjoly" },
      {
        href: "/annonces/saint-laurent-du-maroni",
        label: "Voir les annonces à Saint-Laurent-du-Maroni",
      },
    ],
  },
};

export function getGuideContent(slug: GuideSlug): GuideContent {
  return GUIDE_CONTENT[slug];
}

export function getGuideStaticParams(): Array<{ slug: GuideSlug }> {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export function buildDealsGlobalIntro(): string {
  return "Cette page regroupe les bons plans actifs en Guyane avec une vue locale claire: promos alimentaires, tech, maison et autres offres utiles publiées par la communauté. Tu y trouves des offres vérifiables, classées pour te faire gagner du temps avant de te déplacer. L’objectif est simple: centraliser les meilleures opportunités du territoire, de Cayenne à Saint-Laurent-du-Maroni, avec des liens directs vers les pages par ville, par catégorie et par enseigne quand le volume le justifie. Pense à consulter régulièrement la page: les disponibilités évoluent vite et les bonnes affaires locales partent souvent dans les premières heures.";
}

export function buildDealsCityIntro(city: SeoCity): string {
  return `Tu consultes les bons plans liés à ${city.name}, avec un focus local utile pour comparer rapidement les offres publiées dans la zone. Cette page met en avant les promos et réductions réellement pertinentes pour les habitants de ${city.name} et des communes proches, avec des liens vers les grandes catégories recherchées en Guyane. L’objectif est de te permettre de vérifier en quelques minutes ce qui vaut le déplacement: prix affiché, fraîcheur des publications, enseigne et contexte local. Si tu veux élargir, tu peux explorer la page Guyane complète ou naviguer par catégorie pour cibler un besoin précis.`;
}

export function buildDealsCategoryIntro(category: SeoCategory): string {
  return `Cette page rassemble les bons plans ${category.name.toLowerCase()} en Guyane, avec des offres triées pour privilégier l’utile et le local. Tu y retrouves des promotions publiées par la communauté Péyi, avec un contexte clair sur la commune ou l’enseigne quand l’information est disponible. C’est la bonne entrée si tu veux surveiller une thématique précise sans parcourir tout le flux. Consulte régulièrement cette catégorie: les meilleures opportunités peuvent changer vite selon les arrivages, les catalogues locaux et les périodes promotionnelles.`;
}

export function buildListingsGlobalIntro(): string {
  return "Cette page centralise les petites annonces actives en Guyane: voitures, immobilier, location appartement, multimédia, emploi-services et autres catégories utiles du quotidien. L’approche est locale et pratique: chaque annonce est reliée à une commune, avec un contenu qui aide à évaluer rapidement la pertinence avant de contacter le vendeur. Tu peux ensuite naviguer vers les pages par ville ou par catégorie pour affiner ta recherche, éviter le bruit et trouver plus vite ce qui te convient dans le contexte guyanais.";
}

export function buildListingsCityIntro(city: SeoCity): string {
  return `Tu es sur la page des annonces à ${city.name}. L’objectif est de te donner une vue locale claire des biens et services disponibles dans la commune et autour, sans mélange inutile avec tout le territoire. Tu peux parcourir les annonces récentes, puis affiner vers les catégories les plus utiles comme voitures, immobilier ou multimédia. Cette approche te permet de comparer rapidement les offres proches, de réduire les déplacements non pertinents et de contacter les vendeurs avec de meilleures chances de conclure.`;
}

export function buildListingsCategoryIntro(category: SeoCategory): string {
  return `Cette page regroupe les annonces ${category.name.toLowerCase()} en Guyane pour t’aider à comparer facilement les offres sur une même thématique. Tu y trouves des annonces locales avec des informations concrètes: prix, commune, caractéristiques clés et contexte de publication. C’est l’entrée la plus efficace si tu as déjà un besoin précis. Pour aller plus loin, utilise les liens de navigation vers les villes prioritaires et les catégories connexes afin de repérer rapidement les meilleures opportunités.`;
}

export function buildStoreIntro(storeName: string, cityName: string): string {
  return `Cette page suit les promos publiées pour ${storeName}, avec un ancrage local sur ${cityName}. Tu y retrouves les bons plans disponibles ou récemment partagés autour de cette enseigne, avec des informations utiles pour décider rapidement: niveau de remise, catégorie concernée et fraîcheur de l’offre. L’objectif est d’avoir une vue claire des opportunités liées à ${storeName} sans devoir parcourir tout le flux général. Si nécessaire, tu peux élargir vers les pages bons plans par ville ou par catégorie.`;
}

export function buildDealsFaq(label: string): FaqItem[] {
  return [
    {
      question: `Comment trouver rapidement les meilleurs bons plans ${label} ?`,
      answer:
        "Commence par les offres les plus récentes, compare les prix affichés et vérifie la commune ou l’enseigne. Les liens de navigation t’aident ensuite à élargir ou affiner selon ton besoin.",
    },
    {
      question: "Les offres affichées sont-elles locales ?",
      answer:
        "Oui, la logique de page privilégie la pertinence Guyane avec des informations de ville, de catégorie et d’enseigne quand elles sont disponibles sur la publication.",
    },
  ];
}

export function buildListingsFaq(label: string): FaqItem[] {
  return [
    {
      question: `Comment filtrer efficacement les annonces ${label} ?`,
      answer:
        "Commence par la ville ou la catégorie principale, puis compare les annonces proches sur le prix et les caractéristiques. Cette méthode évite les résultats trop larges.",
    },
    {
      question: "Pourquoi certaines annonces remontent en priorité ?",
      answer:
        "Les annonces actives et récentes sont mises en avant pour améliorer la fraîcheur de la page et faciliter la découverte d’offres encore disponibles.",
    },
  ];
}

export function buildDealsGlobalExploreLinks(): ExploreLink[] {
  return [
    ...CORE_CITIES.map((city) => ({
      href: getDealsCityPath(city.slug),
      label: `Voir les bons plans à ${city.name}`,
    })),
    ...DEAL_CATEGORY_PILLARS.map((category) => ({
      href: getDealsCategoryPath(category.slug),
      label: `Voir les bons plans ${category.name.toLowerCase()} en Guyane`,
    })),
  ];
}

export function buildListingsGlobalExploreLinks(): ExploreLink[] {
  return [
    ...CORE_CITIES.map((city) => ({
      href: getListingsCityPath(city.slug),
      label: `Voir les annonces à ${city.name}`,
    })),
    ...LISTING_CATEGORY_PILLARS.map((category) => ({
      href: getListingsCategoryPath(category.slug),
      label: `Voir les annonces ${category.name.toLowerCase()} en Guyane`,
    })),
  ];
}

export function buildDealsCityExploreLinks(city: SeoCity): ExploreLink[] {
  return [
    { href: "/bons-plans/guyane", label: "Voir tous les bons plans en Guyane" },
    ...DEAL_CATEGORY_PILLARS.map((category) => ({
      href: getDealsCategoryPath(category.slug),
      label: `Voir les bons plans ${category.name.toLowerCase()} en Guyane`,
      description: `Comparer avec les offres de ${city.name}`,
    })),
  ];
}

export function buildListingsCityExploreLinks(city: SeoCity): ExploreLink[] {
  return [
    { href: "/annonces/guyane", label: "Voir toutes les annonces en Guyane" },
    ...LISTING_CATEGORY_PILLARS.map((category) => ({
      href: getListingsCategoryPath(category.slug),
      label: `Voir les annonces ${category.name.toLowerCase()} en Guyane`,
      description: `Comparer avec les annonces à ${city.name}`,
    })),
  ];
}

export function buildDealsCategoryExploreLinks(category: SeoCategory): ExploreLink[] {
  return [
    { href: "/bons-plans/guyane", label: "Voir tous les bons plans en Guyane" },
    ...CORE_CITIES.map((city) => ({
      href: getDealsCityPath(city.slug),
      label: `Voir les bons plans à ${city.name}`,
      description: `${category.name} et autres catégories locales`,
    })),
  ];
}

export function buildListingsCategoryExploreLinks(
  category: SeoCategory,
): ExploreLink[] {
  return [
    { href: "/annonces/guyane", label: "Voir toutes les annonces en Guyane" },
    ...CORE_CITIES.map((city) => ({
      href: getListingsCityPath(city.slug),
      label: `Voir les annonces à ${city.name}`,
      description: `${category.name} et catégories connexes`,
    })),
  ];
}

export function buildStoreExploreLinks(storeSlug: string): ExploreLink[] {
  const store = STORE_PILLARS.find((entry) => entry.slug === storeSlug);
  if (!store) {
    return [{ href: "/bons-plans/guyane", label: "Voir les bons plans en Guyane" }];
  }
  const city = CORE_CITIES.find((entry) => entry.slug === store.citySlug);
  const cityName = city?.name ?? "la commune";

  return [
    {
      href: getDealsCityPath(store.citySlug),
      label: `Voir les bons plans à ${cityName}`,
    },
    {
      href: "/bons-plans/supermarche-alimentation/guyane",
      label: "Voir les promos supermarché en Guyane",
    },
    { href: "/bons-plans/guyane", label: "Voir tous les bons plans en Guyane" },
  ];
}

export function buildStoreFaq(storeName: string): FaqItem[] {
  return [
    {
      question: `Comment suivre les promos chez ${storeName} ?`,
      answer:
        "Consulte régulièrement cette page enseigne: elle regroupe les bons plans publiés pour ce magasin et te permet de voir rapidement les offres encore pertinentes.",
    },
    {
      question: "Pourquoi certaines promos d’enseigne n’apparaissent pas ?",
      answer:
        "Seules les offres réellement publiées et exploitables sont listées. Une promo absente peut être expirée, non vérifiable ou pas encore partagée.",
    },
  ];
}
