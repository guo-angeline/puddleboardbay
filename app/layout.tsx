import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://sup-spots.vercel.app";
const TITLE = "PuddleboardBay: Paddleboard Spots in the SF Bay Area";
const DESCRIPTION =
  "Find the best stand-up paddleboard and SUP launch spots across the SF Bay Area. 73 spots covering South Bay, East Bay, North Bay, Peninsula, San Francisco, and Northern California, with maps, launch fees, and conditions.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "paddleboard spots SF Bay Area",
    "SUP launch Bay Area",
    "stand up paddleboard San Francisco",
    "kayak launch spots Bay Area",
    "paddleboarding near me SF",
    "SUP spots Northern California",
    "Bay Area water sports",
    "paddleboard East Bay",
    "paddleboard North Bay",
    "paddleboard South Bay",
    "flatwater paddleboard California",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "PuddleboardBay",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PuddleboardBay",
  url: SITE_URL,
  description: DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
