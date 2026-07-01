import { Badge } from "@/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { ExternalLink } from "lucide-react";

const SOURCES = [
  {
    name: "Yahoo Finance",
    status: "Current MVP",
    fit: "No-key feed for earnings dates, dividend dates, and company headlines.",
    tradeoff: "Unofficial endpoint through yahoo-finance2; good for personal use, weaker SLA.",
    href: "https://finance.yahoo.com/calendar/earnings/",
  },
  {
    name: "Financial Modeling Prep",
    status: "Best swap",
    fit: "Calendar APIs for earnings/dividends plus stock news and press releases.",
    tradeoff: "API key and plan limits; cleaner commercial integration path.",
    href: "https://site.financialmodelingprep.com/developer/docs",
  },
  {
    name: "Finnhub",
    status: "API option",
    fit: "Earnings calendar, market news, company news, and fundamentals.",
    tradeoff: "API key required; check plan coverage for dividends/news history.",
    href: "https://finnhub.io/docs/api/earnings-calendar",
  },
  {
    name: "Alpha Vantage",
    status: "API option",
    fit: "News sentiment feed and earnings calendar CSV for symbol-level research.",
    tradeoff: "Free key exists, but rate limits matter for large watchlists.",
    href: "https://www.alphavantage.co/documentation/",
  },
  {
    name: "SEC EDGAR RSS",
    status: "Filings",
    fit: "Public company filing feeds for 10-K, 10-Q, 8-K and other reports.",
    tradeoff: "Needs ticker-to-CIK mapping; not a dividend or headline feed.",
    href: "https://www.sec.gov/about/developer-resources",
  },
];

export function SourceResearch() {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Source research</h2>
        <p className="mt-1 text-sm text-text-tertiary">
          These are the realistic feeds to use if Yahoo is not enough.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {SOURCES.map((source) => (
          <Card key={source.name} className="rounded-md">
            <CardHeader className="gap-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{source.name}</CardTitle>
                <Badge variant={source.status === "Current MVP" ? "success" : "secondary"}>
                  {source.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-3 text-sm">
              <p className="text-text-primary">{source.fit}</p>
              <p className="text-xs leading-relaxed text-text-tertiary">{source.tradeoff}</p>
              <a
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-[color:var(--info)] hover:underline"
              >
                Docs <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
