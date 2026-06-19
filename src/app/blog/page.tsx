import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { IntentLink } from "@/components/intent-link";
import { client } from "@/sanity/lib/client";
import { urlForImage } from "@/sanity/lib/image";
import { HomeSearchShell } from "@/components/home-search-shell";

export const revalidate = 60; // Revalidate every minute

async function getPosts() {
  const query = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    slug,
    mainImage,
    publishedAt,
    seoDescription
  }`;
  return client.fetch(query);
}

export const metadata = {
  title: "Blog — LibraryNear",
  description: "Read the latest tips, guides, and reviews about finding the best study spaces and libraries in Delhi.",
};

export default async function BlogIndexPage() {
  const posts = await getPosts();

  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={null}>
        <HomeSearchShell />
      </Suspense>

      <section className="bg-white border-b border-border/50">
        <div className="container mx-auto px-6 py-10 md:px-10 md:py-14">
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-black md:text-4xl">
            LibraryNear Blog
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Guides, tips, and insights on finding the perfect study space in Delhi.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-6 md:px-10 py-10 pb-20">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No blog posts found.</p>
            <p className="text-sm mt-2">Check back soon for new content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post: any) => (
              <IntentLink
                key={post._id}
                href={`/blog/${post.slug.current}`}
                className="group flex flex-col gap-3"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted border border-border/40">
                  {post.mainImage ? (
                    <Image
                      src={urlForImage(post.mainImage)?.url() || ""}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                      No Image
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {post.publishedAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  <h2 className="text-lg font-bold text-black group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.seoDescription && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.seoDescription}
                    </p>
                  )}
                </div>
              </IntentLink>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
