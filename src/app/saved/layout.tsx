import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Libraries",
  description: "View your saved libraries on LibraryNear.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SavedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
