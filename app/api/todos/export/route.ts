import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  formatObsidianDailyNote,
  generateIcsCalendar,
  parsePlannerTask,
} from "@/lib/planner-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "obsidian" | "calendar" | "ics"
    const download = searchParams.get("download") === "true";
    const taskId = searchParams.get("id");
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Fetch todos
    let rawTodos;
    if (taskId) {
      const single = await db.todoTask.findUnique({ where: { id: taskId } });
      rawTodos = single ? [single] : [];
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      rawTodos = await db.todoTask.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
        take: 500,
      });
    }

    const tasks = rawTodos.map(parsePlannerTask);

    // 1. Obsidian Markdown Export
    if (type === "obsidian") {
      const habitsParam = searchParams.get("habits");
      let habitsList = undefined;
      if (habitsParam) {
        try {
          habitsList = JSON.parse(habitsParam);
        } catch {}
      }

      const reflection = searchParams.get("reflection") || undefined;
      const score = searchParams.get("score") ? Number(searchParams.get("score")) : undefined;

      const markdown = formatObsidianDailyNote(dateStr, tasks, habitsList, reflection, score);
      const filename = `${dateStr}-Daily-Planner.md`;

      if (download) {
        return new NextResponse(markdown, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        markdown,
        filename,
      });
    }

    // 2. iCalendar (.ics) System Calendar Export
    if (type === "calendar" || type === "ics") {
      const icsData = generateIcsCalendar(tasks, `IV4N6Hub ${dateStr}`);
      const filename = taskId ? `task-${taskId}.ics` : `${dateStr}-schedule.ics`;

      return new NextResponse(icsData, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid export type. Supported: 'obsidian', 'calendar', 'ics'" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Export API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
