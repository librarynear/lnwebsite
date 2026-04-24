"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DURATION_OPTIONS,
  PLAN_CATEGORY_OPTIONS,
  SEAT_TYPE_OPTIONS,
  calculateDiscountedPrice,
  countWords,
  normalizePlanDraft,
  normalizePlanDrafts,
  type LibraryPlanDraft,
} from "@/lib/library-plans";

type EditablePlanDraft = {
  plan_category: string;
  duration_key: string;
  seat_type: string;
  hours_per_day: string;
  description: string;
  base_price: string;
  discount_percentage: string;
  offer_name: string;
};

type PlanEditorRow = {
  baseline: LibraryPlanDraft | null;
  draft: EditablePlanDraft;
};

function createEmptyDraft(): EditablePlanDraft {
  return {
    plan_category: "",
    duration_key: "",
    seat_type: "",
    hours_per_day: "",
    description: "",
    base_price: "",
    discount_percentage: "",
    offer_name: "",
  };
}

function readStoredPlanDraft(storageKey?: string) {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw
      ? (JSON.parse(raw) as {
          rows?: PlanEditorRow[];
          globalDiscount?: string;
        })
      : null;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function PlanField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label className="block text-sm font-medium text-black">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function getPlanCategoryLabel(value?: string | null) {
  return PLAN_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? "Select category";
}

function getSeatTypeLabel(value?: string | null) {
  return SEAT_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Select plan type";
}

function mergePlanRow(row: PlanEditorRow) {
  const { baseline, draft } = row;
  const hasDraftValue = Object.values(draft).some((value) => value.trim() !== "");
  if (!baseline && !hasDraftValue) {
    return null;
  }

  return normalizePlanDraft({
    plan_category: draft.plan_category || baseline?.plan_category,
    duration_key: draft.duration_key || baseline?.duration_key,
    seat_type: draft.seat_type || baseline?.seat_type,
    hours_per_day:
      draft.hours_per_day !== "" ? Number(draft.hours_per_day) : baseline?.hours_per_day,
    description: draft.description || baseline?.description,
    base_price: draft.base_price !== "" ? Number(draft.base_price) : baseline?.base_price,
    discount_percentage:
      draft.discount_percentage !== ""
        ? Number(draft.discount_percentage)
        : baseline?.discount_percentage,
    offer_name: draft.offer_name || baseline?.offer_name,
  });
}

function DraftCard({
  row,
  index,
  onChange,
  onRemove,
  removable,
}: {
  row: PlanEditorRow;
  index: number;
  onChange: (index: number, patch: Partial<EditablePlanDraft>) => void;
  onRemove: (index: number) => void;
  removable: boolean;
}) {
  const mergedPlan = mergePlanRow(row);
  const baseline = row.baseline;
  const descriptionWordCount = countWords(row.draft.description || baseline?.description || "");

  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-border/70 bg-slate-50/60 p-4">
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

      <div className="grid min-w-0 gap-4">
        <PlanField label="Plan category" required>
          <select
            value={row.draft.plan_category}
            onChange={(event) => onChange(index, { plan_category: event.target.value })}
            className="h-11 w-full min-w-0 rounded-2xl border border-border/80 bg-white px-4 text-sm"
          >
            <option value="">{baseline ? getPlanCategoryLabel(baseline.plan_category) : "Select category"}</option>
            {PLAN_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </PlanField>

        <PlanField label="Months" required>
          <select
            value={row.draft.duration_key}
            onChange={(event) => onChange(index, { duration_key: event.target.value })}
            className="h-11 w-full min-w-0 rounded-2xl border border-border/80 bg-white px-4 text-sm"
          >
            <option value="">{baseline ? baseline.duration_label : "Select duration"}</option>
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </PlanField>

        <PlanField label="Plan type" required>
          <select
            value={row.draft.seat_type}
            onChange={(event) => onChange(index, { seat_type: event.target.value })}
            className="h-11 w-full min-w-0 rounded-2xl border border-border/80 bg-white px-4 text-sm"
          >
            <option value="">{baseline ? getSeatTypeLabel(baseline.seat_type) : "Select plan type"}</option>
            {SEAT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </PlanField>

        <PlanField label="Hours" required>
          <Input
            type="number"
            min="1"
            max="24"
            value={row.draft.hours_per_day}
            onChange={(event) => onChange(index, { hours_per_day: event.target.value })}
            placeholder={baseline ? String(baseline.hours_per_day) : "e.g. 12"}
            className="min-w-0 rounded-2xl bg-white"
          />
        </PlanField>
      </div>

      {(row.draft.plan_category || baseline?.plan_category) === "offer" ? (
        <PlanField label="Offer name">
          <Input
            value={row.draft.offer_name}
            onChange={(event) => onChange(index, { offer_name: event.target.value })}
            placeholder={baseline?.offer_name || "Optional offer label"}
            className="min-w-0 rounded-2xl bg-white"
          />
        </PlanField>
      ) : null}

      <div className="grid min-w-0 gap-4">
        <PlanField label="Regular price (Rs.)" required>
          <Input
            type="number"
            min="0"
            step="1"
            value={row.draft.base_price}
            onChange={(event) => onChange(index, { base_price: event.target.value })}
            placeholder={baseline?.base_price ? String(baseline.base_price) : "e.g. 2500"}
            className="min-w-0 rounded-2xl bg-white"
          />
        </PlanField>

        <PlanField label="Discount %">
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            value={row.draft.discount_percentage}
            onChange={(event) => onChange(index, { discount_percentage: event.target.value })}
            placeholder={
              baseline && baseline.discount_percentage > 0
                ? String(baseline.discount_percentage)
                : "Optional"
            }
            className="min-w-0 rounded-2xl bg-white"
          />
        </PlanField>

        <PlanField label="Discounted price">
          <Input
            value={mergedPlan?.base_price ? String(calculateDiscountedPrice(mergedPlan.base_price, mergedPlan.discount_percentage)) : ""}
            readOnly
            placeholder={mergedPlan?.base_price ? String(mergedPlan.discounted_price) : "Auto"}
            className="min-w-0 rounded-2xl bg-muted/40"
          />
        </PlanField>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-black">Description</label>
          <span className={`text-xs ${descriptionWordCount > 30 ? "text-destructive" : "text-muted-foreground"}`}>
            {descriptionWordCount}/30 words
          </span>
        </div>
        <textarea
          rows={2}
          value={row.draft.description}
          onChange={(event) => onChange(index, { description: event.target.value })}
          placeholder={baseline?.description || "Optional short plan note"}
          className="w-full min-w-0 rounded-2xl border border-border/80 bg-white px-3 py-2 text-sm outline-none"
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
  const normalizedInitialPlans = useMemo(() => normalizePlanDrafts(initialPlans), [initialPlans]);
  const initialRows = useMemo<PlanEditorRow[]>(
    () =>
      normalizedInitialPlans.length > 0
        ? normalizedInitialPlans.map((plan) => ({ baseline: plan, draft: createEmptyDraft() }))
        : [{ baseline: null, draft: createEmptyDraft() }],
    [normalizedInitialPlans],
  );

  const storedDraft = !clearOnMount ? readStoredPlanDraft(storageKey) : null;
  const [rows, setRows] = useState<PlanEditorRow[]>(storedDraft?.rows?.length ? storedDraft.rows : initialRows);
  const [globalDiscount, setGlobalDiscount] = useState(storedDraft?.globalDiscount ?? "");

  useEffect(() => {
    if (storageKey && clearOnMount) {
      window.localStorage.removeItem(storageKey);
    }
  }, [clearOnMount, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ rows, globalDiscount }));
  }, [globalDiscount, rows, storageKey]);

  const serializedPlans = useMemo(
    () =>
      rows
        .map((row) => mergePlanRow(row))
        .filter((plan): plan is LibraryPlanDraft => Boolean(plan) && plan.base_price > 0),
    [rows],
  );

  const applyGlobalDiscount = () => {
    const nextDiscount = Math.max(0, Math.min(100, Number(globalDiscount) || 0));
    setRows((current) =>
      current.map((row) => ({
        ...row,
        draft: {
          ...row.draft,
          discount_percentage: String(nextDiscount),
        },
      })),
    );
  };

  return (
    <div className="min-w-0 space-y-4">
      <input type="hidden" name={inputName} value={JSON.stringify(serializedPlans)} />
      <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border/70 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-black">{title}</h3>
            <p className="text-xs text-muted-foreground">
              Plans are optional. Discounted prices are calculated automatically.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 rounded-2xl border border-dashed border-border/70 bg-slate-50/50 p-4">
          <div className="max-w-xs min-w-0 space-y-2">
            <label className="block text-sm font-medium text-black">Global discount %</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={globalDiscount}
              onChange={(event) => setGlobalDiscount(event.target.value)}
              placeholder="Optional"
              className="min-w-0 rounded-2xl bg-white"
            />
          </div>
          <div className="min-w-0 space-y-2">
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

      <div className="min-w-0 space-y-3">
        {rows.map((row, index) => (
          <DraftCard
            key={`${row.baseline?.duration_key ?? "draft"}-${index}`}
            row={row}
            index={index}
            onChange={(rowIndex, patch) =>
              setRows((current) =>
                current.map((rowItem, currentIndex) =>
                  currentIndex === rowIndex
                    ? {
                        ...rowItem,
                        draft: {
                          ...rowItem.draft,
                          ...patch,
                        },
                      }
                    : rowItem,
                ),
              )
            }
            onRemove={(rowIndex) =>
              setRows((current) =>
                current.length > 1
                  ? current.filter((_, currentIndex) => currentIndex !== rowIndex)
                  : current,
              )
            }
            removable={rows.length > 1}
          />
        ))}
      </div>

      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRows((current) => [
              ...current,
              { baseline: null, draft: createEmptyDraft() },
            ])
          }
          className="rounded-full"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Plan
        </Button>
      </div>
    </div>
  );
}
