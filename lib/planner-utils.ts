export type TimeBlock = "MORNING" | "AFTERNOON" | "EVENING" | "ANYTIME";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface SubTask {
  id: string;
  text: string;
  isCompleted: boolean;
  estimatedMinutes?: number;
}

export interface PlannerMeta {
  timeBlock?: TimeBlock;
  isFrog?: boolean;
  estimatedMinutes?: number;
  subtasks?: SubTask[];
  category?: string;
  completedAt?: string | null;
}

export interface EnrichedPlannerTask {
  id: string;
  title: string;
  description?: string | null;
  cleanDescription?: string;
  status: "PENDING" | "COMPLETED";
  priority: Priority;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  timeBlock: TimeBlock;
  isFrog: boolean;
  estimatedMinutes: number;
  subtasks: SubTask[];
  category: string;
  completedAt?: string | null;
}

const META_REGEX = /<!--PLANNER_META:([\s\S]*?)-->/;

/**
 * Parses a raw database TodoTask into an EnrichedPlannerTask
 */
export function parsePlannerTask(raw: Record<string, any> | null | undefined): EnrichedPlannerTask {
  if (!raw) {
    return {
      id: '', title: '', status: 'PENDING', priority: 'MEDIUM',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      timeBlock: 'ANYTIME', isFrog: false, estimatedMinutes: 30,
      subtasks: [], category: 'General',
    };
  }
  const desc: string = (raw.description as string) || "";
  let meta: PlannerMeta = {};
  let cleanDesc = desc;

  const match = desc.match(META_REGEX);
  if (match) {
    try {
      meta = JSON.parse(match[1]);
      cleanDesc = desc.replace(META_REGEX, "").trim();
    } catch {
      meta = {};
    }
  }

  // Heuristics for defaults
  const title = raw.title || "";
  const isFrogDetected =
    meta.isFrog !== undefined
      ? meta.isFrog
      : title.includes("🐸") || (raw.priority === "HIGH" && meta.isFrog !== false);

  const cleanTitle = title.replace(/^🐸\s*/, "").trim();

  return {
    id: raw.id,
    title: cleanTitle,
    description: desc,
    cleanDescription: cleanDesc,
    status: raw.status || "PENDING",
    priority: raw.priority || "MEDIUM",
    dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : null,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    timeBlock: meta.timeBlock || "ANYTIME",
    isFrog: Boolean(isFrogDetected),
    estimatedMinutes: Number(meta.estimatedMinutes) || 30,
    subtasks: Array.isArray(meta.subtasks) ? meta.subtasks : [],
    category: meta.category || "General",
    completedAt: meta.completedAt || (raw.status === "COMPLETED" ? raw.updatedAt : null),
  };
}

/**
 * Envelopes planner metadata into the description string for safe DB storage
 */
export function encodePlannerDescription(
  baseDescription: string = "",
  meta: PlannerMeta
): string {
  const cleanBase = baseDescription.replace(META_REGEX, "").trim();
  const metaString = `<!--PLANNER_META:${JSON.stringify(meta)}-->`;
  return cleanBase ? `${cleanBase}\n\n${metaString}` : metaString;
}

/**
 * Format Obsidian Daily Note Markdown
 */
