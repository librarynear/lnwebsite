import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Serif } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NextTopLoader from 'nextjs-toploader';
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const headingFont = IBM_Plex_Serif({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.focusdesk.in'),
  title: {
    template: "%s | FocusDesk",
    default: "FocusDesk | Book Premium Study Libraries Near You",
  },
  description: "Find and book premium study libraries starting at ₹500/mo. Compare seats, amenities & ratings on FocusDesk — India's study space platform.",
  openGraph: {
    title: "FocusDesk | Book Premium Study Libraries",
    description: "Find and book premium study libraries starting at ₹500/mo. Compare seats, amenities & ratings on FocusDesk.",
    url: "https://www.focusdesk.in",
    siteName: "FocusDesk",
    images: [
      {
        url: "https://ik.imagekit.io/focusdesk/logo.png",
        width: 1200,
        height: 630,
        alt: "FocusDesk - Book Study Libraries",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FocusDesk | Book Premium Study Libraries",
    description: "Find and book premium study libraries starting at ₹500/mo. Compare seats, amenities & ratings on FocusDesk.",
    images: ["https://ik.imagekit.io/focusdesk/logo.png"],
  },
  icons: {
    icon: "https://ik.imagekit.io/focusdesk/logo.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakartaSans.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <NextTopLoader color="hsl(var(--primary))" showSpinner={false} />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
