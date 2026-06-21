import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRelayKey } from "@/lib/relay-auth";

export async function POST(request: Request) {
  try {
    // Authenticate the ESP32 using the standard hardware API key
    if (!verifyRelayKey(request.headers.get("x-api-key"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { libraryId, logs } = body;

    if (!libraryId || !Array.isArray(logs)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    // Parse the logs. The ESP32 sends: [{ uid: "...", doorId: "...", timestamp: 1718790000 }]
    const insertData = logs.map((log: any) => ({
      userId: log.uid,
      libraryId: libraryId,
      doorId: log.doorId,
      // Convert Unix epoch to ISO-8601 Date
      timestamp: new Date(log.timestamp * 1000)
    }));

    // Bulk insert the logs
    await prisma.entryLog.createMany({
      data: insertData,
      // Skip duplicates if any constraints were added (optional)
      skipDuplicates: true
    });

    // Return a solid HTTP 200 to act as an ACK so the ESP32 knows it can delete the logs from flash/RAM
    return NextResponse.json({ success: true, inserted: insertData.length });

  } catch (error: any) {
    console.error("Failed to process hardware entry logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