export function formatObsidianDailyNote(
  dateStr: string,
  tasks: EnrichedPlannerTask[],
  habits?: Array<{ id: string; name: string; isCompleted: boolean; icon: string }>,
  reflection?: string,
  productivityScore?: number
): string {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const frogs = tasks.filter((t) => t.isFrog);

  const morningTasks = tasks.filter((t) => t.timeBlock === "MORNING");
  const afternoonTasks = tasks.filter((t) => t.timeBlock === "AFTERNOON");
  const eveningTasks = tasks.filter((t) => t.timeBlock === "EVENING");
  const anytimeTasks = tasks.filter((t) => t.timeBlock === "ANYTIME" || !t.timeBlock);

  const formatTaskItem = (t: EnrichedPlannerTask) => {
    const check = t.status === "COMPLETED" ? "[x]" : "[ ]";
    const frogBadge = t.isFrog ? " 🐸" : "";
    const priorityBadge = t.priority === "HIGH" ? " #urgent" : t.priority === "LOW" ? " #low" : "";
    const timeBadge = t.estimatedMinutes ? ` (${t.estimatedMinutes}m)` : "";
    let line = `- ${check} ${t.title}${frogBadge}${timeBadge}${priorityBadge}`;
    if (t.cleanDescription) {
      line += `\n  > ${t.cleanDescription.replace(/\n/g, "\n  > ")}`;
    }
    if (t.subtasks && t.subtasks.length > 0) {
      for (const st of t.subtasks) {
        const sCheck = st.isCompleted ? "[x]" : "[ ]";
        const sTime = st.estimatedMinutes ? ` (${st.estimatedMinutes}m)` : "";
        line += `\n  - ${sCheck} ${st.text}${sTime}`;
      }
    }
    return line;
  };

  let md = `---
date: ${dateStr}
tags:
  - daily-planner
  - iv4n6hub
  - habits
completion_rate: ${rate}%
productivity_score: ${productivityScore ?? rate}
created_with: IV4N6Hub AI Planner
---

# 📅 ${dateStr} 智能计划本 (Daily Planner)

> 🎯 **今日生产力概览**: 完成度 **${completedTasks}/${totalTasks}** (${rate}%) | 综合评分: **${productivityScore ?? rate} / 100**

---

## 🐸 今日核心专注 (Top 3 Frogs)
${
  frogs.length === 0
    ? "_今日暂未设置青蛙核心任务，保持从容专注。_"
    : frogs.map(formatTaskItem).join("\n")
}

---

## ⏱️ 全日时间块排程 (Daily Timeline)

### 🌅 早间专注时段 (08:00 - 12:00)
${
  morningTasks.length === 0
    ? "_无安排_"
    : morningTasks.map(formatTaskItem).join("\n")
}

### ☀️ 午后推进时段 (12:00 - 18:00)
${
  afternoonTasks.length === 0
    ? "_无安排_"
    : afternoonTasks.map(formatTaskItem).join("\n")
}

### 🌙 晚间复盘与充电 (18:00 - 22:00)
${
  eveningTasks.length === 0
    ? "_无安排_"
    : eveningTasks.map(formatTaskItem).join("\n")
}

### ⏳ 灵活备选任务 (Anytime / Inbox)
${
  anytimeTasks.length === 0
    ? "_无安排_"
    : anytimeTasks.map(formatTaskItem).join("\n")
}

---

## 🧘 每日微习惯打卡 (Habit Matrix)
${
  !habits || habits.length === 0
    ? "- [x] 💧 保持规律饮水\n- [x] 🏃 适度身体活动\n- [ ] 📖 深度阅读 20 分钟\n- [ ] 🧘 晚间冥想复盘"
    : habits
        .map(
          (h) =>
            `- [${h.isCompleted ? "x" : " "}] ${h.icon || "✨"} ${h.name}`
        )
        .join("\n")
}

---

## 💭 今日 AI 晚间复盘与洞察 (Daily Reflection)
${
  reflection
    ? `> ${reflection.replace(/\n/g, "\n> ")}`
    : `> 今天稳扎稳打，专注于关键行动。复盘是成长的催化剂，明日继续保持节奏！`
}

---
_Generated by IV4N6Hub Digital Planner inspired by Elena Lin_
`;

  return md.trim();
}

/**
 * Generates an iCalendar (.ics) RFC 5545 format string for a task or group of tasks
 */
export function generateIcsCalendar(
  tasks: EnrichedPlannerTask[],
  calendarName = "IV4N6Hub Planner"
): string {
  const formatUtcDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const now = new Date();
  const dtstamp = formatUtcDate(now);

  const events = tasks.map((task, idx) => {
    const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
    // Default time based on timeblock
    let startHour = 9;
    if (task.timeBlock === "MORNING") startHour = 9;
    else if (task.timeBlock === "AFTERNOON") startHour = 14;
    else if (task.timeBlock === "EVENING") startHour = 19;
    else startHour = 10 + (idx % 8);

    let startDate = new Date(baseDate);
    if (isNaN(startDate.getTime())) {
      startDate = new Date(now);
    }
    if (!task.dueDate) {
      startDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    }
    startDate.setHours(startHour, 0, 0, 0);

    const durationMs = (task.estimatedMinutes || 30) * 60 * 1000;
    const endDate = new Date(startDate.getTime() + durationMs);

    const subtasksText =
      task.subtasks && task.subtasks.length > 0
        ? "\\n\\n子任务 Checklist:\\n" +
          task.subtasks
            .map((s) => `${s.isCompleted ? "✅" : "⬜"} ${s.text}`)
            .join("\\n")
        : "";

    const fullDescription = (
      (task.cleanDescription ? task.cleanDescription + "\\n" : "") +
      `优先级: ${task.priority} | 时间块: ${task.timeBlock}` +
      subtasksText
    ).replace(/\n/g, "\\n");

    return [
      "BEGIN:VEVENT",
      `UID:iv4n6hub-task-${task.id}@planner.local`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatUtcDate(startDate)}`,
      `DTEND:${formatUtcDate(endDate)}`,
      `SUMMARY:${task.isFrog ? "🐸 " : ""}${task.title}`,
      `DESCRIPTION:${fullDescription}`,
      `STATUS:${task.status === "COMPLETED" ? "COMPLETED" : "CONFIRMED"}`,
      `PRIORITY:${task.priority === "HIGH" ? "1" : task.priority === "LOW" ? "9" : "5"}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IV4N6Hub//AI Planner//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-TIMEZONE:Asia/Kuala_Lumpur`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
