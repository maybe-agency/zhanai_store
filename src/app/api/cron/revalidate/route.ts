import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  revalidatePath("/");

  return NextResponse.json({
    revalidated: true,
    path: "/",
  });
}
