import type { BookingDraft, BookingFacts } from './types';

// Simplified port of endOfDayIST without importing external libraries in the pure core
function endOfDayIST(date: Date, addDays: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + addDays);
  // Assuming the system handles timezone normalization outside, or we do UTC math.
  // For pure engine, we do local UTC math as a proxy for the date boundaries.
  d.setUTCHours(18, 29, 59, 999); // 23:59:59 IST is 18:29:59 UTC
  return d;
}

export function calculateBookingDates(
  draft: BookingDraft,
  facts: BookingFacts
): { startsAt: Date; endsAt: Date } | null {
  if (!draft.planId) return null;
  
  const selectedPlan = facts.activePlans.find(p => p.id === draft.planId);
  if (!selectedPlan) return null;

  const requestedStart = draft.requestedStart ?? facts.authoritativeCurrentTime;
  
  // If the user already has a current booking window supplied by the fact loader
  const startsAt = facts.currentBookingWindow && facts.currentBookingWindow.endsAt >= requestedStart
    ? new Date(facts.currentBookingWindow.endsAt.getTime() + 1)
    : requestedStart;

  const validityDays = selectedPlan.validityDays;
  const endsAt = endOfDayIST(startsAt, Math.max(0, validityDays - 1));

  return { startsAt, endsAt };
}
