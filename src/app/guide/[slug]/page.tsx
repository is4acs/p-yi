import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExplorerAlso, SeoFaq, SeoIntro } from "@/components/seo/SeoBlocks";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import {
  getGuideContent,
  getGuideStaticParams,
} from "@/lib/seo/pillar-content";
import { isGuideSlug, type GuideSlug } from "@/lib/seo/local-pages";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuideStaticParams();
}

function assertGuideSlug(slug: string): GuideSlug {
  if (!isGuideSlug(slug)) {
    notFound();
  }
  return slug;
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const slug = assertGuideSlug(params.slug);
  const guide = getGuideContent(slug);

  return buildSeoMetadata({
    title: guide.title,
    description: guide.description,
    canonical: `/guide/${slug}`,
    type: "article",
  });
}

export default async function GuidePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const slug = assertGuideSlug(params.slug);
  const guide = getGuideContent(slug);

  const jsonLdChunks = [
    buildCollectionPageJsonLd({
      name: guide.h1,
      description: guide.intro,
      path: `/guide/${slug}`,
    }),
    buildBreadcrumbJsonLd([
      { name: "Accueil", url: "/" },
      { name: "Guide", url: "/guide/bons-plans-guyane" },
      { name: guide.h1, url: `/guide/${slug}` },
    ]),
  ];

  const faqJsonLd = buildFaqJsonLd(guide.faq);
  if (faqJsonLd) {
    jsonLdChunks.push(faqJsonLd);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-14 pt-6 animate-in fade-in duration-300 sm:pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdChunks) }}
      />

      <SeoIntro h1={guide.h1} intro={guide.intro} eyebrow="Guides locaux Guyane" />

      <section className="mt-5 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          Ce que tu vas trouver dans ce guide
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
          <li>Une méthode locale applicable immédiatement.</li>
          <li>Des conseils orientés Guyane, sans blabla générique.</li>
          <li>Des liens directs vers les pages transactionnelles utiles.</li>
        </ul>

        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700"
          >
            Retour à l’accueil Péyi
          </Link>
        </div>
      </section>

      <div className="mt-5 space-y-5">
        <ExplorerAlso links={guide.links} />
        <SeoFaq items={guide.faq} />
      </div>
    </main>
  );
}
