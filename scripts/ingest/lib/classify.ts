/**
 * Classification à base de keywords : à partir du titre + description,
 * on déduit la catégorie (parmi les 12 slugs Péyi) et la ville Guyane
 * si mentionnée. Volontairement simple : si le signal est faible, on
 * retombe sur "supermarche-alimentation" qui est la catégorie fourre-tout
 * pour les promos quotidiennes Guyane.
 *
 * Les slugs listés ici DOIVENT exister dans `prisma/seed.ts` (dealCategories).
 */

const CATEGORY_KEYWORDS: Array<{ slug: string; keywords: RegExp[] }> = [
  {
    slug: "tech-multimedia",
    keywords: [
      /iphone|samsung|xiaomi|galaxy|pixel|huawei/i,
      /ps5|xbox|switch|console|gaming|manette/i,
      /casque|écouteurs|airpods|bluetooth|enceinte\s*(bluetooth|connect)/i,
      /tv\b|télé\b|4k|oled|qled|smart\s*tv/i,
      /laptop|ordinateur|pc\s*portable|macbook|tablette|ipad/i,
      /apple\s*watch|montre\s*connect/i,
    ],
  },
  {
    slug: "voyages-vols",
    keywords: [
      /vol\s+(aller|retour|cayenne|paris|fort[\s-]de[\s-]france)/i,
      /air\s*france|air\s*caraibes|french\s*bee|corsair/i,
      /billet\s+d'?avion|aller[\s-]retour/i,
      /h[oô]tel|s[eé]jour|airbnb|booking/i,
    ],
  },
  {
    slug: "enfants-bebe",
    keywords: [
      /couche[s]?\s+(pampers|bébé)/i,
      /b[eé]b[eé]|nourisson/i,
      /pouss?ette|si[eè]ge[\s-]auto|chaise[\s-]haute/i,
      /biberon|lait\s+infant/i,
      /jouet|peluche|lego|playmobil/i,
    ],
  },
  {
    slug: "maison-electromenager",
    keywords: [
      /aspirateur|dyson|rowenta|bosch/i,
      /machine\s+[aà]\s+(caf[eé]|laver)/i,
      /nespresso|dolce\s*gusto|senseo/i,
      /frigo|r[eé]frig[eé]rateur|cong[eé]lateur/i,
      /four|micro[\s-]ondes|plaque\s+(induction|vitro)/i,
      /ventilateur|climatiseur|clim\b/i,
      /canap[eé]|matelas|sommier|lit\b/i,
      /vaisselle|verre\b|assiette/i,
    ],
  },
  {
    slug: "sport-loisirs",
    keywords: [
      /running|course|jogging|nike|asics|adidas|decathlon/i,
      /fitness|muscu|salle\s+de\s+sport|abonnement\s+(fitness|salle)/i,
      /v[eé]lo|cycle|cycliste|vtt/i,
      /surf|plage|stand[\s-]up|paddle/i,
      /t[\s-]shirt|polo|short|jogging/i,
    ],
  },
  {
    slug: "bricolage-jardin",
    keywords: [
      /perceuse|visseuse|tourneviss|scie\b|ponceuse|meuleuse/i,
      /bricomarch[eé]|castorama|leroy\s*merlin|mr\s*bricolage|weldom/i,
      /tondeuse|tronçonneuse|d[eé]broussailleuse/i,
      /peinture|rouleau|pinceau/i,
      /planche|poutre|osb|contreplaqu[eé]|bois/i,
      /barbecue|bbq|plancha|weber/i,
      /jardin|terrasse|salon\s+de\s+jardin/i,
    ],
  },
  {
    slug: "mode-beaute",
    keywords: [
      /parfum|crème|creme|maquillage|mascara|rouge\s+à\s+lèvres/i,
      /shampoing|apr[eè]s[\s-]shampoing|soin\s+(cheveux|visage)/i,
      /bioderma|n[uy]xe|vichy|la\s+roche[\s-]posay/i,
      /robe|jean|pantalon|chemise|pull|veste/i,
      /sac\s+[aà]\s+main|sneakers?|baskets?|chaussures/i,
    ],
  },
  {
    slug: "restos-sorties",
    keywords: [
      /restau?rant|cin[eé]ma|bar\b|pizzeria|brasserie/i,
      /soir[eé]e|concert|spectacle|festival/i,
      /stage\s+(surf|danse|cuisine|yoga)/i,
      /brunch|d[eé]jeuner|dîner/i,
    ],
  },
  {
    slug: "auto-moto-deals",
    keywords: [
      /voiture|berline|suv\b|occasion|concession/i,
      /moto|scooter|quad|buggy/i,
      /pneu|batterie\s+voiture|vidange|entretien\s+auto/i,
      /clio|peugeot|renault|toyota|dacia|kia|hyundai|nissan/i,
    ],
  },
  {
    slug: "arrivages-conteneurs",
    keywords: [
      /arrivage|conteneur|container|d[eé]ballage/i,
      /d[eé]stockage|destock|lot\s+de\s+[0-9]/i,
    ],
  },
  {
    slug: "gratuit-echantillons",
    keywords: [
      /gratuit|offer[t]?|échantillon|sample/i,
      /cadeau\s+(offert|gratuit)/i,
      /code\s+promo\s+offert/i,
    ],
  },
  {
    slug: "supermarche-alimentation",
    keywords: [
      /carrefour|g[eé]ant|super\s*u|leader\s*price|cora|leclerc|casino/i,
      /huile|lait|p[aâ]tes|riz|farine|sucre|caf[eé]/i,
      /yaourt|fromage|beurre|œuf|oeuf/i,
      /promo\s+(alimentaire|rayon)/i,
      /lessive|produit\s+m[eé]nager/i,
    ],
  },
];

