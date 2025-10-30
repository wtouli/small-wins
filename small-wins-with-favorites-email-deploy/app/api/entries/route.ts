
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "next-auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ entries: [] }, { status: 200 });
  const user = await prisma.user.upsert({ where: { email: session.user.email! }, update: {}, create: { email: session.user.email!, name: session.user.name || null } });
  const entries = await prisma.entry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.upsert({ where: { email: session.user.email! }, update: {}, create: { email: session.user.email!, name: session.user.name || null } });
  const body = await req.json();
  const entry = await prisma.entry.create({ data: {
    userId: user.id, name: body.name, meal: body.meal || "Snacks", calories: Number(body.calories)||0, protein: Number(body.protein)||0
  }});
  return NextResponse.json(entry);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.entry.delete({ where: { id } }).catch(()=>{});
  return NextResponse.json({ ok: true });
}
