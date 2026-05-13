import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "FinanceApplication",
  applicationSubCategory: "Personal portfolio tracker",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Multi-platform manual trade ledger",
    "FIFO realized profit and loss",
    "Unrealized P/L with live quotes",
    "Cumulative P/L chart (1M, 3M, 1Y, all-time)",
    "Win rate and per-period performance",
    "RSI badges on watchlist, positions, and shadow cases",
    "Shadow Trading — review the trades you didn't make",
    "Monthly and yearly profit goals",
  ],
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
};

const faq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does Stock Tracker sync with my broker?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Stock Tracker is intentionally a manual journal. You log every buy and sell yourself, which keeps the ledger auditable and broker-agnostic.",
      },
    },
    {
      "@type": "Question",
      name: "How does it calculate profit and loss?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Stock Tracker uses FIFO (first-in, first-out) matching. Every sell is matched against the oldest open buy lots for the same symbol and platform, producing a deterministic realized P/L that you can audit down to the lot.",
      },
    },
    {
      "@type": "Question",
      name: "What is Shadow Trading?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shadow Trading is a feature for tracking ideas you didn't actually trade. You capture the symbol, direction, entry price, and thesis. The system freezes that context so you can later review what would have happened — without hindsight pollution.",
      },
    },
    {
      "@type": "Question",
      name: "Where does the RSI signal come from?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RSI values are computed from daily closes and cached per ticker. The same RSI badge — Oversold, Near Oversold, Neutral, Near Overbought, Overbought — appears on your watchlist, your open positions, and your shadow cases for consistency.",
      },
    },
    {
      "@type": "Question",
      name: "Is it free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Stock Tracker is a personal tool. Sign in with Google to get started.",
      },
    },
  ],
};

export function LandingJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}
