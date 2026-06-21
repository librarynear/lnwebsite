"use server";
import { getSession } from "./auth-actions";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function generateEntryQR(libraryId: string, doorId: string = "MAIN_GATE") {
  const session = await getSession();
  if (!session || !session.userId) {
    return { error: "Unauthorized" };
  }

  // Verify the user has an active booking for this library right now
  const now = new Date();
  const activeBooking = await prisma.booking.findFirst({
    where: {
      studentId: session.userId,
      libraryId: libraryId,
      status: "CONFIRMED",
      startTime: { lte: now },
      endTime: { gte: now },
      isPaused: false
    }
  });

  if (!activeBooking) {
    // Maybe they are the librarian or staff?
    const library = await prisma.library.findFirst({
      where: {
        id: libraryId,
        OR: [
          { librarianId: session.userId },
          { staff: { some: { id: session.userId } } }
        ]
      }
    });

    if (!library) {
      return { error: "No active subscription found for this library." };
    }
  }

  // Generate the payload
  const timestamp = Math.floor(Date.now() / 1000);

  // Format A: {"uid":"EMP001", "iat":1718790000, "qid":"uuid", "sig":"..."}
  // The ESP32 will verify the signature over: uid + iat + qid
  const qid = crypto.randomUUID();
  const payloadToSign = `${session.userId}${timestamp}${qid}`;

  const privateKeyBase64 = process.env.ECDSA_PRIVATE_KEY;
  if (!privateKeyBase64) {
    console.error("Missing ECDSA_PRIVATE_KEY in environment");
    return { error: "Server configuration error" };
  }

  try {
    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
    
    const sign = crypto.createSign('SHA256');
    sign.update(payloadToSign);
    sign.end();
    
    // The ESP32 mbedtls ECDSA requires the signature to be standard DER or raw.
    // The Python script example generated a standard DER signature encoded in Base64.
    // Node.js createSign defaults to DER format.
    const signature = sign.sign(privateKey, 'base64');

    const qrData = {
      uid: session.userId,
      iat: timestamp,
      qid: qid,
      door: doorId,
      sig: signature
    };

    return { success: true, qrData: JSON.stringify(qrData) };

  } catch (error: any) {
    console.error("Error signing QR:", error);
    return { error: "Failed to generate secure QR code" };
  }
}
