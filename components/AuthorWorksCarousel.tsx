"use client";

import Link from "next/link";
import { useRef } from "react";

import AiUsageBadge from "@/components/AiUsageBadge";
import ContentAccessBadge from "@/components/monetization/ContentAccessBadge";
import {
  canUserAccessContent,
  type MonetizedSeries,
  type MonetizedUser,
} from "@/lib/monetization";

type WorkItem = {
  id: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  href: string;
  meta: string;
  badge: string;
  aiUsageTag?: string | null;
  monetization?: Partial<MonetizedSeries>;
};

export default function AuthorWorksCarousel({
  title,
  eyebrow,
  items,
  emptyTitle,
  emptyDescription,
  viewer = null,
}: {
  title: string;
  eyebrow: string;
  items: WorkItem[];
  emptyTitle: string;
  emptyDescription: string;
  viewer?: MonetizedUser | null;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  }

  return (
    <section className="glass-panel rounded-[28px] border border-[var(--border-color)] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
            {title}
          </h2>
        </div>

        <div className="hidden gap-2 md:flex">
          <button
            type="button"
            className="story-button-secondary h-11 w-11 rounded-full px-0"
            onClick={() => scroll("left")}
          >
            {"<"}
          </button>
          <button
            type="button"
            className="story-button-secondary h-11 w-11 rounded-full px-0"
            onClick={() => scroll("right")}
          >
            {">"}
          </button>
        </div>
      </div>

      {items.length > 0 ? (
        <div
          ref={scrollRef}
          className="scrollbar-hide mt-6 flex gap-4 overflow-x-auto pb-2"
        >
          {items.map((item) => {
            const monetization: MonetizedSeries = {
              contentType: "series",
              id: item.monetization?.id ?? item.id,
              isFree: item.monetization?.isFree ?? true,
              isLocked: item.monetization?.isLocked ?? false,
              price: item.monetization?.price ?? null,
              creatorId: item.monetization?.creatorId ?? "",
            };
            const accessStatus = canUserAccessContent(viewer, monetization).accessStatus;

            return (
              <Link
                key={item.id}
                href={item.href}
                className="glass-panel min-w-[270px] max-w-[320px] rounded-[24px] border border-[var(--border-color)] p-4 transition hover:-translate-y-0.5 hover:opacity-95"
              >
                <div className="theme-panel aspect-[4/5] rounded-[18px] border border-[var(--border-color)]">
                  {item.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className={`h-full w-full rounded-[18px] object-cover ${accessStatus === "locked" ? "blur-[2px] opacity-70" : ""}`}
                    />
                  ) : (
                    <div className="theme-meta flex h-full items-center justify-center rounded-[18px] px-4 text-center text-xs uppercase tracking-[0.32em]">
                      Cover Coming Soon
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow">{item.badge}</p>
                    <span className="theme-meta text-xs">{item.meta}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ContentAccessBadge accessStatus={accessStatus} />
                    <AiUsageBadge tag={item.aiUsageTag} compact />
                  </div>
                  <h3 className="font-heading theme-heading mt-3 text-2xl font-semibold">
                    {item.title}
                  </h3>
                  <p className="theme-meta mt-3 text-sm leading-6">
                    {item.description || "This work is listed on the author shelf and will fill out with more detail as metadata grows."}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="theme-panel mt-6 rounded-[24px] border border-dashed border-[var(--border-color)] p-6">
          <h3 className="theme-heading text-xl font-semibold">{emptyTitle}</h3>
          <p className="theme-meta mt-3 text-sm">{emptyDescription}</p>
        </div>
      )}
    </section>
  );
}
