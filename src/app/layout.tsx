import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AuthSavedSync } from "@/components/auth/auth-saved-sync";
import { NavigationFeedback } from "@/components/navigation-feedback";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: {
    default: "LibraryNear — Find the Best Libraries Near You",
    template: "%s | LibraryNear",
  },
  description:
    "Discover and compare study libraries, reading rooms, and private coaching halls near you. Filter by locality, metro station, amenities, and fees.",
  metadataBase: new URL("https://LibraryNear.in"),
  openGraph: {
    type: "website",
    siteName: "LibraryNear",
    title: "LibraryNear — Find the Best Libraries Near You",
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
  icons: {
    icon: "/logo.png",
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
            <AuthSavedSync />
            <Suspense fallback={null}>
              <NavigationFeedback />
            </Suspense>
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
