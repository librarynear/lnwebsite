"use client";

import { useMemo, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";

type AssignmentOption = {
  id: string;
  city: string;
  locality: string;
};

type AssignmentFormProps = {
  userId: string;
  options: AssignmentOption[];
  existingAssignmentLocalityIds: string[];
  action: (formData: FormData) => void;
};

export function AssignmentForm({
  userId,
  options,
  existingAssignmentLocalityIds,
  action,
}: AssignmentFormProps) {
  const groupedByCity = useMemo(() => {
    const next = new Map<string, AssignmentOption[]>();

    for (const option of options) {
      const city = option.city.trim();
      const locality = option.locality.trim();
      if (!city || !locality) continue;

      const current = next.get(city) ?? [];
      current.push({ id: option.id, city, locality });
      next.set(city, current);
    }

    for (const list of next.values()) {
      list.sort((a, b) => a.locality.localeCompare(b.locality));
    }

    return Array.from(next.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [options]);

  const [selectedCity, setSelectedCity] = useState(groupedByCity[0]?.[0] ?? "");

  const localityOptions = useMemo(
    () => groupedByCity.find(([city]) => city === selectedCity)?.[1] ?? [],
    [groupedByCity, selectedCity],
  );

  const [selectedLocalityId, setSelectedLocalityId] = useState(
    localityOptions[0]?.id ?? "",
  );

  const isAlreadyAssigned = useMemo(
    () => existingAssignmentLocalityIds.includes(selectedLocalityId),
    [existingAssignmentLocalityIds, selectedLocalityId],
  );

  return (
    <form action={action} className="mb-4 space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="locality_id" value={selectedLocalityId} />
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedCity}
          onChange={(event) => {
            const nextCity = event.target.value;
            setSelectedCity(nextCity);
            const nextLocalities = groupedByCity.find(([city]) => city === nextCity)?.[1] ?? [];
            setSelectedLocalityId(nextLocalities[0]?.id ?? "");
          }}
          className="min-w-[220px] rounded-md border border-border bg-white px-3 py-2 text-sm"
          required
        >
          {groupedByCity.length === 0 ? <option value="">No cities available</option> : null}
          {groupedByCity.map(([city]) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <select
          value={selectedLocalityId}
          onChange={(event) => setSelectedLocalityId(event.target.value)}
          className="min-w-[260px] rounded-md border border-border bg-white px-3 py-2 text-sm"
          required
          disabled={!selectedCity || localityOptions.length === 0}
        >
          {localityOptions.length === 0 ? <option value="">No localities available</option> : null}
          {localityOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.locality}
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
        Multiple users can be assigned to the same locality. Localities come from the canonical list, so typos and casing differences are no longer possible.
      </p>

      {isAlreadyAssigned ? (
        <p className="text-xs text-amber-700">
          This staff member already has the selected locality assigned.
        </p>
      ) : null}
    </form>
  );
}
