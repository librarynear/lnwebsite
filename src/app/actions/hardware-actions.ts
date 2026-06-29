"use server";
import { getSession } from "./auth-actions";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { endOfDayIST } from "@/lib/date-utils";

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
    let privateKey = privateKeyBase64;
    if (!privateKeyBase64.includes('-----BEGIN PRIVATE KEY-----')) {
      // It must be base64 encoded, let's decode it
      try {
        privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
      } catch (e) {
        console.error("Failed to decode ECDSA_PRIVATE_KEY from base64");
      }
    }

    const sign = crypto.createSign('SHA256');
    sign.update(payloadToSign);
    sign.end();
    
    // The ESP32 mbedtls ECDSA requires the signature to be standard DER or raw.
    // Node.js createSign defaults to DER format.
    const signature = sign.sign(privateKey, 'base64');

    const qrData = {
      uid: session.userId,
      iat: timestamp,
      qid: qid,
      door: doorId,
      sig: signature
    };

    return { success: true, qrPayload: JSON.stringify(qrData) };

  } catch (error: any) {
    console.error("Error signing QR:", error);
    return { error: "Failed to generate secure QR code" };
  }
}

export async function generateProvisioningQR(libraryId: string, ssid: string, pass: string) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { error: "Unauthorized" };
  }

  // Verify the user is the librarian or admin of this library
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
    return { error: "Unauthorized: You do not have permission to provision hardware for this library." };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const qid = crypto.randomUUID();
  const uid = "PROVISION";

  // The signature must cover the WiFi credentials and library ID to prevent tampering
  const payloadToSign = `${uid}${timestamp}${qid}${ssid}${pass}${libraryId}`;

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
    
    const signature = sign.sign(privateKey, 'base64');

    const payload = {
      cmd: "PROVISION",
      uid,
      iat: timestamp,
      qid,
      sig: signature,
      ssid,
      pass,
      libId: libraryId
    };

    return { success: true, qrPayload: JSON.stringify(payload) };
  } catch (error) {
    console.error("Failed to sign Provisioning QR payload:", error);
    return { error: "Signature generation failed" };
  }
}

export async function generateRFIDCommandQR(studentId: string, cmd: "ADD_RFID" | "REVOKE_RFID", rfid: string, exp: number = 0) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { error: "Unauthorized" };
  }

  // Verify the caller is the librarian (assuming they have access if they can see the student)
  // To keep it simple, we trust the caller if session exists, but ideally we'd check librarian role.
  
  // Update database first
  try {
    if (cmd === "ADD_RFID") {
      const existing = await prisma.user.findFirst({ where: { rfidTag: rfid } });
      if (existing && existing.id !== studentId) {
        return { error: `RFID Tag ${rfid} is already assigned to another student (${existing.name || 'Unknown'}).` };
      }

      await prisma.user.update({
        where: { id: studentId },
        data: { rfidTag: rfid }
      });
    } else if (cmd === "REVOKE_RFID") {
      await prisma.user.update({
        where: { id: studentId },
        data: { rfidTag: null }
      });
    }
  } catch (error) {
    console.error("Failed to update RFID in DB:", error);
    return { error: "Failed to update RFID in Database" };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const qid = crypto.randomUUID();
  const doorId = "MAIN_GATE";

  // Payload to verify: cmd + rfid + exp + uid + iat + qid
  const payloadToSign = `${cmd}${rfid}${exp}${studentId}${timestamp}${qid}`;

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
    
    const signature = sign.sign(privateKey, 'base64');

    const payload = {
      cmd,
      rfid,
      exp,
      uid: studentId,
      iat: timestamp,
      qid,
      doorId,
      sig: signature
    };

    return { success: true, qrPayload: JSON.stringify(payload) };
  } catch (error) {
    console.error("Failed to sign RFID Command QR payload:", error);
    return { error: "Signature generation failed" };
  }
}

