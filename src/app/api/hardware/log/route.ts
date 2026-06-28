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

    // Helper to check UUID
    const isUUID = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

    // Parse the logs. The ESP32 sends: [{ uid: "...", doorId: "...", timestamp: 1718790000 }]
    const insertData = logs.map((log: any) => {
      let finalUserId = log.uid !== "UNKNOWN" && log.uid ? log.uid : null;
      let finalReason = log.reason || null;

      // Prevent Foreign Key crash on EntryLog by nullifying non-UUIDs (e.g. RFID tags)
      if (finalUserId && !isUUID(finalUserId)) {
        if (finalReason === "Unregistered RFID") {
          finalReason = `Unregistered RFID: ${finalUserId}`;
        } else {
          finalReason = finalReason ? `${finalReason} (ID: ${finalUserId})` : `Invalid ID: ${finalUserId}`;
        }
        finalUserId = null;
      }

      return {
        libraryId: body.libraryId,
        userId: finalUserId,
        doorId: log.doorId || "MAIN_GATE",
        timestamp: new Date(log.timestamp * 1000),
        status: log.status || "SUCCESS",
        reason: finalReason
      };
    });

    // Bulk insert the logs
    await prisma.entryLog.createMany({
      data: insertData,
      skipDuplicates: true
    });

    // Update user failure counts for flagged students logic
    for (const log of logs) {
      if (log.uid && log.uid !== "UNKNOWN") {
        if (log.status === "DENIED") {
          const reason = log.reason || "Unknown reason";
          await prisma.user.update({
            where: { id: log.uid },
            data: {
              consecutiveFailures: { increment: 1 },
              // Append reason if possible; Prisma doesn't have native string append, so we use string concat hack or just set it:
              // Actually, since we want a comma separated list, we should fetch first or just trust the DB. 
              // A simple approach is just overwriting it with the latest reason, or using an raw query.
              // For safety and speed, we will just update the failureReason.
            }
          });
          
          // To append, we do it in a safer way:
          const user = await prisma.user.findUnique({ where: { id: log.uid }, select: { failureReasons: true } });
          if (user) {
             const newReasons = user.failureReasons ? `${user.failureReasons}, ${reason}` : reason;
             await prisma.user.update({
               where: { id: log.uid },
               data: { failureReasons: newReasons }
             });
          }

        } else if (log.status === "SUCCESS" || !log.status) {
          // Reset failures on success
          await prisma.user.update({
            where: { id: log.uid },
            data: {
              consecutiveFailures: 0,
              failureReasons: null
            }
          });
        }
      }
    }

    // Return a solid HTTP 200 to act as an ACK so the ESP32 knows it can delete the logs from flash/RAM
    return NextResponse.json({ success: true, inserted: insertData.length });

  } catch (error: any) {
    console.error("Failed to process hardware entry logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
