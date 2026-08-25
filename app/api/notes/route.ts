import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q");

    const where: any = {};
    if (category && category !== "ALL") where.category = category;
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { content: { contains: query } },
      ];
    }

    const notes = await db.note.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, count: notes.length, notes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, category = "General", isPinned = false, color = "#3b82f6" } = body;

    if (!title && !content) {
      return NextResponse.json({ success: false, error: "Note title or content is required" }, { status: 400 });
    }

    const note = await db.note.create({
      data: {
        title: title || "Quick Note",
        content: content || "",
        category,
        isPinned,
        color,
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, category, isPinned, color } = body;

    if (!id) return NextResponse.json({ success: false, error: "Note ID is required" }, { status: 400 });

    const note = await db.note.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(isPinned !== undefined && { isPinned }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, error: "Note ID is required" }, { status: 400 });

    await db.note.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Note deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
