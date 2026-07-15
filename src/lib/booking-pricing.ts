import prisma from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type PricingInput = {
  planId: string
  libraryId: string
  seatId?: string | null
  hasLocker?: boolean
  standaloneLockerId?: string | null
}

type PricingClient = Pick<Prisma.TransactionClient, "plan" | "seat" | "standaloneLocker">

/**
 * Single source of truth for how much a booking should cost, in paise.
 *
 * Every payment verification path (interactive verify, payment-link callback,
 * and the webhook) MUST compute the expected amount here and compare it against
 * what Razorpay reports as actually paid. Trusting a client- or
 * gateway-supplied amount without this check lets a user pay ₹1 for a ₹1000
 * plan by tampering with the order.
 *
 * Returns the expected amount in paise, or null if referenced entities are
 * missing / inconsistent (caller should reject the payment in that case).
 */
export async function computeExpectedAmountPaise(
  input: PricingInput,
  db: PricingClient = prisma,
): Promise<number | null> {
  const { planId, libraryId, seatId, hasLocker, standaloneLockerId } = input

  const plan = await db.plan.findUnique({ where: { id: planId } })
  if (!plan || plan.libraryId !== libraryId) return null

  let expectedAmount = plan.discount
    ? plan.price - (plan.price * plan.discount) / 100
    : plan.price

  const lockerMonths = Math.max(1, Math.round(plan.validityDays / 28))

  if (seatId) {
    const seat = await db.seat.findUnique({ where: { id: seatId } })
    if (!seat || seat.libraryId !== libraryId) return null

    if (hasLocker && seat.lockerPriceMonthly) {
      expectedAmount += seat.lockerPriceMonthly * lockerMonths
    }

    if (seat.type === 'PREMIUM' && seat.premiumPriceMonthly) {
      const premiumMultiplier = plan.validityDays / 30
      let premiumSurcharge = seat.premiumPriceMonthly * premiumMultiplier

      if (seat.syncPremiumOffers !== false && plan.discount) {
        premiumSurcharge -= premiumSurcharge * plan.discount / 100
      }

      expectedAmount += premiumSurcharge
    }
  }

  if (standaloneLockerId) {
    const locker = await db.standaloneLocker.findUnique({ where: { id: standaloneLockerId } })
    if (!locker || locker.libraryId !== libraryId) return null
    expectedAmount += locker.price * lockerMonths
  }

  return Math.round(expectedAmount * 100)
}

/**
 * Compares an actually-paid paise amount to the expected amount with a 1-paisa
 * tolerance (rounding). Returns true when the payment is acceptable.
 */
export function amountMatches(paidPaise: number, expectedPaise: number): boolean {
  return Math.abs(paidPaise - expectedPaise) <= 1
}
