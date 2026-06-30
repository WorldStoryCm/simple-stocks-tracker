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
    "Average-cost realized profit and loss",
    "Unrealized P/L with live quotes",
    "Revolut CSV import preview",
    "Import batch rollback",
    "Dividend and cash-event tracking",
    "Cumulative P/L chart (1M, 3M, 1Y, all-time)",
    "Win rate and per-period performance",
    "RSI badges on watchlist and positions",
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
        text: "No live broker sync is required. Stock Tracker imports broker export files, starting with Revolut CSV, and keeps manual entry available for anything missing.",
      },
    },
    {
      "@type": "Question",
      name: "Can I review an import before saving it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The import preview separates new rows, matched rows, possible duplicates, ignored rows, and rows that need review before you commit anything.",
      },
    },
    {
      "@type": "Question",
      name: "How does it calculate profit and loss?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Stock Tracker uses moving weighted-average cost basis. Every sell is compared against the average cost of the currently open position for that symbol and platform, producing deterministic realized P/L.",
      },
    },
    {
      "@type": "Question",
      name: "Does it track dividends?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Dividends and dividend tax are stored as separate cash events, so income can be reviewed without mixing it into trade P/L.",
      },
    },
    {
      "@type": "Question",
      name: "Where does the RSI signal come from?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RSI values are computed from daily closes and cached per ticker. The same RSI badge — Oversold, Near Oversold, Neutral, Near Overbought, Overbought — appears on your watchlist and open positions for consistency.",
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
