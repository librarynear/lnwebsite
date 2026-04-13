"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FeePlanDraft = {
  duration_label: string;
  seat_type: string;
  price: number;
};

export function OwnerFeePlansInput() {
  const [plans, setPlans] = useState<FeePlanDraft[]>([
    { duration_label: "Monthly", seat_type: "Unreserved", price: 0 },
  ]);

  const updatePlan = (index: number, patch: Partial<FeePlanDraft>) => {
    setPlans((current) =>
      current.map((plan, planIndex) =>
        planIndex === index ? { ...plan, ...patch } : plan,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="fee_plans_json" value={JSON.stringify(plans)} />
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-black">Fee Plans</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setPlans((current) => [
              ...current,
              { duration_label: "Monthly", seat_type: "Unreserved", price: 0 },
            ])
          }
          className="rounded-full"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Plan
        </Button>
      </div>

      <div className="space-y-3">
        {plans.map((plan, index) => (
          <div key={index} className="grid gap-3 rounded-2xl border border-border/70 bg-slate-50/60 p-3 md:grid-cols-[1fr_1fr_120px_auto]">
            <select
              value={plan.duration_label}
              onChange={(event) => updatePlan(index, { duration_label: event.target.value })}
              className="h-9 rounded-xl border border-border/80 bg-white px-3 text-sm"
            >
              <option value="Daily">Daily</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Yearly">Yearly</option>
            </select>
            <select
              value={plan.seat_type}
              onChange={(event) => updatePlan(index, { seat_type: event.target.value })}
              className="h-9 rounded-xl border border-border/80 bg-white px-3 text-sm"
            >
              <option value="Reserved">Reserved</option>
              <option value="Unreserved">Unreserved</option>
            </select>
            <Input
              type="number"
              min="0"
              value={plan.price}
              onChange={(event) => updatePlan(index, { price: Number(event.target.value) })}
              placeholder="Price"
              className="rounded-xl bg-white"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPlans((current) => current.filter((_, planIndex) => planIndex !== index))}
              className="text-destructive"
              disabled={plans.length === 1}
              aria-label="Remove fee plan"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
