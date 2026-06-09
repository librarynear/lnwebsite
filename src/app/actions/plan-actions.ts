'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PlanType } from "@prisma/client"
import { getSession } from "./auth-actions"

export async function addPlan(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as PlanType;
  const validityDays = parseInt(formData.get("validityDays") as string, 10);
  const price = parseFloat(formData.get("price") as string);
  const discountStr = formData.get("discount") as string;
  const discount = discountStr ? parseFloat(discountStr) : 0;
  
  const hoursStr = formData.get("durationHours") as string;
  const durationHours = hoursStr ? parseInt(hoursStr, 10) : null;
  
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN') throw new Error("Unauthorized");
  
  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("No library found to attach the plan to.");

  await prisma.plan.create({
    data: { name, type, validityDays, durationHours, price, discount, libraryId: library.id }
  });

  revalidatePath("/dashboard/plans");
}

export async function batchAddPlans(plansData: string) {
  const plans = JSON.parse(plansData);
  
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN') throw new Error("Unauthorized");
  
  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("No library found to attach the plan to.");

  await prisma.plan.createMany({
    data: plans.map((p: any) => ({
      ...p,
      libraryId: library.id
    }))
  });

  revalidatePath("/dashboard/plans");
}

export async function deletePlan(planId: string) {
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN') throw new Error("Unauthorized");
  
  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("No library found");

  await prisma.plan.deleteMany({
    where: { id: planId, libraryId: library.id }
  });
  revalidatePath("/dashboard/plans");
}

export async function editPlan(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as PlanType;
  const validityDays = parseInt(formData.get("validityDays") as string, 10);
  const price = parseFloat(formData.get("price") as string);
  const discountStr = formData.get("discount") as string;
  const discount = discountStr ? parseFloat(discountStr) : 0;
  
  const hoursStr = formData.get("durationHours") as string;
  const durationHours = hoursStr ? parseInt(hoursStr, 10) : null;
  
  const session = await getSession();
  if (!session || session.role !== 'LIBRARIAN') throw new Error("Unauthorized");
  const library = await prisma.library.findFirst({ where: { librarianId: session.userId } });
  if (!library) throw new Error("No library found");

  await prisma.plan.updateMany({
    where: { id, libraryId: library.id },
    data: { name, type, validityDays, durationHours, price, discount }
  });

  revalidatePath("/dashboard/plans");
}
