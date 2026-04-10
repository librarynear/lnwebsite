"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeePlan {
  id: string;
  plan_name: string;
  duration_label: string | null;
  price: number;
}

export function FeePlansList({ feePlans }: { feePlans: FeePlan[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!feePlans || feePlans.length === 0) {
    return (
      <div className="mb-6 text-center text-sm text-muted-foreground py-4 border border-dashed border-border rounded-xl">
        Fee details not available yet
      </div>
    );
  }

  const minPrice = Math.min(...feePlans.map((p) => p.price));
  const visiblePlans = isExpanded ? feePlans : feePlans.slice(0, 2);
  const hiddenCount = feePlans.length - 2;

  return (
    <>
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">Starting from</p>
        <p className="text-3xl font-bold text-black">
          ₹{minPrice.toLocaleString("en-IN")}
          <span className="text-base font-normal text-muted-foreground"> / month</span>
        </p>
      </div>

      <div className="space-y-3 mb-4">
        {visiblePlans.map((plan) => (
          <div
            key={plan.id}
            className="flex justify-between items-center p-3 rounded-xl border border-border/60 hover:border-border transition-colors bg-white/50"
          >
            <div>
              <p className="text-sm font-semibold">{plan.plan_name}</p>
              {plan.duration_label && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3" /> {plan.duration_label}
                </p>
              )}
            </div>
            <p className="font-bold text-black shadow-sm bg-white border border-border/40 px-2 py-1 rounded-md">
              ₹{plan.price.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      {!isExpanded && feePlans.length > 2 && (
        <Button
          variant="outline"
          className="w-full mb-6 font-semibold"
          onClick={() => setIsExpanded(true)}
        >
          View all {feePlans.length} plans <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      )}

      {isExpanded && feePlans.length > 2 && (
        <Button
          variant="ghost"
          className="w-full mb-6 font-semibold text-muted-foreground"
          onClick={() => setIsExpanded(false)}
        >
          Show less <ChevronUp className="w-4 h-4 ml-1" />
        </Button>
      )}
    </>
  );
}
