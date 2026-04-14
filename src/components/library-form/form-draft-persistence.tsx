"use client";

import { useEffect } from "react";

type DraftValue = string | string[];

function serializeForm(form: HTMLFormElement) {
  const values: Record<string, DraftValue> = {};
  const elements = Array.from(form.elements) as Array<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >;

  for (const element of elements) {
    if (!element.name || element.disabled) continue;
    if (element instanceof HTMLInputElement && element.type === "file") continue;

    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      const existing = values[element.name];
      const next = Array.isArray(existing) ? existing : [];
      values[element.name] = element.checked ? [...next, element.value || "on"] : next;
      continue;
    }

    if (element instanceof HTMLInputElement && element.type === "radio") {
      if (element.checked) values[element.name] = element.value;
      continue;
    }

    values[element.name] = element.value;
  }

  return values;
}

function restoreForm(form: HTMLFormElement, values: Record<string, DraftValue>) {
  const elements = Array.from(form.elements) as Array<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >;

  for (const element of elements) {
    if (!element.name || !(element.name in values)) continue;
    const value = values[element.name];

    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      const checkedValues = Array.isArray(value) ? value : [value];
      element.checked = checkedValues.includes(element.value || "on");
    } else if (element instanceof HTMLInputElement && element.type === "radio") {
      element.checked = value === element.value;
    } else if (!Array.isArray(value)) {
      element.value = value;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function FormDraftPersistence({
  formId,
  storageKey,
  clearOnMount = false,
}: {
  formId: string;
  storageKey: string;
  clearOnMount?: boolean;
}) {
  useEffect(() => {
    if (clearOnMount) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const rawDraft = window.localStorage.getItem(storageKey);
    if (rawDraft) {
      try {
        restoreForm(form, JSON.parse(rawDraft) as Record<string, DraftValue>);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    const persist = () => {
      window.localStorage.setItem(storageKey, JSON.stringify(serializeForm(form)));
    };

    form.addEventListener("input", persist);
    form.addEventListener("change", persist);

    return () => {
      form.removeEventListener("input", persist);
      form.removeEventListener("change", persist);
    };
  }, [clearOnMount, formId, storageKey]);

  return null;
}
