"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PLAN,
  DURATION_OPTIONS,
  PLAN_CATEGORY_OPTIONS,
  SEAT_TYPE_OPTIONS,
  calculateDiscountedPrice,
  countWords,
  getDurationLabel,
  normalizePlanDraft,
  normalizePlanDrafts,
  type LibraryPlanDraft,
} from "@/lib/library-plans";

function readStoredPlanDraft(storageKey?: string) {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw
      ? (JSON.parse(raw) as {
          plans?: Partial<LibraryPlanDraft>[];
          globalDiscount?: string;
        })
      : null;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function DraftCard({
  plan,
  index,
  onChange,
  onRemove,
  removable,
}: {
  plan: LibraryPlanDraft;
  index: number;
  onChange: (index: number, patch: Partial<LibraryPlanDraft>) => void;
  onRemove: (index: number) => void;
  removable: boolean;
}) {
  const descriptionWordCount = countWords(plan.description);

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-black">Plan {index + 1}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={!removable}
          className="text-destructive"
          aria-label="Remove plan"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-black">
            Plan category <span className="text-destructive">*</span>
          </label>
          <select
            value={plan.plan_category}
            onChange={(event) =>
              onChange(index, { plan_category: event.target.value as LibraryPlanDraft["plan_category"] })
            }
            className="h-10 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm"
          >
            {PLAN_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-black">
            Months <span className="text-destructive">*</span>
          </label>
          <select
            value={plan.duration_key}
            onChange={(event) =>
              onChange(index, {
                duration_key: event.target.value as LibraryPlanDraft["duration_key"],
                duration_label: getDurationLabel(event.target.value),
              })
            }
            className="h-10 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm"
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-black">
            Plan type <span className="text-destructive">*</span>
          </label>
          <select
            value={plan.seat_type}
            onChange={(event) =>
              onChange(index, { seat_type: event.target.value as LibraryPlanDraft["seat_type"] })
            }
            className="h-10 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm"
          >
            {SEAT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-black">
            Hours <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            min="1"
            max="24"
            value={plan.hours_per_day}
            onChange={(event) =>
              onChange(index, { hours_per_day: Number(event.target.value) || 1 })
            }
            className="rounded-2xl bg-white"
          />
        </div>
      </div>

      {plan.plan_category === "offer" ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-black">Offer name</label>
          <Input
            value={plan.offer_name}
            onChange={(event) => onChange(index, { offer_name: event.target.value })}
            placeholder="Optional offer label"
            className="rounded-2xl bg-white"
          />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-black">
            Regular price (Rs.) <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="1"
            value={plan.base_price}
            onChange={(event) =>
              onChange(index, { base_price: Math.max(0, Number(event.target.value) || 0) })
            }
            className="rounded-2xl bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-black">Discount %</label>
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            value={plan.discount_percentage}
            onChange={(event) =>
              onChange(index, {
                discount_percentage: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
              })
            }
            className="rounded-2xl bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-black">Discounted price</label>
          <Input
            value={plan.discounted_price}
            readOnly
            className="rounded-2xl bg-muted/40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-black">Description</label>
          <span className={`text-xs ${descriptionWordCount > 50 ? "text-destructive" : "text-muted-foreground"}`}>
            {descriptionWordCount}/50 words
          </span>
        </div>
        <textarea
          rows={2}
          value={plan.description}
          onChange={(event) => onChange(index, { description: event.target.value })}
          placeholder="Optional short plan note"
          className="w-full rounded-2xl border border-border/80 bg-white px-3 py-2 text-sm outline-none"
        />
      </div>
    </div>
  );
}

export function PlansEditor({
  inputName = "fee_plans_json",
  initialPlans = [],
  storageKey,
  title = "Plans",
  note,
  clearOnMount = false,
}: {
  inputName?: string;
  initialPlans?: Partial<LibraryPlanDraft>[];
  storageKey?: string;
  title?: string;
  note?: string;
  clearOnMount?: boolean;
}) {
  const normalizedInitialPlans = useMemo(
    () => (initialPlans.length > 0 ? initialPlans.map((plan) => normalizePlanDraft(plan)) : [DEFAULT_PLAN]),
    [initialPlans],
  );
  const storedDraft = !clearOnMount ? readStoredPlanDraft(storageKey) : null;
  const [plans, setPlans] = useState<LibraryPlanDraft[]>(
    storedDraft?.plans && storedDraft.plans.length > 0
      ? normalizePlanDrafts(storedDraft.plans)
      : normalizedInitialPlans,
  );
  const [globalDiscount, setGlobalDiscount] = useState(storedDraft?.globalDiscount ?? "0");

  useEffect(() => {
    if (storageKey && clearOnMount) {
      window.localStorage.removeItem(storageKey);
    }
  }, [clearOnMount, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ plans, globalDiscount }));
  }, [globalDiscount, plans, storageKey]);

  const updatePlan = (index: number, patch: Partial<LibraryPlanDraft>) => {
    setPlans((current) =>
      current.map((plan, planIndex) => {
        if (planIndex !== index) return plan;
        return normalizePlanDraft({
          ...plan,
          ...patch,
          discounted_price: calculateDiscountedPrice(
            Number(patch.base_price ?? plan.base_price),
            Number(patch.discount_percentage ?? plan.discount_percentage),
          ),
        });
      }),
    );
  };

  const applyGlobalDiscount = () => {
    const nextDiscount = Math.max(0, Math.min(100, Number(globalDiscount) || 0));
    setPlans((current) =>
      current.map((plan) =>
        normalizePlanDraft({
          ...plan,
          discount_percentage: nextDiscount,
        }),
      ),
    );
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name={inputName} value={JSON.stringify(plans)} />
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-black">{title}</h3>
            <p className="text-xs text-muted-foreground">
              Plans are optional. Discounted prices are calculated automatically.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPlans((current) => [...current, { ...DEFAULT_PLAN }])}
            className="rounded-full"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Plan
          </Button>
        </div>

        <div className="grid gap-3 rounded-2xl border border-dashed border-border/70 bg-slate-50/50 p-3 md:grid-cols-[180px_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-black">Global discount %</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={globalDiscount}
              onChange={(event) => setGlobalDiscount(event.target.value)}
              className="rounded-2xl bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={applyGlobalDiscount}>
              <Tag className="mr-2 h-4 w-4" />
              Apply to all plans
            </Button>
            <p className="text-xs text-muted-foreground">
              This fills the discount percentage for every plan at once.
            </p>
          </div>
        </div>

        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>

      <div className="space-y-3">
        {plans.map((plan, index) => (
          <DraftCard
            key={`${plan.duration_key}-${index}`}
            plan={plan}
            index={index}
            onChange={updatePlan}
            onRemove={(planIndex) =>
              setPlans((current) =>
                current.length > 1
                  ? current.filter((_, currentIndex) => currentIndex !== planIndex)
                  : current,
              )
            }
            removable={plans.length > 1}
          />
        ))}
      </div>
    </div>
  );
}
