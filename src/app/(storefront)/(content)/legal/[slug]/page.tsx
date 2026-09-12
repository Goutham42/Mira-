import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LEGAL_PAGES, getLegalPage } from '@/config/legal';
import { siteConfig } from '@/config/site';

type Params = { slug: string };

// Policy content is static and known at build time.
export function generateStaticParams() {
  return LEGAL_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getLegalPage(slug);
  if (!page) return { title: 'Not found' };

  return {
    title: page.title,
    description: page.summary,
    alternates: { canonical: `/legal/${page.slug}` },
  };
}

export default async function LegalPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = getLegalPage(slug);
  if (!page) notFound();

  const updated = new Intl.DateTimeFormat(siteConfig.locale, {
    dateStyle: 'long',
  }).format(new Date(page.updated));

  return (
    <article>
      <h1 className="text-4xl">{page.title}</h1>
      <p className="mt-3 text-muted-foreground">{page.summary}</p>
      <p className="mt-2 text-xs text-subtle-foreground">Last updated {updated}</p>

      <div className="mt-12 space-y-10">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-2xl">{section.heading}</h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph, index) => (
                <p key={index} className="leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
