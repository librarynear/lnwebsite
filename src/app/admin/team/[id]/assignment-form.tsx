"use client";

import { useMemo, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";

type AssignmentOption = {
  city: string;
  locality: string;
};

type AssignmentFormProps = {
  userId: string;
  options: AssignmentOption[];
  existingAssignments: AssignmentOption[];
  action: (formData: FormData) => void;
};

export function AssignmentForm({
  userId,
  options,
  existingAssignments,
  action,
}: AssignmentFormProps) {
  const grouped = useMemo(() => {
    const next = new Map<string, string[]>();

    for (const option of options) {
      const city = option.city.trim();
      const locality = option.locality.trim();
      if (!city || !locality) continue;

      const current = next.get(city) ?? [];
      if (!current.includes(locality)) {
        current.push(locality);
        current.sort((a, b) => a.localeCompare(b));
        next.set(city, current);
      }
    }

    return Array.from(next.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [options]);

  const [selectedCity, setSelectedCity] = useState(grouped[0]?.[0] ?? "");

  const localityOptions = useMemo(
    () => grouped.find(([city]) => city === selectedCity)?.[1] ?? [],
    [grouped, selectedCity],
  );

  const [selectedLocality, setSelectedLocality] = useState(localityOptions[0] ?? "");

  const existingForSelection = useMemo(
    () =>
      existingAssignments.some(
        (assignment) =>
          assignment.city.toLowerCase() === selectedCity.toLowerCase() &&
          assignment.locality.toLowerCase() === selectedLocality.toLowerCase(),
      ),
    [existingAssignments, selectedCity, selectedLocality],
  );

  return (
    <form action={action} className="mb-4 space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex flex-wrap items-center gap-3">
        <select
          name="city"
          value={selectedCity}
          onChange={(event) => {
            const nextCity = event.target.value;
            setSelectedCity(nextCity);
            const nextLocalities = grouped.find(([city]) => city === nextCity)?.[1] ?? [];
            setSelectedLocality(nextLocalities[0] ?? "");
          }}
          className="min-w-[220px] rounded-md border border-border bg-white px-3 py-2 text-sm"
          required
        >
          {grouped.length === 0 ? <option value="">No cities available</option> : null}
          {grouped.map(([city]) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <select
          name="locality"
          value={selectedLocality}
          onChange={(event) => setSelectedLocality(event.target.value)}
          className="min-w-[260px] rounded-md border border-border bg-white px-3 py-2 text-sm"
          required
          disabled={!selectedCity || localityOptions.length === 0}
        >
          {localityOptions.length === 0 ? <option value="">No localities available</option> : null}
          {localityOptions.map((locality) => (
            <option key={`${selectedCity}-${locality}`} value={locality}>
              {locality}
            </option>
          ))}
        </select>

        <FormSubmitButton
          className="bg-primary px-4 py-2 text-sm font-medium text-white"
          pendingLabel="Assigning..."
        >
          Assign
        </FormSubmitButton>
      </div>

      <p className="text-xs text-muted-foreground">
        Multiple users can be assigned to the same locality. Pick from your existing library data to avoid typos.
      </p>

      {existingForSelection ? (
        <p className="text-xs text-amber-700">
          This staff member already has the selected locality assigned.
        </p>
      ) : null}
    </form>
  );
}
