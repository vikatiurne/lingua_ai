"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Headphones, Newspaper, Tv } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaRecommendation } from "@/lib/exercise/media";

type MediaRecommendationsProps = {
  exerciseId: string;
};

const TYPE_ICONS: Record<MediaRecommendation["type"], LucideIcon> = {
  podcast: Headphones,
  series: Tv,
  film: Tv,
  video: Tv,
  article: Newspaper,
  book: Newspaper,
};

const TYPE_LABELS: Record<MediaRecommendation["type"], string> = {
  podcast: "Podcast",
  series: "Series",
  film: "Film",
  video: "Video",
  article: "Article",
  book: "Book",
};

export function MediaRecommendations({
  exerciseId,
}: MediaRecommendationsProps) {
  const [items, setItems] = useState<MediaRecommendation[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/exercise/${exerciseId}/materials`)
      .then((response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          recommendations: MediaRecommendation[];
        }>;
      })
      .then((data) => {
        if (!cancelled) setItems(data?.recommendations ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-3 rounded-lg border border-border bg-card/60 p-4">
      <h2 className="font-display text-xl">Practice with Media</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const Icon = TYPE_ICONS[item.type] ?? Newspaper;
          return (
            <a
              key={`${item.url}-${index}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-3 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {TYPE_LABELS[item.type] ?? item.type}
              </div>
              <span className="font-display text-base leading-snug">
                {item.title}
              </span>
              <span className="text-sm text-muted-foreground">
                {item.description}
              </span>
              <span
                className={cn(
                  "mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary",
                  "transition-colors group-hover:underline"
                )}
              >
                Watch / Listen
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