export async function addOfflineStudentWithRFID(formData: FormData) {
  // Auth guard
  const session = await getSession();
  if (!session || (session.role !== 'LIBRARIAN' && session.role !== 'ADMIN')) {
    return { error: 'Unauthorized' };
  }

  const name = (formData.get("name") as string)?.trim();
  const rfidTag = (formData.get("rfidTag") as string)?.trim();
  const planId = formData.get("planId") as string;
  const seatId = formData.get("seatId") as string;
  const paymentMethod = (formData.get("paymentMethod") as string) || "CASH";
  const startDateStr = formData.get("startDate") as string;

  if (!name) return { error: "Student name is required" };
  if (!rfidTag) return { error: "RFID Tag is required" };
  if (!planId) return { error: "Plan is required" };

  const library = await prisma.library.findFirst({ 
    where: { librarianId: session.userId } 
  });
  if (!library) return { error: "No library found." };

  // Scope the plan
  const plan = await prisma.plan.findFirst({ where: { id: planId, libraryId: library.id, isActive: true } });
  if (!plan) return { error: "Selected plan is not available for this library." };

  const isFlexible = plan.type === 'FLEXIBLE';
  if (!isFlexible && (!seatId || seatId === "NONE")) {
    return { error: "Please select a seat for this reserved plan." };
  }

  // Check if RFID tag is already assigned
  const existingRfid = await prisma.user.findFirst({ where: { rfidTag } });
  if (existingRfid) {
    return { error: `RFID Tag ${rfidTag} is already assigned to another student (${existingRfid.name || 'Unknown'}).` };
  }

  try {
    let newUserId = "";
    let finalExpiry = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Create the Offline User
      // Generate a dummy unique phone to satisfy the schema's @unique constraint
      const dummyPhone = `OFFLINE_${crypto.randomUUID()}`;
      
      // We also need to generate a uniqueId (FD-YYXXXX)
      let isUnique = false;
      let newUniqueId = '';
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const yearStr = new Date().getFullYear().toString().slice(2, 4);

      while (!isUnique) {
        let randomPart = '';
        for (let i = 0; i < 4; i++) {
          randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        newUniqueId = "FD-" + yearStr + randomPart;
        const existing = await tx.user.findUnique({ where: { uniqueId: newUniqueId } });
        if (!existing) isUnique = true;
      }

      const student = await tx.user.create({
        data: {
          role: "STUDENT",
          name,
          phone: dummyPhone,
          uniqueId: newUniqueId,
          rfidTag,
        }
      });
      newUserId = student.id;

      // 2. Validate Seat (if applicable)
      let seat = null;
      let startTime = startDateStr ? new Date(startDateStr) : new Date();
      const endTime = endOfDayIST(startTime, plan.validityDays - 1);
      
      finalExpiry = Math.floor(endTime.getTime() / 1000);

      if (!isFlexible) {
        seat = await tx.seat.findFirst({ where: { id: seatId, libraryId: library.id } });
        if (!seat) throw new Error("Invalid seat");

        const clash = await tx.booking.findFirst({
          where: {
            seatId: seat.id,
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
            startTime: { lt: endTime },
            endTime: { gt: startTime }
          }
        });
        if (clash) throw new Error("SEAT_TAKEN");
      }

      // 3. Create Booking
      await tx.booking.create({
        data: {
          studentId: student.id,
          libraryId: library.id,
          planId: plan.id,
          seatId: seat ? seat.id : null,
          startTime,
          endTime,
          status: "CONFIRMED",
          paymentRef: `MANUAL_${paymentMethod}_${Date.now()}`
        }
      });
    }, { isolationLevel: 'Serializable' });

    // 4. Generate the QR Code payload (re-using the logic)
    const timestamp = Math.floor(Date.now() / 1000);
    const qid = crypto.randomUUID();
    const payloadToSign = `ADD_RFID${rfidTag}${finalExpiry}${newUserId}${timestamp}${qid}`;

    const privateKeyBase64 = process.env.ECDSA_PRIVATE_KEY;
    if (!privateKeyBase64) return { error: "Server config error: Missing ECDSA_PRIVATE_KEY" };

    let privateKey = privateKeyBase64;
    if (!privateKeyBase64.includes('-----BEGIN PRIVATE KEY-----')) {
      try {
        privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
      } catch (e) {
        console.error("Failed to decode ECDSA_PRIVATE_KEY from base64");
      }
    }

    const sign = crypto.createSign('SHA256');
    sign.update(payloadToSign);
    sign.end();
    
    let signature;
    try {
      signature = sign.sign(privateKey, 'base64');
    } catch (sigErr) {
      console.error("Signature generation failed:", sigErr);
      return { error: "Failed to generate signature (Invalid ECDSA_PRIVATE_KEY format)" };
    }

    const qrPayload = {
      cmd: "ADD_RFID",
      rfid: rfidTag,
      exp: finalExpiry,
      uid: newUserId,
      iat: timestamp,
      qid,
      doorId: "MAIN_GATE",
      sig: signature
    };

    return { success: true, qrPayload: JSON.stringify(qrPayload) };

  } catch (e: any) {
    if (e.message === 'SEAT_TAKEN') return { error: "Seat is already booked for this duration" };
    // Prevent Next.js from crashing serialization by returning only the message string
    return { error: e?.message || "Failed to register offline student" };
  }
}
