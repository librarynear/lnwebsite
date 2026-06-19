import Image from "next/image";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { Suspense } from "react";
import { HomeSearchShell } from "@/components/home-search-shell";
import { client } from "@/sanity/lib/client";
import { urlForImage } from "@/sanity/lib/image";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 60; // Revalidate every minute

async function getPost(slug: string) {
  const query = `*[_type == "post" && slug.current == $slug][0] {
    title,
    mainImage,
    publishedAt,
    seoDescription,
    body
  }`;
  return client.fetch(query, { slug });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  const siteUrl = getSiteUrl();
  const imageUrl = post.mainImage ? urlForImage(post.mainImage)?.width(1200).height(630).url() : `${siteUrl}/og-default.png`;

  return {
    title: `${post.title} — LibraryNear Blog`,
    description: post.seoDescription || `Read ${post.title} on LibraryNear.`,
    openGraph: {
      title: post.title,
      description: post.seoDescription,
      type: "article",
      publishedTime: post.publishedAt,
      url: `${siteUrl}/blog/${slug}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.seoDescription,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${siteUrl}/blog/${slug}`,
    },
  };
}

const portableTextComponents = {
  types: {
    image: ({ value }: any) => {
      if (!value?.asset?._ref) return null;
      return (
        <div className="relative w-full aspect-video my-8 rounded-xl overflow-hidden bg-muted border border-border/50">
          <Image
            src={urlForImage(value)?.url() || ""}
            alt={value.alt || "Blog image"}
            fill
            className="object-cover"
          />
        </div>
      );
    },
  },
  block: {
    h1: ({ children }: any) => <h1 className="text-3xl font-bold mt-10 mb-4 text-black">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-2xl font-bold mt-10 mb-4 text-black">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-xl font-bold mt-8 mb-3 text-black">{children}</h3>,
    normal: ({ children }: any) => <p className="text-base leading-relaxed mb-6 text-slate-700">{children}</p>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-6 text-slate-600 bg-slate-50 py-3 pr-4 rounded-r-lg">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-700">{children}</ul>,
    number: ({ children }: any) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-slate-700">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }: any) => <li>{children}</li>,
    number: ({ children }: any) => <li>{children}</li>,
  },
  marks: {
    link: ({ children, value }: any) => {
      const rel = !value.href.startsWith("/") ? "noreferrer noopener" : undefined;
      return (
        <a href={value.href} rel={rel} className="text-primary hover:underline font-medium">
          {children}
        </a>
      );
    },
  },
};

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    image: post.mainImage ? [urlForImage(post.mainImage)?.url()] : [],
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: [{
      "@type": "Organization",
      name: "LibraryNear",
      url: siteUrl,
    }],
    publisher: {
      "@type": "Organization",
      name: "LibraryNear",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
      },
    },
    description: post.seoDescription,
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Suspense fallback={null}>
        <HomeSearchShell />
      </Suspense>

      <article className="container mx-auto px-6 md:px-10 py-10 md:py-16 max-w-4xl">
        <header className="mb-10 text-center">
          {post.publishedAt && (
            <p className="text-sm font-medium text-primary mb-3">
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-black mb-6 leading-tight">
            {post.title}
          </h1>
          {post.seoDescription && (
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto">
              {post.seoDescription}
            </p>
          )}
        </header>

        {post.mainImage && (
          <div className="relative w-full aspect-[21/9] md:aspect-[2/1] rounded-2xl overflow-hidden bg-muted mb-12 shadow-sm border border-border/40">
            <Image
              src={urlForImage(post.mainImage)?.url() || ""}
              alt={post.title}
              fill
              priority
              className="object-cover"
            />
          </div>
        )}

        <div className="prose prose-lg prose-slate max-w-none">
          {post.body ? (
            <PortableText value={post.body} components={portableTextComponents} />
          ) : (
            <p className="text-slate-500 text-center italic">No content available.</p>
          )}
        </div>
      </article>
    </div>
  );
}
