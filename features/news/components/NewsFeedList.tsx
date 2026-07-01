"use client";

import type { CompanyNewsItem } from "@/app/server/services/news/types";
import { Badge } from "@/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { ExternalLink, Newspaper } from "lucide-react";
import { formatDateTime, relativeTime } from "../format";

export function NewsFeedList({
  news,
  loading,
}: {
  news: CompanyNewsItem[];
  loading: boolean;
}) {
  return (
    <Card loading={loading} className="overflow-hidden rounded-md">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base">
          <Newspaper className="h-4 w-4 text-text-tertiary" />
          Company news
        </CardTitle>
        <p className="text-sm text-text-tertiary">Latest matching headlines returned by symbol search.</p>
      </CardHeader>
      <CardContent className="p-0">
        {!loading && news.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-tertiary">
            No company headlines were returned for the tracked symbols.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {news.map((item) => (
              <article key={item.id} className="group px-4 py-4 transition-colors hover:bg-[color:var(--surface-2)]/45">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{item.ticker}</Badge>
                      {item.relatedTickers.slice(0, 3).map((ticker) => (
                        ticker !== item.ticker ? (
                          <Badge key={ticker} variant="outline">{ticker}</Badge>
                        ) : null
                      ))}
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 font-semibold text-text-primary group-hover:text-[color:var(--info)]"
                    >
                      {item.title}
                    </a>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
                      <span>{item.publisher}</span>
                      <span aria-hidden>&middot;</span>
                      <time dateTime={item.publishedAt} title={formatDateTime(item.publishedAt)}>
                        {relativeTime(item.publishedAt)}
                      </time>
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-text-tertiary opacity-70 hover:bg-[color:var(--surface-3)] hover:text-text-primary group-hover:opacity-100"
                    aria-label={`Open news article: ${item.title}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
