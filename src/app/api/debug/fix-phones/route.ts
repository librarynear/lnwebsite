import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase/firebaseAdmin";


export async function GET() {
  try {
    const usersToFix = await prisma.user.findMany({
      where: {
        authId: { not: null },
        OR: [
          { phone: null },
          { phone: "" }
        ]
      }
    });

    const fixedUsers = [];
    const errors = [];

    for (const user of usersToFix) {
      if (!user.authId) continue;
      if (!adminAuth) {
        return NextResponse.json({ error: "Firebase Admin Auth not initialized" }, { status: 500 });
      }
      try {
        const firebaseUser = await adminAuth.getUser(user.authId);
        if (firebaseUser.phoneNumber) {
          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { phone: firebaseUser.phoneNumber }
          });
          fixedUsers.push({ id: user.id, name: user.name, phone: updatedUser.phone });
        }
      } catch (err: any) {
        errors.push({ id: user.id, authId: user.authId, error: err.message });
      }
    }

    return NextResponse.json({
      totalFound: usersToFix.length,
      totalFixed: fixedUsers.length,
      fixedUsers,
      errors
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
