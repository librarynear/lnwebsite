import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Serif } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
  title: "FocusDesk | Find Your Perfect Study Space",
  description: "Reserve quiet library spaces, choose your setup, and focus without interruptions.",
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
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
