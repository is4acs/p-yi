import { getSiteUrl } from "@/lib/site-url";
import {
  buildSitemapIndexEntries,
  buildSitemapIndexXml,
} from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const base = getSiteUrl();
  const xml = buildSitemapIndexXml(buildSitemapIndexEntries(base));

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
