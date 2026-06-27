import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import PostHogProvider from "@/components/PostHogProvider";
import { SITE_URL, SITE_NAME, directoryJsonLd } from "@/lib/structured-data";
import spotsData from "@/data/spots.json";
import type { Spot } from "@/lib/types";
import "./globals.css";

const ALL_SPOTS = spotsData as Spot[];
const SPOT_COUNT = ALL_SPOTS.length;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2D6A8F",
};

const TITLE = "Paddle to Water: Paddleboard & Kayak Spots in the Bay Area";
const DESCRIPTION =
  `Find the best stand-up paddleboard and SUP launch spots across the SF Bay Area and Northern California. ${SPOT_COUNT} spots covering South Bay, East Bay, North Bay, Peninsula, San Francisco, Sacramento, the Sierra, the Central Valley, and the Central Coast, with maps, launch fees, and conditions.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    siteName: SITE_NAME,
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Paddle to Water",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: DESCRIPTION,
    },
    directoryJsonLd(ALL_SPOTS),
  ],
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
      <body className="h-full">
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
        <Analytics />
        <PostHogProvider />
      </body>
    </html>
  );
}
