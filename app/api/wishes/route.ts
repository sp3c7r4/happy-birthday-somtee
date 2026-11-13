import { NextResponse } from "next/server";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Wish } from "@/models/Wish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_TEXT = 500;
const MAX_NAME = 80;

type LeanWish = { _id: Types.ObjectId; text: string; from: string; createdAt: Date };

function serialize(w: LeanWish) {
  return {
    id: w._id.toString(),
    text: w.text,
    from: w.from,
    createdAt: new Date(w.createdAt).toISOString(),
  };
}

export async function GET() {
  try {
    await connectToDatabase();
    const docs = await Wish.find().sort({ createdAt: -1 }).limit(200).lean<LeanWish[]>();
    return NextResponse.json({ wishes: docs.map(serialize) });
  } catch (err) {
    console.error("GET /api/wishes failed", err);
    return NextResponse.json({ error: "Could not load wishes." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, from } = (body ?? {}) as { text?: unknown; from?: unknown };

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Please write a wish first." }, { status: 400 });
  }
  if (text.trim().length > MAX_TEXT) {
    return NextResponse.json({ error: `Wishes can be up to ${MAX_TEXT} characters.` }, { status: 400 });
  }
  const name =
    typeof from === "string" && from.trim() ? from.trim().slice(0, MAX_NAME) : "A proud teammate";

  try {
    await connectToDatabase();
    const created = await Wish.create({ text: text.trim(), from: name });
    const wish = serialize(created.toObject() as unknown as LeanWish);
    return NextResponse.json({ wish }, { status: 201 });
  } catch (err) {
    console.error("POST /api/wishes failed", err);
    return NextResponse.json({ error: "Could not save your wish." }, { status: 500 });
  }
}
