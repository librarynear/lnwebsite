'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PlanType } from "@prisma/client"
import { getSession } from "./auth-actions"
import { redis } from "@/lib/redis"
import {
  parseMoney,
  parseDiscount,
  parsePositiveInt,
  parseOptionalInt,
  requireString,
} from "@/lib/validation"

const VALID_PLAN_TYPES: PlanType[] = ['FIXED', 'FLEXIBLE'];

function parsePlanType(value: FormDataEntryValue | string | null): PlanType {
  const t = typeof value === 'string' ? value : '';
  if (!VALID_PLAN_TYPES.includes(t as PlanType)) {
    throw new Error("Invalid plan type");
  }
  return t as PlanType;
}

const MAX_BATCH_PLANS = 100;

export async function addPlan(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (!library) throw new Error("No library found to attach the plan to.");

  const name = requireString(formData.get("name"), "Plan name", 120);
  const type = parsePlanType(formData.get("type"));
  const validityDays = parsePositiveInt(formData.get("validityDays"), "Validity days", 1, 3650);
  const price = parseMoney(formData.get("price"), "Price");
  const discount = parseDiscount(formData.get("discount"));
  const durationHours = parseOptionalInt(formData.get("durationHours"), "Duration hours", 1, 24);

  await prisma.plan.create({
    data: { name, type, validityDays, durationHours, price, discount, libraryId: library.id }
  });

  await redis.del(`library:${library.id}`);
  revalidatePath(`/library/${library.id}`);
  revalidatePath("/dashboard/plans");
}

export async function batchAddPlans(plansData: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (!library) throw new Error("No library found to attach the plan to.");

  let plans: any[];
  try {
    plans = JSON.parse(plansData);
  } catch {
    throw new Error("Invalid plans payload");
  }
  if (!Array.isArray(plans)) throw new Error("Invalid plans payload");
  if (plans.length === 0) return;
  if (plans.length > MAX_BATCH_PLANS) throw new Error(`Too many plans (max ${MAX_BATCH_PLANS})`);

  const data = plans.map((p: any) => ({
    name: requireString(p?.name, "Plan name", 120),
    type: parsePlanType(p?.type),
    validityDays: parsePositiveInt(String(p?.validityDays ?? ''), "Validity days", 1, 3650),
    durationHours: parseOptionalInt(p?.durationHours != null ? String(p.durationHours) : '', "Duration hours", 1, 24),
    price: parseMoney(String(p?.price ?? ''), "Price"),
    discount: parseDiscount(p?.discount != null ? String(p.discount) : ''),
    libraryId: library.id,
  }));

  await prisma.plan.createMany({ data });

  await redis.del(`library:${library.id}`);
  revalidatePath(`/library/${library.id}`);
  revalidatePath("/dashboard/plans");
}

export async function deletePlan(planId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (!library) throw new Error("No library found");

  await prisma.plan.deleteMany({
    where: { id: planId, libraryId: library.id }
  });

  await redis.del(`library:${library.id}`);
  revalidatePath(`/library/${library.id}`);
  revalidatePath("/dashboard/plans");
}

export async function editPlan(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) throw new Error("Unauthorized");

  const library = await prisma.library.findFirst({ where: session.role === 'ADMIN' ? {} : { librarianId: session.userId } });
  if (!library) throw new Error("No library found");

  const id = requireString(formData.get("id"), "Plan id", 64);
  const name = requireString(formData.get("name"), "Plan name", 120);
  const type = parsePlanType(formData.get("type"));
  const validityDays = parsePositiveInt(formData.get("validityDays"), "Validity days", 1, 3650);
  const price = parseMoney(formData.get("price"), "Price");
  const discount = parseDiscount(formData.get("discount"));
  const durationHours = parseOptionalInt(formData.get("durationHours"), "Duration hours", 1, 24);

  await prisma.plan.updateMany({
    where: { id, libraryId: library.id },
    data: { name, type, validityDays, durationHours, price, discount }
  });

  await redis.del(`library:${library.id}`);
  revalidatePath(`/library/${library.id}`);
  revalidatePath("/dashboard/plans");
}
