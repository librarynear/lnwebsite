import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/firebaseAdmin";

export async function GET() {
  try {
    if (!adminAuth) {
      return NextResponse.json({ error: "Firebase Admin Auth not initialized" }, { status: 500 });
    }
    
    // List up to 1000 users
    const listUsersResult = await adminAuth.listUsers(1000);
    const users = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      phoneNumber: userRecord.phoneNumber,
      email: userRecord.email
    }));

    return NextResponse.json({
      totalUsers: users.length,
      users
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
