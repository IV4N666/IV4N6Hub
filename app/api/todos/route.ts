import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  encodePlannerDescription,
  parsePlannerTask,
  PlannerMeta,
  SubTask,
  TimeBlock,
} from "@/lib/planner-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "PENDING" | "COMPLETED" | "ALL"
    const priority = searchParams.get("priority");
    const block = searchParams.get("block"); // "MORNING" | "AFTERNOON" | "EVENING" | "ANYTIME"

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (priority && priority !== "ALL") where.priority = priority;

    const rawTodos = await db.todoTask.findMany({
      where,
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    let todos = rawTodos.map(parsePlannerTask);

    if (block && block !== "ALL") {
      todos = todos.filter((t) => t.timeBlock === block);
    }

    return NextResponse.json({ success: true, count: todos.length, todos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description = "",
      priority = "MEDIUM",
      dueDate,
      timeBlock = "ANYTIME",
      isFrog = false,
      estimatedMinutes = 30,
      subtasks = [],
      category = "General",
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: "Task title is required" }, { status: 400 });
    }

    const meta: PlannerMeta = {
      timeBlock,
      isFrog: Boolean(isFrog),
      estimatedMinutes: Number(estimatedMinutes) || 30,
      subtasks,
      category,
      completedAt: null,
    };

    const finalDescription = encodePlannerDescription(description, meta);

    const rawTodo = await db.todoTask.create({
      data: {
        title: title.trim(),
        description: finalDescription,
        priority: ["HIGH", "MEDIUM", "LOW"].includes(priority) ? priority : "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    const todo = parsePlannerTask(rawTodo);
    return NextResponse.json({ success: true, todo });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      status,
      priority,
      dueDate,
      timeBlock,
      isFrog,
      estimatedMinutes,
      subtasks,
      category,
      action,
      subtaskId,
      batchAllocations,
    } = body;

    // Handle BATCH_SCHEDULE update from AI Day Planner
    if (action === "BATCH_SCHEDULE" && Array.isArray(batchAllocations)) {
      const validAllocs = batchAllocations.filter((a: any) => a?.id);
      // Fetch all records concurrently
      const currentRecords = await Promise.all(
        validAllocs.map((alloc: any) => db.todoTask.findUnique({ where: { id: alloc.id } }))
      );
      // Build update operations
      const updateOps = validAllocs
        .map((alloc: any, idx: number) => {
          const current = currentRecords[idx];
          if (!current) return null;
          const parsed = parsePlannerTask(current);
          const nextMeta: PlannerMeta = {
            timeBlock: alloc.timeBlock || parsed.timeBlock,
            isFrog: alloc.isFrog !== undefined ? alloc.isFrog : parsed.isFrog,
            estimatedMinutes: alloc.estimatedMinutes || parsed.estimatedMinutes,
            subtasks: parsed.subtasks,
            category: parsed.category,
            completedAt: parsed.completedAt,
          };
          return db.todoTask.update({
            where: { id: alloc.id },
            data: {
              description: encodePlannerDescription(parsed.cleanDescription || '', nextMeta),
            },
          });
        })
        .filter(Boolean);
      // Execute all updates atomically in a single transaction
      if (updateOps.length > 0) {
        await db.$transaction(updateOps as any[]);
      }
      return NextResponse.json({ success: true, message: "Batch schedule updated successfully" });
    }

    if (!id) return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });

    const existing = await db.todoTask.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });

    const currentParsed = parsePlannerTask(existing);

    // Handle TOGGLE_SUBTASK
    if (action === "TOGGLE_SUBTASK" && subtaskId) {
      const nextSubtasks = currentParsed.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
      );
      const allDone = nextSubtasks.length > 0 && nextSubtasks.every((st) => st.isCompleted);
      const nextMeta: PlannerMeta = {
        timeBlock: currentParsed.timeBlock,
        isFrog: currentParsed.isFrog,
        estimatedMinutes: currentParsed.estimatedMinutes,
        subtasks: nextSubtasks,
        category: currentParsed.category,
        completedAt: allDone ? new Date().toISOString() : currentParsed.completedAt,
      };

      const updated = await db.todoTask.update({
        where: { id },
        data: {
          description: encodePlannerDescription(currentParsed.cleanDescription, nextMeta),
          status: allDone ? "COMPLETED" : currentParsed.status,
        },
      });
      return NextResponse.json({ success: true, todo: parsePlannerTask(updated) });
    }

    // Merge meta
    const nextMeta: PlannerMeta = {
      timeBlock: timeBlock !== undefined ? timeBlock : currentParsed.timeBlock,
      isFrog: isFrog !== undefined ? Boolean(isFrog) : currentParsed.isFrog,
      estimatedMinutes:
        estimatedMinutes !== undefined ? Number(estimatedMinutes) : currentParsed.estimatedMinutes,
      subtasks: subtasks !== undefined ? subtasks : currentParsed.subtasks,
      category: category !== undefined ? category : currentParsed.category,
      completedAt:
        status === "COMPLETED"
          ? new Date().toISOString()
          : status === "PENDING"
          ? null
          : currentParsed.completedAt,
    };

    const nextDesc =
      description !== undefined
        ? encodePlannerDescription(description, nextMeta)
        : encodePlannerDescription(currentParsed.cleanDescription, nextMeta);

    const updated = await db.todoTask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        description: nextDesc,
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });

    return NextResponse.json({ success: true, todo: parsePlannerTask(updated) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });

    try {
      await db.todoTask.delete({ where: { id } });
    } catch (deleteErr: any) {
      if (deleteErr?.code === "P2025") {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
      }
      throw deleteErr;
    }
    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
