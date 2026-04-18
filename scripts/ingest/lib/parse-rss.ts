/**
 * Parser RSS/Atom minimaliste à base de regex. Suffisant pour les flux
 * WordPress/Drupal des sites d'info Guyane, qui sont les cibles
 * principales. Évite une dep externe (fast-xml-parser, rss-parser).
 *
 * Si un flux tombe en erreur, ajouter `fast-xml-parser` au package.json
 * et réécrire cette fonction autour.
 */

export type RssItem = {
  title: string;
  link?: string;
  guid?: string;
  description?: string;
  pubDate?: Date;
  imageUrl?: string;
};

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&ecirc;/g, "ê")
    .replace(/&ocirc;/g, "ô")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function pick(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? decode(m[1]).trim() : undefined;
}

function stripHtml(s: string): string {
  return decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function firstImageUrl(block: string): string | undefined {
  // <enclosure url="..."/> (standard RSS)
  const enc = block.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (enc) return enc[1];
  // <media:content url="..."/> (Yahoo Media RSS, WordPress)
  const media = block.match(/<media:(?:content|thumbnail)[^>]+url="([^"]+)"/i);
  if (media) return media[1];
  // <img src="..."> dans le description/content
  const img = block.match(/<img[^>]+src="([^"]+)"/i);
  if (img) return img[1];
  return undefined;
}

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  // Gère RSS 2.0 (<item>) et Atom (<entry>)
  const blockRe = /<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi;
  const blocks = xml.match(blockRe) ?? [];

  for (const block of blocks) {
    const title = pick(block, "title");
    if (!title) continue;

    // RSS : <link>http://...</link>
    // Atom : <link href="..." ...>
    let link = pick(block, "link");
    if (!link) {
      const atomLink = block.match(/<link[^>]+href="([^"]+)"/i);
      if (atomLink) link = atomLink[1];
    }

    const guid = pick(block, "guid") ?? pick(block, "id") ?? link ?? title;
    const descriptionRaw =
      pick(block, "description") ??
      pick(block, "content:encoded") ??
      pick(block, "summary") ??
      pick(block, "content");
    const pubDateStr =
      pick(block, "pubDate") ??
      pick(block, "published") ??
      pick(block, "updated");

    const pubDate = pubDateStr ? new Date(pubDateStr) : undefined;

    items.push({
      title: stripHtml(title),
      link,
      guid,
      description: descriptionRaw ? stripHtml(descriptionRaw) : undefined,
      pubDate: pubDate && !isNaN(pubDate.getTime()) ? pubDate : undefined,
      imageUrl: firstImageUrl(block),
    });
  }

  return items;
}
