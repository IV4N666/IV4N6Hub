import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  GoogleGenerativeAI,
} from "@google/generative-ai";
import {
  cleanJsonText,
  generateContentWithFallback,
} from "@/lib/gemini";
import {
  EnrichedPlannerTask,
  parsePlannerTask,
  SubTask,
  TimeBlock,
} from "@/lib/planner-utils";

export const dynamic = "force-dynamic";

async function getGeminiKey(): Promise<string | undefined> {
  try {
    const config = await db.appConfig.findUnique({ where: { id: "default" } });
    if (config?.geminiApiKey) return config.geminiApiKey;
  } catch (err) {
    console.error("Failed to fetch Gemini API key from DB:", err);
  }
  return process.env.GEMINI_API_KEY || undefined;
}

const VALID_ACTIONS = ["BREAKDOWN", "SCHEDULE", "REVIEW", "TRANSLATE"] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, taskTitle, taskDescription, tasks, completedHabits, userNotes } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Supported: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }
    const apiKey = await getGeminiKey();

    // 1. ACTION: BREAKDOWN (Task Decomposition into Actionable Steps)
    if (action === "BREAKDOWN") {
      if (!taskTitle || !taskTitle.trim()) {
        return NextResponse.json(
          { success: false, error: "Task title is required for breakdown" },
          { status: 400 }
        );
      }

      if (apiKey) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const prompt = `你是一位专业的高效能个人计划导师（精通电子计划本、GTD时间管理、青蛙法则与微步执行）。
请针对用户的任务目标：“${taskTitle}” ${taskDescription ? `(备注: ${taskDescription})` : ""}，将其拆解为 3 至 5 个具体、即刻可执行的微小行动步骤 (Subtasks)。

每个步骤需满足：
1. 动词开头，清晰明确（如“收集近3个月报表”、“拟定幻灯片大纲”）。
2. 预估所需时间 (分钟，如 10, 15, 25, 30)。
3. 按执行先后逻辑排序。

请严格仅输出 JSON 对象：
{
  "suggestedTimeBlock": "MORNING" | "AFTERNOON" | "EVENING",
  "totalEstimatedMinutes": number,
  "frogReason": string (为什么这项任务重要/是否适合设为今日青蛙任务的简短一句话理由),
  "subtasks": [
    {
      "text": string (步骤简短标题),
      "estimatedMinutes": number (预估分钟数)
    }
  ]
}`;

          const result = await generateContentWithFallback(genAI, apiKey, prompt, {
            responseMimeType: "application/json",
            temperature: 0.2,
          });

          const jsonText = cleanJsonText(result.response.text());
          const parsed = JSON.parse(jsonText);

          const subtasks: SubTask[] = (parsed.subtasks || []).map(
            (s: any, idx: number) => ({
              id: `sub_${Date.now()}_${idx}`,
              text: s.text || `步骤 ${idx + 1}`,
              isCompleted: false,
              estimatedMinutes: Number(s.estimatedMinutes) || 15,
            })
          );

          return NextResponse.json({
            success: true,
            suggestedTimeBlock: parsed.suggestedTimeBlock || "MORNING",
            totalEstimatedMinutes: parsed.totalEstimatedMinutes || 45,
            frogReason: parsed.frogReason || "",
            subtasks,
          });
        } catch (aiErr: any) {
          console.warn("AI breakdown failed, using heuristic fallback:", aiErr);
        }
      }

      // Heuristic Fallback when AI key is not available or timed out
      const fallbackSubtasks: SubTask[] = [
        { id: `sub_${Date.now()}_1`, text: `明确“${taskTitle}”的具体验收标准与资料`, isCompleted: false, estimatedMinutes: 10 },
        { id: `sub_${Date.now()}_2`, text: `拆分关键要点并起草核心框架或初稿`, isCompleted: false, estimatedMinutes: 25 },
        { id: `sub_${Date.now()}_3`, text: `落地执行核心细节并进行自检完善`, isCompleted: false, estimatedMinutes: 20 },
      ];

      return NextResponse.json({
        success: true,
        suggestedTimeBlock: "MORNING",
        totalEstimatedMinutes: 55,
        frogReason: "这是达成今日目标的关键环节，建议在精力充沛时优先攻克。",
        subtasks: fallbackSubtasks,
      });
    }

    // 2. ACTION: SCHEDULE (Smart Day Plan Optimization across Morning/Afternoon/Evening)
    if (action === "SCHEDULE") {
      const rawTasks: any[] = tasks || [];
      if (rawTasks.length === 0) {
        return NextResponse.json({
          success: true,
          message: "当前没有待安排的待办事项。",
          schedule: [],
        });
      }

      const parsedTasks: EnrichedPlannerTask[] = rawTasks.map(parsePlannerTask);
      const pendingTasks = parsedTasks.filter((t) => t.status === "PENDING");

      if (apiKey && pendingTasks.length > 0) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const taskSummaries = pendingTasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            isFrog: t.isFrog,
            estimatedMinutes: t.estimatedMinutes,
          }));

          const prompt = `你是一位顶尖的日程管理专家（如 Elena Lin 的高效电子手帐排程法）。
请根据人类大脑精力周期规律（早间专注做难事/青蛙、午后做沟通与事务型推进、晚间整理复盘或阅读反思），为以下待办任务智能分配最佳时间块：

时间块选项：
- "MORNING" (08:00 - 12:00, 黄金精力期：高难度、今日三只青蛙、深度思考)
- "AFTERNOON" (12:00 - 18:00, 协同推进期：会议、对接、常规工作、多步骤任务)
- "EVENING" (18:00 - 22:00, 晚间复盘期：学习充电、生活整理、复盘反思)
- "ANYTIME" (灵活备选池)

任务列表：
${JSON.stringify(taskSummaries, null, 2)}

请务必从中挑选出最重要、影响最大的 1-3 个任务设为青蛙任务 (isFrog: true)。
请严格返回纯 JSON 格式：
{
  "daySummary": string (一句话今日节奏建议，如“上午攻坚报表，下午协同沟通，节奏明快轻盈”),
  "allocations": [
    {
      "id": string (任务ID),
      "timeBlock": "MORNING" | "AFTERNOON" | "EVENING" | "ANYTIME",
      "isFrog": boolean,
      "estimatedMinutes": number,
      "reason": string (推荐此时段理由)
    }
  ]
}`;

          const result = await generateContentWithFallback(genAI, apiKey, prompt, {
            responseMimeType: "application/json",
            temperature: 0.2,
          });

          const jsonText = cleanJsonText(result.response.text());
          const parsed = JSON.parse(jsonText);

          return NextResponse.json({
            success: true,
            daySummary: parsed.daySummary || "今日节奏已为您智能规划，专注核心，从容前行！",
            allocations: parsed.allocations || [],
          });
        } catch (aiErr: any) {
          console.warn("AI schedule failed, using heuristic fallback:", aiErr);
        }
      }

      // Heuristic Scheduling Fallback
      const allocations = pendingTasks.map((t, idx) => {
        let block: TimeBlock = "ANYTIME";
        let isFrog = t.isFrog;

        if (t.priority === "HIGH" || idx === 0) {
          block = "MORNING";
          isFrog = true;
        } else if (idx % 2 === 1) {
          block = "AFTERNOON";
        } else {
          block = "EVENING";
        }

        return {
          id: t.id,
          timeBlock: block,
          isFrog,
          estimatedMinutes: t.estimatedMinutes || 30,
          reason: isFrog ? "核心要务，早间充沛精力攻克" : "常规推进，匹配合理能量区间",
        };
      });

      return NextResponse.json({
        success: true,
        daySummary: "已根据任务紧急度智能分配合适时段，愿今天专注而富有成效！",
        allocations,
      });
    }

    // 3. ACTION: REVIEW (Evening Reflection & Wrap-up)
    if (action === "REVIEW") {
      const rawTasks: any[] = tasks || [];
      const parsedTasks = rawTasks.map(parsePlannerTask);

      const completed = parsedTasks.filter((t) => t.status === "COMPLETED");
      const pending = parsedTasks.filter((t) => t.status === "PENDING");
      const habitsList = completedHabits || [];

      if (apiKey) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const prompt = `你是一位温柔、深刻而富有洞察力的个人手账计划本私教（如同 Elena Lin 视频中的晚间复盘指引）。
请对用户今天的完成情况进行全面晚间复盘：

【今日已完成事项 (${completed.length}项)】:
${completed.map((t) => `- [已完成] ${t.title} (耗时约${t.estimatedMinutes}分钟)`).join("\n") || "今日尚无已勾选事项"}

【今日未完成事项 (${pending.length}项)】:
${pending.map((t) => `- [未完成] ${t.title} (${t.priority}优先级)`).join("\n") || "所有任务均已达成！"}

【习惯打卡】:
${habitsList.length > 0 ? habitsList.join(", ") : "未记录特定习惯"}

【用户日间随笔/备注】:
${userNotes || "无特别随笔"}

请按以下格式严格输出 JSON：
{
  "productivityScore": number (0-100的综合生产力与身心平衡评分),
  "highlight": string (今日最值得赞赏与肯定的1个亮点),
  "reflectionText": string (150字以内的晚间复盘寄语，温和而有力量，结合完成情况肯定付出，并对未完成任务给出舒缓的心态调节),
  "tomorrowAdvice": string (对明天的1-2条具体行动或精力分配建议),
  "rolloverTaskIds": string[] (建议顺延至明天首要处理的任务ID)
}`;

          const result = await generateContentWithFallback(genAI, apiKey, prompt, {
            responseMimeType: "application/json",
            temperature: 0.3,
          });

          const jsonText = cleanJsonText(result.response.text());
          const parsed = JSON.parse(jsonText);

          return NextResponse.json({
            success: true,
            productivityScore: parsed.productivityScore || 85,
            highlight: parsed.highlight || "今日专注于关键行动，迈出了坚实步伐！",
            reflectionText:
              parsed.reflectionText ||
              "今天你付出了宝贵的时间与专注。无论完成多少，行动本身就是最大的胜利。今晚请好好放松蓄力，明天又是充满无限可能的一天！",
            tomorrowAdvice: parsed.tomorrowAdvice || "建议明天早晨先吃掉最重要的那只青蛙任务，保持轻盈心态。",
            rolloverTaskIds: parsed.rolloverTaskIds || pending.slice(0, 3).map((t) => t.id),
          });
        } catch (aiErr: any) {
          console.warn("AI review failed, using heuristic fallback:", aiErr);
        }
      }

      // Heuristic Fallback
      const score = Math.min(
        100,
        Math.max(40, Math.round((completed.length / (rawTasks.length || 1)) * 100))
      );

      return NextResponse.json({
        success: true,
        productivityScore: score,
        highlight: completed.length > 0 ? `成功完成了 ${completed[0].title} 等核心事项！` : "开始记录并正视自己的日常步调！",
        reflectionText:
          "今天无论完成了多少，每一步前行都算数。接纳不完美，正是自我进化的起点。今晚好好休息，明天继续从容出发！",
        tomorrowAdvice: "建议明天清晨精选 3 件事专注攻克，切勿被杂务分散注意力。",
        rolloverTaskIds: pending.map((t) => t.id),
      });
    }

    // 4. ACTION: TRANSLATE / POLISH (Bilingual Polish as featured in video comments)
    if (action === "TRANSLATE") {
      const textToTranslate = taskTitle || taskDescription || "";
      if (!textToTranslate) {
        return NextResponse.json({ success: false, error: "Text is required" }, { status: 400 });
      }

      if (apiKey) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const prompt = `请将以下计划本待办/笔记内容进行优雅的双语转换与精炼润色：
原文: "${textToTranslate}"

如果原文是中文，请翻译为自然地道的英文，并提炼为清晰专业的行动短语；如果原文是英文，请翻译为凝练中文。
输出 JSON 格式：
{
  "translatedText": string (精炼双语译文),
  "polishedSummary": string (一句话高级手账风格的表达)
}`;
          const result = await generateContentWithFallback(genAI, apiKey, prompt, {
            responseMimeType: "application/json",
            temperature: 0.1,
          });

          const jsonText = cleanJsonText(result.response.text());
          const parsed = JSON.parse(jsonText);
          return NextResponse.json({
            success: true,
            translatedText: parsed.translatedText,
            polishedSummary: parsed.polishedSummary,
          });
        } catch (e: any) {
          console.warn("AI translate error:", e);
        }
      }

      return NextResponse.json({
        success: true,
        translatedText: textToTranslate,
        polishedSummary: textToTranslate,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Planner API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
