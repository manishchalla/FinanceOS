import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [row] = await db.select({ privacyMode: users.privacyMode, userArchetype: users.userArchetype })
    .from(users).where(eq(users.id, session.user.id!)).limit(1);
  return NextResponse.json({ privacyMode: Boolean(row?.privacyMode), archetype: row?.userArchetype ?? null });
}

const schema = z.object({
  privacyMode: z.boolean().optional(),
  archetype: z.enum(["credit_rebuilder","cash_surfer","wealth_builder","debt_destroyer"]).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.parse(await req.json());
  const update: Record<string, unknown> = {};
  if (body.privacyMode !== undefined) update.privacyMode = body.privacyMode ? 1 : 0;
  if (body.archetype !== undefined) update.userArchetype = body.archetype;
  if (Object.keys(update).length > 0) {
    await db.update(users).set(update).where(eq(users.id, session.user.id!));
  }
  return NextResponse.json({ success: true });
}
