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
    const insertData = await Promise.all(logs.map(async (log: any) => {
      let finalUserId = log.uid !== "UNKNOWN" && log.uid ? log.uid : null;
      let finalReason = log.reason || null;

      // Prevent Foreign Key crash on EntryLog by nullifying non-UUIDs (e.g. RFID tags)
      if (finalUserId && !isUUID(finalUserId)) {
        // The hardware sent an RFID tag instead of a UUID, let's look it up
        const userByRfid = await prisma.user.findUnique({
          where: { rfidTag: finalUserId }
        });

        if (userByRfid) {
          finalUserId = userByRfid.id;
          if (finalReason === "Unregistered RFID") {
            finalReason = "Access Denied: Inactive/Expired Plan";
          }
        } else {
          if (finalReason === "Unregistered RFID") {
            finalReason = `Unregistered RFID: ${finalUserId}`;
          } else {
            finalReason = finalReason ? `${finalReason} (ID: ${finalUserId})` : `Invalid ID: ${finalUserId}`;
          }
          finalUserId = null;
        }
      }

      return {
        libraryId: body.libraryId,
        userId: finalUserId,
        doorId: log.doorId || "MAIN_GATE",
        timestamp: new Date(log.timestamp * 1000),
        status: log.status || "SUCCESS",
        reason: finalReason
      };
    }));

    // --- Deduplication Logic ---
    // 1. Deduplicate within the incoming batch itself
    const uniqueInsertData = [];
    const seenMap = new Set();
    for (const log of insertData) {
      const key = `${log.libraryId}-${log.userId}-${log.doorId}-${log.timestamp.getTime()}-${log.status}-${log.reason}`;
      if (!seenMap.has(key)) {
        seenMap.add(key);
        uniqueInsertData.push(log);
      }
    }

    // 2. Check the database for recently inserted identical logs (within the last 15 seconds) to prevent cross-request duplicates
    const finalInsertData = [];
    for (const log of uniqueInsertData) {
      const tenSecondsAgo = new Date(log.timestamp.getTime() - 15000);
      const tenSecondsFuture = new Date(log.timestamp.getTime() + 15000);
      
      const existingLog = await prisma.entryLog.findFirst({
        where: {
          libraryId: log.libraryId,
          userId: log.userId,
          doorId: log.doorId,
          status: log.status,
          reason: log.reason,
          timestamp: {
            gte: tenSecondsAgo,
            lte: tenSecondsFuture
          }
        }
      });

      if (!existingLog) {
        finalInsertData.push(log);
      }
    }

    if (finalInsertData.length === 0) {
      // If all were duplicates, just return success immediately
      return NextResponse.json({ success: true, inserted: 0, note: "All logs were duplicates" });
    }

    // Bulk insert the logs
    await prisma.entryLog.createMany({
      data: finalInsertData,
      skipDuplicates: true
    });

    // Update user failure counts for flagged students logic
    for (const log of finalInsertData) {
      if (log.userId && log.userId !== "UNKNOWN") {
        if (log.status === "DENIED") {
          const reason = log.reason || "Unknown reason";
          
          const user = await prisma.user.findUnique({ where: { id: log.userId }, select: { failureReasons: true } });
          if (user) {
             const newReasons = user.failureReasons ? `${user.failureReasons}, ${reason}` : reason;
             await prisma.user.update({
               where: { id: log.userId },
               data: { 
                 consecutiveFailures: { increment: 1 },
                 failureReasons: newReasons 
               }
             });
          }
        } else if (log.status === "SUCCESS" || !log.status) {
          // Reset failures on success
          await prisma.user.update({
            where: { id: log.userId },
            data: {
              consecutiveFailures: 0,
              failureReasons: null
            }
          });
        }
      }
    }

    // Return a solid HTTP 200 to act as an ACK so the ESP32 knows it can delete the logs from flash/RAM
    return NextResponse.json({ success: true, inserted: finalInsertData.length });

  } catch (error: any) {
    console.error("Failed to process hardware entry logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
