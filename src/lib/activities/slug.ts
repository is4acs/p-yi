export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    // \p{M} = marques combinantes (accents décomposés par NFD).
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Base de slug d'une activité. Contrairement aux deals/annonces (suffixe
 * aléatoire), les fiches activités sont éditoriales et peu nombreuses :
 * on vise des slugs SEO propres ("iles-du-salut"). L'unicité est garantie
 * par l'appelant (server action) qui suffixe -2, -3… en cas de collision.
 */
export function makeActivitySlugBase(name: string): string {
  return slugify(name) || "activite";
}
