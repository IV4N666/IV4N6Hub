"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  Calendar,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { EnrichedPlannerTask, formatObsidianDailyNote } from "@/lib/planner-utils";

interface PlannerExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: EnrichedPlannerTask[];
  habits?: Array<{ id: string; name: string; isCompleted: boolean; icon: string }>;
  reflection?: string;
  productivityScore?: number;
}

export const PlannerExportModal: React.FC<PlannerExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  habits,
  reflection,
  productivityScore,
}) => {
  const [activeTab, setActiveTab] = useState<"OBSIDIAN" | "CALENDAR">("OBSIDIAN");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const obsidianMarkdown = formatObsidianDailyNote(
    todayStr,
    tasks,
    habits,
    reflection,
    productivityScore
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(obsidianMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([obsidianMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${todayStr}-Daily-Planner.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadIcs = () => {
    window.open(`/api/todos/export?type=calendar&date=${todayStr}`, "_blank");
  };

  // Google Calendar Quick Add link for top pending task
  const topTask = tasks.find((t) => t.status === "PENDING" && t.isFrog) || tasks.find((t) => t.status === "PENDING");
  const googleCalendarUrl = topTask
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        (topTask.isFrog ? "🎯 " : "") + topTask.title
      )}&details=${encodeURIComponent(
        topTask.cleanDescription || "IV4N6Hub 计划本任务"
      )}&dates=${todayStr.replace(/-/g, "")}T090000Z/${todayStr.replace(/-/g, "")}T100000Z`
    : "https://calendar.google.com";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                计划本多维生态联动
                <span className="text-[10px] rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 font-bold">
                  Obsidian & 日历
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                打通本地笔记知识库与系统原生日程，兼顾深度沉淀与日程通知。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-4 pt-2 bg-slate-950/40">
          <button
            onClick={() => setActiveTab("OBSIDIAN")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === "OBSIDIAN"
                ? "border-purple-500 text-purple-300"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>Obsidian<span className="hidden sm:inline"> / Markdown</span> 联动</span>
          </button>
          <button
            onClick={() => setActiveTab("CALENDAR")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === "CALENDAR"
                ? "border-sky-500 text-sky-300"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span><span className="hidden sm:inline">Apple / Google </span>系统日历联动</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === "OBSIDIAN" ? (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <p className="text-xs text-slate-400">
                  一键将今日计划、时间块、青蛙要务、习惯打卡与 AI 复盘导出为 Obsidian Daily Note 规范格式：
                </p>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-md shadow-purple-600/30 active:scale-95"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "已复制！" : "复制 Markdown"}</span>
                  </button>

                  <button
                    onClick={handleDownloadMd}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 text-xs font-bold transition-all active:scale-95"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>下载 .md</span>
                  </button>
                </div>
              </div>

              {/* Code Preview */}
              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-72">
                <pre className="whitespace-pre-wrap">{obsidianMarkdown}</pre>
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3 text-[11px] text-purple-200/90 leading-relaxed">
                💡 <span className="font-bold text-purple-300">使用技巧</span>: 复制后直接粘贴到您电脑或手机 Obsidian 的 Daily Notes 每日日记中，所有 `- [ ]` 待办复选框和标签均可原生双链交互！
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                将计划本中的定时待办与全天排程直接同步至 iPhone 日历、Mac 日历、Google 日历或 Outlook：
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">🍎</span>
                      <h3 className="text-xs font-bold text-white">
                        Apple / Mac / Outlook 日历 (.ics)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      下载标准 iCalendar 格式文件，点击即可导入 iPhone/Mac 自带日历，带有闹钟提醒与时间块划分。
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadIcs}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-xs font-bold transition-all shadow-md shadow-sky-600/30 active:scale-95"
                  >
                    <Download className="h-4 w-4" />
                    <span>下载今日日程 .ics</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">🌐</span>
                      <h3 className="text-xs font-bold text-white">Google Calendar 快速添加</h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      直接在浏览器新标签页打开 Google 日历并自动填入今日核心青蛙任务与时间。
                    </p>
                  </div>

                  <a
                    href={googleCalendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 text-xs font-bold transition-all active:scale-95"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>在 Google 日历打开</span>
                  </a>
                </div>
              </div>

              {/* Tasks Scheduled Preview */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-300">
                  本次导出的日程事项 ({tasks.length}项):
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-slate-900 border border-slate-800/80"
                    >
                      <span className="truncate text-slate-300">
                        {t.isFrog ? "🎯 " : ""}
                        {t.title}
                      </span>
                      <span className="font-mono text-slate-400 shrink-0 ml-2">
                        {t.timeBlock} · {t.estimatedMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 text-xs font-bold transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
