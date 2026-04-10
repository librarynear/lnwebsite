import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: {
    default: "StudyStash — Find the Best Libraries Near You",
    template: "%s | StudyStash",
  },
  description:
    "Discover and compare study libraries, reading rooms, and private coaching halls near you. Filter by locality, metro station, amenities, and fees.",
  metadataBase: new URL("https://studystash.in"),
  openGraph: {
    type: "website",
    siteName: "StudyStash",
    title: "StudyStash — Find the Best Libraries Near You",
    description:
      "Discover and compare study libraries near you. Filter by locality, metro, amenities, and fees.",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans antialiased min-h-screen flex flex-col selection:bg-primary/20 selection:text-foreground"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PostHogProvider>
            <div className="flex relative flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 flex flex-col">
                <Suspense fallback={null}>{children}</Suspense>
              </main>
              <Footer />
            </div>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
