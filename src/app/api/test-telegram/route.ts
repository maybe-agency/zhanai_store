import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST() {
  await sendTelegramMessage("🌷 Test message from Zhanai Store");

  return NextResponse.json({ success: true });
}
