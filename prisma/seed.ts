// =============================================================================
// PÉYI - Script de seed (données de référence)
// =============================================================================
// Usage : npx prisma db seed
// =============================================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Péyi database...')

  // ===========================================================================
  // 1. COMMUNES DE GUYANE (toutes les 22 communes officielles)
  // ===========================================================================
  
  const cities = [
    { name: 'Cayenne', slug: 'cayenne', postcode: '97300', latitude: 4.9227, longitude: -52.3269 },
    { name: 'Matoury', slug: 'matoury', postcode: '97351', latitude: 4.8513, longitude: -52.3275 },
    { name: 'Rémire-Montjoly', slug: 'remire-montjoly', postcode: '97354', latitude: 4.8951, longitude: -52.2713 },
    { name: 'Kourou', slug: 'kourou', postcode: '97310', latitude: 5.1595, longitude: -52.6503 },
    { name: 'Saint-Laurent-du-Maroni', slug: 'saint-laurent-du-maroni', postcode: '97320', latitude: 5.5018, longitude: -54.0280 },
    { name: 'Macouria', slug: 'macouria', postcode: '97355', latitude: 4.9797, longitude: -52.4275 },
    { name: 'Roura', slug: 'roura', postcode: '97311', latitude: 4.7264, longitude: -52.3411 },
    { name: 'Mana', slug: 'mana', postcode: '97360', latitude: 5.6615, longitude: -53.7839 },
    { name: 'Saint-Georges', slug: 'saint-georges', postcode: '97313', latitude: 3.8934, longitude: -51.8050 },
    { name: 'Montsinéry-Tonnegrande', slug: 'montsinery-tonnegrande', postcode: '97356', latitude: 4.8878, longitude: -52.5150 },
    { name: 'Iracoubo', slug: 'iracoubo', postcode: '97350', latitude: 5.4807, longitude: -53.2009 },
    { name: 'Sinnamary', slug: 'sinnamary', postcode: '97315', latitude: 5.3816, longitude: -52.9516 },
    { name: 'Apatou', slug: 'apatou', postcode: '97317', latitude: 5.1681, longitude: -54.3483 },
    { name: 'Grand-Santi', slug: 'grand-santi', postcode: '97340', latitude: 4.2577, longitude: -54.3794 },
    { name: 'Papaïchton', slug: 'papaichton', postcode: '97316', latitude: 3.9953, longitude: -54.1796 },
    { name: 'Maripasoula', slug: 'maripasoula', postcode: '97370', latitude: 3.6400, longitude: -54.0275 },
    { name: 'Régina', slug: 'regina', postcode: '97390', latitude: 4.3125, longitude: -52.1350 },
    { name: 'Awala-Yalimapo', slug: 'awala-yalimapo', postcode: '97319', latitude: 5.7425, longitude: -53.9289 },
    { name: 'Ouanary', slug: 'ouanary', postcode: '97380', latitude: 4.2528, longitude: -51.6639 },
    { name: 'Saül', slug: 'saul', postcode: '97314', latitude: 3.6219, longitude: -53.2050 },
    { name: 'Camopi', slug: 'camopi', postcode: '97330', latitude: 3.1694, longitude: -52.3272 },
    { name: 'Saint-Élie', slug: 'saint-elie', postcode: '97312', latitude: 4.8178, longitude: -53.2775 },
  ]

  for (const city of cities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: city,
    })
  }
  console.log(`✅ ${cities.length} communes créées`)

  // ===========================================================================
  // 2. CATÉGORIES BONS PLANS
  // ===========================================================================
  
  const dealCategories = [
    { name: 'Supermarché & Alimentation', slug: 'supermarche-alimentation', icon: '🛒', color: '#FF6B35', type: 'DEAL' as const, sortOrder: 1 },
    { name: 'Tech & Multimédia', slug: 'tech-multimedia', icon: '📱', color: '#3B82F6', type: 'DEAL' as const, sortOrder: 2 },
    { name: 'Mode & Beauté', slug: 'mode-beaute', icon: '👗', color: '#EC4899', type: 'DEAL' as const, sortOrder: 3 },
    { name: 'Maison & Électroménager', slug: 'maison-electromenager', icon: '🏠', color: '#8B5CF6', type: 'DEAL' as const, sortOrder: 4 },
    { name: 'Auto & Moto', slug: 'auto-moto-deals', icon: '🚗', color: '#EF4444', type: 'DEAL' as const, sortOrder: 5 },
    { name: 'Voyages & Vols', slug: 'voyages-vols', icon: '✈️', color: '#06B6D4', type: 'DEAL' as const, sortOrder: 6 },
    { name: 'Restos & Sorties', slug: 'restos-sorties', icon: '🍽️', color: '#F59E0B', type: 'DEAL' as const, sortOrder: 7 },
    { name: 'Enfants & Bébé', slug: 'enfants-bebe', icon: '👶', color: '#84CC16', type: 'DEAL' as const, sortOrder: 8 },
    { name: 'Sport & Loisirs', slug: 'sport-loisirs', icon: '⚽', color: '#10B981', type: 'DEAL' as const, sortOrder: 9 },
    { name: 'Bricolage & Jardin', slug: 'bricolage-jardin', icon: '🔨', color: '#78716C', type: 'DEAL' as const, sortOrder: 10 },
    { name: 'Arrivages & Conteneurs', slug: 'arrivages-conteneurs', icon: '📦', color: '#D97706', type: 'DEAL' as const, sortOrder: 11 },
    { name: 'Gratuit & Échantillons', slug: 'gratuit-echantillons', icon: '🎁', color: '#14B8A6', type: 'DEAL' as const, sortOrder: 12 },
  ]

  for (const cat of dealCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }
  console.log(`✅ ${dealCategories.length} catégories Bons Plans créées`)

  // ===========================================================================
  // 3. CATÉGORIES PETITES ANNONCES
  // ===========================================================================
  
  const listingCategories = [
    { name: 'Véhicules', slug: 'vehicules', icon: '🚗', color: '#EF4444', type: 'LISTING' as const, sortOrder: 1 },
    { name: 'Immobilier', slug: 'immobilier', icon: '🏠', color: '#8B5CF6', type: 'LISTING' as const, sortOrder: 2 },
    { name: 'Emploi & Services', slug: 'emploi-services', icon: '💼', color: '#1E40AF', type: 'LISTING' as const, sortOrder: 3 },
    { name: 'Multimédia & Tech', slug: 'multimedia-tech', icon: '📱', color: '#3B82F6', type: 'LISTING' as const, sortOrder: 4 },
    { name: 'Maison & Mobilier', slug: 'maison-mobilier', icon: '🛋️', color: '#A16207', type: 'LISTING' as const, sortOrder: 5 },
    { name: 'Mode & Vide-dressing', slug: 'mode-vide-dressing', icon: '👕', color: '#EC4899', type: 'LISTING' as const, sortOrder: 6 },
    { name: 'Loisirs & Sport', slug: 'loisirs-sport', icon: '⚽', color: '#10B981', type: 'LISTING' as const, sortOrder: 7 },
    { name: 'Animaux', slug: 'animaux', icon: '🐕', color: '#D97706', type: 'LISTING' as const, sortOrder: 8 },
    { name: 'Covoiturage', slug: 'covoiturage', icon: '🚙', color: '#06B6D4', type: 'LISTING' as const, sortOrder: 9 },
    { name: 'Perdu & Trouvé', slug: 'perdu-trouve', icon: '❓', color: '#6B7280', type: 'LISTING' as const, sortOrder: 10 },
    { name: 'Matériel Pro / BTP', slug: 'materiel-pro-btp', icon: '🚜', color: '#F59E0B', type: 'LISTING' as const, sortOrder: 11 },
    { name: 'Autres', slug: 'autres', icon: '📦', color: '#6B7280', type: 'LISTING' as const, sortOrder: 99 },
  ]

  for (const cat of listingCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }
  console.log(`✅ ${listingCategories.length} catégories Petites Annonces créées`)

  // ===========================================================================
  // 4. SOUS-CATÉGORIES VÉHICULES (exemple de hiérarchie)
  // ===========================================================================
  
  const vehiclesParent = await prisma.category.findUnique({ where: { slug: 'vehicules' } })
  if (vehiclesParent) {
    const vehicleSubcats = [
      { name: 'Voitures', slug: 'voitures', icon: '🚗' },
      { name: 'Motos & Scooters', slug: 'motos-scooters', icon: '🏍️' },
      { name: 'Quads & Buggy', slug: 'quads-buggy', icon: '🏎️' },
      { name: 'Utilitaires & 4x4', slug: 'utilitaires-4x4', icon: '🚙' },
      { name: 'Pirogues & Bateaux', slug: 'pirogues-bateaux', icon: '🛶' },
      { name: 'Vélos', slug: 'velos', icon: '🚴' },
      { name: 'Pièces & Accessoires', slug: 'pieces-accessoires-vehicules', icon: '🔧' },
    ]
    for (const sub of vehicleSubcats) {
      await prisma.category.upsert({
        where: { slug: sub.slug },
        update: {},
        create: { ...sub, type: 'LISTING', parentId: vehiclesParent.id },
      })
    }
    console.log(`✅ ${vehicleSubcats.length} sous-catégories Véhicules créées`)
  }

  // ===========================================================================
  // 5. SOUS-CATÉGORIES IMMOBILIER
  // ===========================================================================
  
  const realEstateParent = await prisma.category.findUnique({ where: { slug: 'immobilier' } })
  if (realEstateParent) {
    const realEstateSubcats = [
      { name: 'Vente - Appartement', slug: 'vente-appartement', icon: '🏢' },
      { name: 'Vente - Maison', slug: 'vente-maison', icon: '🏠' },
      { name: 'Vente - Terrain', slug: 'vente-terrain', icon: '🌳' },
      { name: 'Location - Appartement', slug: 'location-appartement', icon: '🏢' },
      { name: 'Location - Maison', slug: 'location-maison', icon: '🏠' },
      { name: 'Colocation', slug: 'colocation', icon: '👥' },
      { name: 'Location saisonnière', slug: 'location-saisonniere', icon: '🏖️' },
      { name: 'Bureau & Local commercial', slug: 'bureau-local-commercial', icon: '🏪' },
    ]
    for (const sub of realEstateSubcats) {
      await prisma.category.upsert({
        where: { slug: sub.slug },
        update: {},
        create: { ...sub, type: 'LISTING', parentId: realEstateParent.id },
      })
    }
    console.log(`✅ ${realEstateSubcats.length} sous-catégories Immobilier créées`)
  }

  // ===========================================================================
  // 6. MAGASINS PRINCIPAUX DE GUYANE
  // ===========================================================================
  
  const cayenne = await prisma.city.findUnique({ where: { slug: 'cayenne' } })
  const matoury = await prisma.city.findUnique({ where: { slug: 'matoury' } })
  const kourou = await prisma.city.findUnique({ where: { slug: 'kourou' } })
  const remire = await prisma.city.findUnique({ where: { slug: 'remire-montjoly' } })
  const saintLaurent = await prisma.city.findUnique({ where: { slug: 'saint-laurent-du-maroni' } })

  const stores = [
    // Grande distribution Matoury — anchor de Family Plaza (Zone Terca)
    { name: 'Carrefour Matoury', slug: 'carrefour-matoury', cityId: matoury?.id, isVerified: true },
    { name: 'Leader Price Matoury', slug: 'leader-price-matoury', cityId: matoury?.id, isVerified: true },

    // Grande distribution Cayenne — Hyper U Collery + Géant (ex-Cora rebrandé 2025)
    { name: 'Hyper U Cayenne', slug: 'hyper-u-cayenne', cityId: cayenne?.id, isVerified: true },
    { name: 'Géant Cayenne', slug: 'geant-cayenne', cityId: cayenne?.id, isVerified: true },
    { name: 'Leader Price Cayenne', slug: 'leader-price-cayenne', cityId: cayenne?.id, isVerified: true },

    // Rémire-Montjoly
    { name: 'Super U Rémire', slug: 'super-u-remire', cityId: remire?.id, isVerified: true },
    { name: 'Carrefour Market Rémire-Montjoly', slug: 'carrefour-market-remire-montjoly', cityId: remire?.id, isVerified: true },

    // Kourou
    { name: 'Super U Kourou', slug: 'super-u-kourou', cityId: kourou?.id, isVerified: true },
    { name: 'Leader Price Kourou', slug: 'leader-price-kourou', cityId: kourou?.id, isVerified: true },

    // Saint-Laurent
    { name: 'Super U Saint-Laurent', slug: 'super-u-saint-laurent', cityId: saintLaurent?.id, isVerified: true },

    // Bricolage & équipement
    { name: 'Mr Bricolage Cayenne', slug: 'mr-bricolage-cayenne', cityId: cayenne?.id, isVerified: true },
    { name: 'Bricorama Cayenne', slug: 'bricorama-cayenne', cityId: cayenne?.id, isVerified: true },
    { name: 'Weldom Matoury', slug: 'weldom-matoury', cityId: matoury?.id, isVerified: true },
    { name: 'Weldom Cayenne', slug: 'weldom-cayenne', cityId: cayenne?.id, isVerified: true },

    // Tech & Multimédia — Fnac Cayenne + Darty Matoury (Family Plaza)
    { name: 'Darty Matoury', slug: 'darty-matoury', cityId: matoury?.id, isVerified: true },
    { name: 'Fnac Cayenne', slug: 'fnac-cayenne', cityId: cayenne?.id, isVerified: true },

    // Discount & Arrivages
    { name: 'Destock Guyane', slug: 'destock-guyane', cityId: matoury?.id, isVerified: true },
    { name: 'Guyane Discount', slug: 'guyane-discount', cityId: cayenne?.id, isVerified: true },
    { name: 'Cash & Carry Cayenne', slug: 'cash-carry-cayenne', cityId: cayenne?.id, isVerified: true },
  ]

  for (const store of stores) {
    if (store.cityId) {
      await prisma.store.upsert({
        where: { slug: store.slug },
        update: {},
        create: store as any,
      })
    }
  }
  console.log(`✅ ${stores.length} magasins créés`)

  // ===========================================================================
  // 7. MARCHANDS EN LIGNE (affiliation)
  // ===========================================================================
  
  const merchants = [
    { name: 'Amazon', slug: 'amazon', domain: 'amazon.fr', affiliateProgram: 'amazon_partners', commissionRate: 4.0 },
    { name: 'Cdiscount', slug: 'cdiscount', domain: 'cdiscount.com', affiliateProgram: 'awin', commissionRate: 5.0 },
    { name: 'Fnac', slug: 'fnac', domain: 'fnac.com', affiliateProgram: 'awin', commissionRate: 3.0 },
    { name: 'Darty', slug: 'darty', domain: 'darty.com', affiliateProgram: 'awin', commissionRate: 3.0 },
    { name: 'Rue du Commerce', slug: 'rue-du-commerce', domain: 'rueducommerce.fr', affiliateProgram: 'awin', commissionRate: 4.0 },
    { name: 'Air Caraïbes', slug: 'air-caraibes', domain: 'aircaraibes.com', affiliateProgram: 'awin', commissionRate: 1.5 },
    { name: 'Air France', slug: 'air-france', domain: 'airfrance.fr', affiliateProgram: 'awin', commissionRate: 1.0 },
    { name: 'French Bee', slug: 'french-bee', domain: 'frenchbee.com', affiliateProgram: 'awin', commissionRate: 1.5 },
    { name: 'Booking', slug: 'booking', domain: 'booking.com', affiliateProgram: 'booking_partner', commissionRate: 25.0 },
    { name: 'La Redoute', slug: 'la-redoute', domain: 'laredoute.fr', affiliateProgram: 'awin', commissionRate: 6.0 },
    { name: 'Zalando', slug: 'zalando', domain: 'zalando.fr', affiliateProgram: 'awin', commissionRate: 8.0 },
    { name: 'AliExpress', slug: 'aliexpress', domain: 'aliexpress.com', affiliateProgram: 'awin', commissionRate: 5.0 },
  ]

  for (const merchant of merchants) {
    await prisma.merchant.upsert({
      where: { slug: merchant.slug },
      update: {},
      create: merchant,
    })
  }
  console.log(`✅ ${merchants.length} marchands créés`)

  // ===========================================================================
  // 8. PLANS PRO (abonnements)
  // ===========================================================================
  
  const proPlans = [
    // Pour petites annonces
    {
      name: 'Pro S',
      slug: 'pro-s',
      type: 'LISTING_PRO' as const,
      priceMonthly: 39,
      priceYearly: 390,
      maxListings: 10,
      hasAnalytics: false,
      hasLogo: true,
      hasBadge: true,
    },
    {
      name: 'Pro M',
      slug: 'pro-m',
      type: 'LISTING_PRO' as const,
      priceMonthly: 99,
      priceYearly: 990,
      maxListings: 30,
      hasAnalytics: true,
      hasFeaturedPosts: 8,
      hasLogo: true,
      hasBadge: true,
    },
    {
      name: 'Pro L',
      slug: 'pro-l',
      type: 'LISTING_PRO' as const,
      priceMonthly: 249,
      priceYearly: 2490,
      maxListings: null, // illimité
      hasAnalytics: true,
      hasFeaturedPosts: 30,
      hasDedicatedManager: true,
      hasLogo: true,
      hasBadge: true,
    },
    // Pour sponsoring de bons plans
    {
      name: 'Découverte',
      slug: 'sponsor-decouverte',
      type: 'DEAL_SPONSOR' as const,
      priceMonthly: 49,
      priceYearly: 490,
      hasFeaturedPosts: 4,
      hasBadge: true,
    },
    {
      name: 'Visibilité',
      slug: 'sponsor-visibilite',
      type: 'DEAL_SPONSOR' as const,
      priceMonthly: 149,
      priceYearly: 1490,
      hasFeaturedPosts: 12,
      hasPushNotifications: true,
      hasLogo: true,
      hasBadge: true,
    },
    {
      name: 'Star',
      slug: 'sponsor-star',
      type: 'DEAL_SPONSOR' as const,
      priceMonthly: 349,
      priceYearly: 3490,
      hasFeaturedPosts: 999, // illimité
      hasPushNotifications: true,
      hasDedicatedManager: true,
      hasAnalytics: true,
      hasLogo: true,
      hasBadge: true,
    },
  ]

  for (const plan of proPlans) {
    await prisma.proPlan.upsert({
      where: { slug: plan.slug },
      update: {},
      create: plan as any,
    })
  }
  console.log(`✅ ${proPlans.length} plans Pro créés`)

  // ===========================================================================
  // 9. BADGES DE GAMIFICATION
  // ===========================================================================
  
  const badges = [
    { name: 'Premier deal', slug: 'first-deal', emoji: '🎉', description: 'Tu as posté ton premier bon plan !', requirement: { type: 'deal_count', threshold: 1 } },
    { name: 'Chasseur actif', slug: 'active-hunter', emoji: '🔥', description: 'Tu as posté 10 bons plans', requirement: { type: 'deal_count', threshold: 10 } },
    { name: 'Chasseur en or', slug: 'gold-hunter', emoji: '🏆', description: 'Tu as posté 50 bons plans', requirement: { type: 'deal_count', threshold: 50 } },
    { name: 'Deal viral', slug: 'viral-deal', emoji: '⚡', description: 'Un de tes deals a dépassé +500°', requirement: { type: 'deal_temperature', threshold: 500 } },
    { name: 'Explorateur', slug: 'explorer', emoji: '🗺️', description: 'Tu as posté dans 5 catégories différentes', requirement: { type: 'categories_count', threshold: 5 } },
    { name: 'Commentateur', slug: 'commentator', emoji: '💬', description: 'Tu as écrit 50 commentaires', requirement: { type: 'comment_count', threshold: 50 } },
    { name: 'Bon samaritain', slug: 'good-samaritan', emoji: '🛡️', description: 'Tu as signalé 10 arnaques confirmées', requirement: { type: 'valid_reports', threshold: 10 } },
    { name: 'Ambassadeur Péyi', slug: 'peyi-ambassador', emoji: '👑', description: 'Tu as atteint 5000 karma', requirement: { type: 'karma', threshold: 5000 } },
    { name: 'Fidèle', slug: 'loyal', emoji: '💎', description: '1 an d\'ancienneté sur Péyi', requirement: { type: 'days_since_signup', threshold: 365 } },
    { name: 'Pionnier', slug: 'pioneer', emoji: '🌱', description: 'Parmi les 100 premiers inscrits', requirement: { type: 'user_id_order', threshold: 100 } },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {},
      create: badge as any,
    })
  }
  console.log(`✅ ${badges.length} badges créés`)

  console.log('✨ Seed terminé avec succès !')
}

main()
  .catch((e) => {
    console.error('❌ Erreur de seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
