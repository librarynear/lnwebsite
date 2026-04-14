"use client";

import { Clock3, Percent, Tag, TicketPercent } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FeePlan {
  id: string;
  plan_name: string;
  duration_label: string | null;
  seat_type: string | null;
  hours_per_day?: number | null;
  description: string | null;
  price: number;
  base_price?: number | null;
  discount_percentage?: number | null;
  discounted_price?: number | null;
  plan_category?: string | null;
  offer_name?: string | null;
}

function formatRs(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

export function FeePlansList({ feePlans }: { feePlans: FeePlan[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!feePlans || feePlans.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
        Fee details not available yet
      </div>
    );
  }

  const minPrice = Math.min(
    ...feePlans.map((plan) => plan.discounted_price ?? plan.price),
  );
  const visiblePlans = isExpanded ? feePlans : feePlans.slice(0, 2);

  return (
    <>
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">Starting from</p>
        <p className="text-3xl font-bold text-black">
          {formatRs(minPrice)}
          <span className="text-base font-normal text-muted-foreground"> onwards</span>
        </p>
      </div>

      <div className="mb-4 space-y-3">
        {visiblePlans.map((plan) => {
          const effectivePrice = plan.discounted_price ?? plan.price;
          const basePrice = plan.base_price ?? plan.price;
          const hasDiscount = basePrice > effectivePrice;

          return (
            <div
              key={plan.id}
              className="rounded-xl border border-border/60 bg-white/50 p-4 transition-colors hover:border-border"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {plan.plan_category === "offer" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        <TicketPercent className="h-3.5 w-3.5" />
                        {plan.offer_name || "Offer"}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {plan.seat_type === "reserved" ? "Reserved" : "Unreserved"}
                    </span>
                    {plan.hours_per_day ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                        <Clock3 className="h-3.5 w-3.5" />
                        {plan.hours_per_day} hrs
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-black">
                      {plan.duration_label || plan.plan_name}
                    </p>
                    {plan.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                    ) : null}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-black">{formatRs(effectivePrice)}</p>
                  {hasDiscount ? (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground line-through">
                        {formatRs(basePrice)}
                      </p>
                      <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <Percent className="h-3 w-3" />
                        {plan.discount_percentage ?? Math.round(((basePrice - effectivePrice) / basePrice) * 100)}% off
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isExpanded && feePlans.length > 2 ? (
        <Button variant="outline" className="mb-6 w-full font-semibold" onClick={() => setIsExpanded(true)}>
          <Tag className="mr-2 h-4 w-4" />
          View all {feePlans.length} plans
        </Button>
      ) : null}

      {isExpanded && feePlans.length > 2 ? (
        <Button variant="ghost" className="mb-6 w-full font-semibold text-muted-foreground" onClick={() => setIsExpanded(false)}>
          Show less
        </Button>
      ) : null}
    </>
  );
}