const CITY_KEYWORDS: Array<{ slug: string; keywords: RegExp[] }> = [
  { slug: "cayenne", keywords: [/\bcayenne\b/i] },
  { slug: "matoury", keywords: [/\bmatoury\b/i] },
  { slug: "kourou", keywords: [/\bkourou\b/i] },
  { slug: "remire-montjoly", keywords: [/\br[eé]mire(?:[\s-]montjoly)?\b/i] },
  {
    slug: "saint-laurent-du-maroni",
    keywords: [/\bsaint[\s-]laurent\b/i, /\bslm\b/i],
  },
  { slug: "macouria", keywords: [/\bmacouria\b/i, /\bsoula\b/i] },
  { slug: "sinnamary", keywords: [/\bsinnamary\b/i] },
  { slug: "mana", keywords: [/\bmana\b/i] },
];

const STORE_KEYWORDS: Array<{ slug: string; keywords: RegExp[] }> = [
  // Matoury — l'anchor Family Plaza est Carrefour (pas Géant, qui n'existe qu'à Cayenne)
  { slug: "carrefour-matoury", keywords: [/carrefour\s+matoury/i] },
  { slug: "leader-price-matoury", keywords: [/leader\s*price\s+matoury/i] },
  // Cayenne — Hyper U (Collery) + Géant (ex-Cora rebrandé 2025)
  { slug: "hyper-u-cayenne", keywords: [/(hyper|super)\s*u\s+cayenne/i] },
  { slug: "geant-cayenne", keywords: [/(g[eé]ant|cora)\s+(family\s+)?cayenne/i] },
  { slug: "leader-price-cayenne", keywords: [/leader\s*price\s+cayenne/i] },
  // Rémire-Montjoly
  { slug: "super-u-remire", keywords: [/super\s*u\s+r[eé]mire/i] },
  {
    slug: "carrefour-market-remire-montjoly",
    keywords: [/carrefour\s+(market|contact)\s+r[eé]mire/i],
  },
  // Kourou
  { slug: "super-u-kourou", keywords: [/super\s*u\s+kourou/i] },
  { slug: "leader-price-kourou", keywords: [/leader\s*price\s+kourou/i] },
  // Saint-Laurent
  { slug: "super-u-saint-laurent", keywords: [/super\s*u\s+saint[\s-]laurent/i] },
  // Tech & Multimédia
  { slug: "fnac-cayenne", keywords: [/fnac\s+cayenne/i] },
  { slug: "darty-matoury", keywords: [/darty\s+matoury/i] },
  // Bricolage
  { slug: "mr-bricolage-cayenne", keywords: [/mr\s*bricolage\s+cayenne/i] },
  { slug: "bricorama-cayenne", keywords: [/bricorama\s+cayenne/i] },
  { slug: "weldom-matoury", keywords: [/weldom\s+matoury/i] },
  { slug: "weldom-cayenne", keywords: [/weldom\s+cayenne/i] },
  // Discount
  { slug: "destock-guyane", keywords: [/destock\s+guyane/i] },
  { slug: "guyane-discount", keywords: [/guyane\s+discount/i] },
];

