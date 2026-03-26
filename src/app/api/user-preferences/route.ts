import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

const prefsSchema = z.object({
  privacyMode: z.boolean(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id!;
  const [user] = await db.select({ privacyMode: users.privacyMode }).from(users).where(eq(users.id, userId));

  return NextResponse.json({ privacyMode: Boolean(user?.privacyMode) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id!;
  const body = prefsSchema.parse(await req.json());

  await db.update(users)
    .set({ privacyMode: body.privacyMode ? 1 : 0 })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true, privacyMode: body.privacyMode });
}

