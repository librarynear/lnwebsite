import type { BookingDraft, BookingFacts } from './types';

export function calculatePricing(
  draft: BookingDraft,
  facts: BookingFacts
): number | null {
  if (!draft.planId) return null;

  const plan = facts.activePlans.find(p => p.id === draft.planId);
  if (!plan) return null;

  let expectedAmountPaise = plan.discountPercentage
    ? plan.pricePaise - Math.round((plan.pricePaise * plan.discountPercentage) / 100)
    : plan.pricePaise;

  const lockerMonths = Math.max(1, Math.round(plan.validityDays / 28));

  if (draft.seatId && plan.type === 'FIXED') {
    const seat = facts.eligibleSeats.find(s => s.id === draft.seatId);
    if (!seat) return null;

    // Attached locker price is ONLY applied if explicitly selected
    if (draft.attachedLockerSelected === true && seat.lockerPriceMonthlyPaise) {
      expectedAmountPaise += seat.lockerPriceMonthlyPaise * lockerMonths;
    }

    if (seat.type === 'PREMIUM' && seat.premiumPriceMonthlyPaise) {
      const premiumMultiplier = plan.validityDays / 30;
      let premiumSurchargePaise = Math.round(seat.premiumPriceMonthlyPaise * premiumMultiplier);

      if (seat.syncPremiumOffers !== false && plan.discountPercentage) {
        premiumSurchargePaise -= Math.round((premiumSurchargePaise * plan.discountPercentage) / 100);
      }

      expectedAmountPaise += premiumSurchargePaise;
    }
  }

  if (draft.standaloneLockerId) {
    const locker = facts.standaloneLockers.find(l => l.id === draft.standaloneLockerId);
    if (!locker) return null;
    
    expectedAmountPaise += locker.pricePaise * lockerMonths;
  }

  return expectedAmountPaise;
}