const MERCHANT_KEYWORDS: Array<{ slug: string; keywords: RegExp[] }> = [
  { slug: "amazon", keywords: [/amazon(?:\.fr)?/i] },
  { slug: "cdiscount", keywords: [/cdiscount/i] },
  { slug: "fnac", keywords: [/\bfnac\b/i] },
  { slug: "darty", keywords: [/\bdarty\b/i] },
  { slug: "la-redoute", keywords: [/la\s*redoute/i] },
  { slug: "zalando", keywords: [/zalando/i] },
  { slug: "aliexpress", keywords: [/aliexpress/i] },
  { slug: "air-france", keywords: [/air\s*france/i] },
  { slug: "air-caraibes", keywords: [/air\s*cara[iï]bes/i] },
  { slug: "french-bee", keywords: [/french\s*bee/i] },
  { slug: "booking", keywords: [/booking(?:\.com)?/i] },
];

function matchFirst(
  haystack: string,
  table: Array<{ slug: string; keywords: RegExp[] }>,
): string | undefined {
  for (const row of table) {
    if (row.keywords.some((re) => re.test(haystack))) return row.slug;
  }
  return undefined;
}

export function classifyCategory(text: string): string {
  return matchFirst(text, CATEGORY_KEYWORDS) ?? "supermarche-alimentation";
}

export function classifyCity(text: string): string | undefined {
  return matchFirst(text, CITY_KEYWORDS);
}

export function classifyStore(text: string): string | undefined {
  return matchFirst(text, STORE_KEYWORDS);
}

export function classifyMerchant(text: string, externalUrl?: string): string | undefined {
  const hay = `${text} ${externalUrl ?? ""}`;
  return matchFirst(hay, MERCHANT_KEYWORDS);
}

/**
 * Extrait prix + prix d'origine d'un titre/description type :
 *   "iPhone 15 à 799€ au lieu de 969€"
 *   "Barbecue 249€ (-30%)"
 *   "Couches x192 à 39,90€"
 * Renvoie { price, originalPrice } ou undefined si rien trouvé.
 */
export function extractPrices(
  text: string,
): { price: number; originalPrice?: number } | undefined {
  const priceRe = /(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?|eur\b)/gi;
  const prices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = priceRe.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(",", "."));
    if (n > 0 && n < 100_000) prices.push(n);
  }
  if (prices.length === 0) return undefined;
  if (prices.length === 1) return { price: prices[0] };

  // Plusieurs prix : le plus bas = prix actuel, le plus haut = prix d'origine
  // (règle qui marche pour "X à 50€ au lieu de 80€" et "-30% : 80€ → 50€")
  const sorted = [...prices].sort((a, b) => a - b);
  return { price: sorted[0], originalPrice: sorted[sorted.length - 1] };
}
