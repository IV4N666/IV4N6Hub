"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  CheckSquare,
  StickyNote,
  Plus,
  Trash2,
  Pin,
  Mic,
  MicOff,
  Sparkles,
  Clock,
  Search,
  CheckCircle2,
  Circle,
  FileText,
  Calendar,
  Moon,
  BookOpen,
  Share2,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";
import {
  EnrichedPlannerTask,
  parsePlannerTask,
  SubTask,
  TimeBlock,
} from "@/lib/planner-utils";
import { PlannerFrogBanner } from "@/components/planner/PlannerFrogBanner";
import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { HabitItem, PlannerHabitTracker } from "@/components/planner/PlannerHabitTracker";
import { PlannerExportModal } from "@/components/planner/PlannerExportModal";
import { AIReviewModal } from "@/components/planner/AIReviewModal";
import { AITaskBreakdownModal } from "@/components/planner/AITaskBreakdownModal";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  color: string;
  createdAt: string;
}

export default function NotesAndTasksPage() {
  const [activeTab, setActiveTab] = useState<"PLANNER" | "TODOS" | "NOTES">("PLANNER");
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<EnrichedPlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiScheduling, setAiScheduling] = useState(false);
  const [daySummaryBanner, setDaySummaryBanner] = useState<string | null>(null);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [targetBreakdownTask, setTargetBreakdownTask] = useState<EnrichedPlannerTask | null>(null);

  // Habit state passed to review/export
  const [habitsList, setHabitsList] = useState<HabitItem[]>([]);

  // Task creation state
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDescription, setNewTodoDescription] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [newTodoTimeBlock, setNewTodoTimeBlock] = useState<TimeBlock>("ANYTIME");
  const [newTodoIsFrog, setNewTodoIsFrog] = useState(false);
  const [newTodoEstMinutes, setNewTodoEstMinutes] = useState(30);

  // Note creation state
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("General");
  const [newNoteColor, setNewNoteColor] = useState("#3b82f6");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [notesRes, todosRes] = await Promise.all([
        fetch("/api/notes"),
        fetch("/api/todos"),
      ]);
      const notesData = await notesRes.json();
      const todosData = await todosRes.json();

      if (notesData.success) setNotes(notesData.notes || []);
      if (todosData.success) {
        setTasks((todosData.todos || []).map(parsePlannerTask));
      }
    } catch (err) {
      console.error("Failed to load notes/todos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cleanup: release microphone on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      // Release all mic tracks
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Task Operations
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          description: newTodoDescription.trim(),
          priority: newTodoPriority,
          dueDate: newTodoDueDate || null,
          timeBlock: newTodoTimeBlock,
          isFrog: newTodoIsFrog,
          estimatedMinutes: newTodoEstMinutes,
          subtasks: [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => [data.todo, ...prev]);
        setNewTodoTitle("");
        setNewTodoDescription("");
        setNewTodoDueDate("");
        setNewTodoIsFrog(false);
        setIsCreatingTask(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTask = async (task: EnrichedPlannerTask) => {
    const nextStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    // Optimistic UI update
    setTasks(prev => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));

    try {
      await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleToggleFrog = async (task: EnrichedPlannerTask) => {
    const nextFrog = !task.isFrog;
    setTasks(prev => prev.map((t) => (t.id === task.id ? { ...t, isFrog: nextFrog } : t)));

    try {
      await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, isFrog: nextFrog }),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleUpdateTaskBlock = async (task: EnrichedPlannerTask, block: TimeBlock) => {
    setTasks(prev => prev.map((t) => (t.id === task.id ? { ...t, timeBlock: block } : t)));

    try {
      await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, timeBlock: block }),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    // Optimistic update
    setTasks(prev =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextSubs = t.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
          );
          const allDone = nextSubs.length > 0 && nextSubs.every((s) => s.isCompleted);
          return {
            ...t,
            subtasks: nextSubs,
            status: allDone ? "COMPLETED" : t.status,
          };
        }
        return t;
      })
    );

    try {
      await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          action: "TOGGLE_SUBTASK",
          subtaskId,
        }),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/todos?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleOpenBreakdown = (task: EnrichedPlannerTask) => {
    setTargetBreakdownTask(task);
    setIsBreakdownOpen(true);
  };

  const handleSaveSubtasks = async (
    taskId: string,
    subtasks: SubTask[],
    suggestedBlock?: TimeBlock,
    estimatedMinutes?: number
  ) => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks,
              timeBlock: suggestedBlock || t.timeBlock,
              estimatedMinutes: estimatedMinutes || t.estimatedMinutes,
            }
          : t
      )
    );

    try {
      await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          subtasks,
          timeBlock: suggestedBlock,
          estimatedMinutes,
        }),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  // AI Whole Day Scheduling
  const handleAiSchedule = async () => {
    try {
      setAiScheduling(true);
      const res = await fetch("/api/todos/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SCHEDULE",
          tasks,
        }),
      });
      const data = await res.json();
      if (data.success && data.allocations) {
        // Apply batch schedule to database
        await fetch("/api/todos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "BATCH_SCHEDULE",
            batchAllocations: data.allocations,
          }),
        });

        if (data.daySummary) {
          setDaySummaryBanner(data.daySummary);
        }
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiScheduling(false);
    }
  };

  // AI Rollover of Remaining Tasks to Tomorrow
  const handleRolloverTasks = async (taskIds: string[]) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString();

    for (const id of taskIds) {
      await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, dueDate: tomorrowIso }),
      });
    }
    fetchData();
  };

  const handleQuickAddInBlock = (block: TimeBlock) => {
    setNewTodoTimeBlock(block);
    setIsCreatingTask(true);
  };

  const handleExportSingleTaskIcs = (taskId: string) => {
    window.open(`/api/todos/export?type=calendar&id=${taskId}`, "_blank");
  };

  // Note Operations
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNoteTitle.trim() || "Quick Idea",
          content: newNoteContent.trim(),
          category: newNoteCategory,
          color: newNoteColor,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotes([data.note, ...notes]);
        setNewNoteTitle("");
        setNewNoteContent("");
        setIsCreatingNote(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePinNote = async (note: Note) => {
    const nextPin = !note.isPinned;
    setNotes(notes.map((n) => (n.id === note.id ? { ...n, isPinned: nextPin } : n)));

    try {
      await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, isPinned: nextPin }),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleDeleteNote = async (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
    try {
      await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  // Voice AI Action to Auto-Create Task or Note
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setVoiceProcessing(true);

        const reader = new FileReader();
        reader.onload = async () => {
          const base64Audio = (reader.result as string).split(",")[1];
          try {
            const res = await fetch("/api/ai/parse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: "audio/webm",
                autoSave: true,
              }),
            });
            const data = await res.json();
            await fetchData();
          } catch (e) {
            console.error(e);
          } finally {
            setVoiceProcessing(false);
          }
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Filtered lists (memoized to avoid recomputation on unrelated state changes)
  const searchLower = searchQuery.toLowerCase();
  const filteredTasks = useMemo(
    () => tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(searchLower) ||
        (t.cleanDescription && t.cleanDescription.toLowerCase().includes(searchLower))
    ),
    [tasks, searchLower]
  );

  const filteredNotes = useMemo(
    () => notes.filter(
      (n) =>
        n.title.toLowerCase().includes(searchLower) ||
        n.content.toLowerCase().includes(searchLower)
    ),
    [notes, searchLower]
  );

  const pendingCount = useMemo(() => tasks.filter((t) => t.status === "PENDING").length, [tasks]);

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-28 md:pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-slate-800 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-purple-600 shadow-lg shadow-orange-500/20 text-white shrink-0">
              <BookOpen className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  智能电子计划本
                </h1>
                <span className="hidden sm:inline-flex rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                  ✨ Elena Lin AI 灵感版
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                今日三只青蛙、时间块排程、微习惯打卡与 Obsidian/日历神仙联动。
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Voice Memo Quick Record Button */}
          <button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={voiceProcessing}
            title="点击后语音说出待办或笔记，AI 自动提炼并归类入计划本"
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 ${
              isRecording
                ? "bg-rose-600 text-white animate-pulse"
                : voiceProcessing
                ? "bg-amber-600/50 text-amber-200 cursor-not-allowed"
                : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="h-3.5 w-3.5 animate-spin" />
                <span>录音中 (停止)</span>
              </>
            ) : voiceProcessing ? (
              <>
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span>智能转录入库...</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5 text-amber-400" />
                <span>语音速记</span>
              </>
            )}
          </button>

          <div className="flex flex-1 sm:flex-initial rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs justify-center">
            <button
              onClick={() => setActiveTab("PLANNER")}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 font-extrabold transition-all text-xs ${
                activeTab === "PLANNER"
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-orange-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span>计划本<span className="hidden sm:inline">模式</span></span>
            </button>
            <button
              onClick={() => setActiveTab("TODOS")}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 font-bold transition-all text-xs ${
                activeTab === "TODOS"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5 shrink-0" />
              <span>清单<span className="ml-1 text-[11px] opacity-80">({pendingCount})</span></span>
            </button>
            <button
              onClick={() => setActiveTab("NOTES")}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 font-bold transition-all text-xs ${
                activeTab === "NOTES"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <StickyNote className="h-3.5 w-3.5 shrink-0" />
              <span>便签<span className="ml-1 text-[11px] opacity-80">({notes.length})</span></span>
            </button>
          </div>
        </div>
      </div>

      {/* AI & Ecological Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={
              activeTab === "NOTES"
                ? "搜索灵感便签..."
                : "搜索待办事项、时间块或标签..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
          />
        </div>

        {/* Global Action Buttons (Horizontal scrolling ribbon on mobile, wrapped on desktop) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar w-full sm:w-auto">
          {activeTab !== "NOTES" && (
            <>
              {/* AI Smart Schedule Button */}
              <button
                onClick={handleAiSchedule}
                disabled={aiScheduling || tasks.length === 0}
                title="由 Gemini AI 智能分析任务重要性并安排早/中/晚时间块"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 transition-all active:scale-95 shrink-0"
              >
                <Sparkles className={`h-3.5 w-3.5 ${aiScheduling ? "animate-spin" : ""}`} />
                <span>{aiScheduling ? "AI 排程中..." : "AI 智能排程"}</span>
              </button>

              {/* AI Evening Review Button */}
              <button
                onClick={() => setIsReviewOpen(true)}
                title="总结今日达成度与习惯，给出鼓励评分与明日顺延"
                className="flex items-center gap-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-3 py-2 text-xs font-bold text-indigo-300 transition-all active:scale-95 shrink-0"
              >
                <Moon className="h-3.5 w-3.5" />
                <span>AI 晚间复盘</span>
              </button>

              {/* Obsidian & Calendar Export Button */}
              <button
                onClick={() => setIsExportOpen(true)}
                title="导出为 Obsidian Daily Note 格式或 Apple/Google 日历 (.ics)"
                className="flex items-center gap-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 px-3 py-2 text-xs font-bold text-purple-300 transition-all active:scale-95 shrink-0"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>联动 Obsidian / 日历</span>
              </button>

              <button
                onClick={() => setIsCreatingTask(true)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 text-xs font-extrabold shadow-md shadow-amber-600/30 active:scale-95 transition-all shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>新建计划</span>
              </button>
            </>
          )}

          {activeTab === "NOTES" && (
            <button
              onClick={() => setIsCreatingNote(true)}
              className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/25 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>新建便签</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Schedule Day Summary Toast Banner */}
      {daySummaryBanner && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-slate-900 to-orange-500/10 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs text-amber-200 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="font-semibold">{daySummaryBanner}</p>
          </div>
          <button
            onClick={() => setDaySummaryBanner(null)}
            className="text-amber-400/80 hover:text-white p-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <span className="text-sm text-slate-400 font-medium">加载计划本数据...</span>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isCreatingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-slate-900 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📅 添加新计划</span>
                {newTodoIsFrog && (
                  <span className="text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5">
                    🐸 今日青蛙
                  </span>
                )}
              </h3>
              <button
                onClick={() => setIsCreatingTask(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTodo} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  任务标题 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: 准备Q3财务复盘PPT、核对本周发票"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  备注或上下文
                </label>
                <textarea
                  rows={2}
                  placeholder="可填写详细说明，或稍后点击 AI 智能拆解..."
                  value={newTodoDescription}
                  onChange={(e) => setNewTodoDescription(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    分配时间块
                  </label>
                  <select
                    value={newTodoTimeBlock}
                    onChange={(e) => setNewTodoTimeBlock(e.target.value as TimeBlock)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-slate-300 outline-none cursor-pointer"
                  >
                    <option value="MORNING">🌅 早间 (08-12)</option>
                    <option value="AFTERNOON">☀️ 午后 (12-18)</option>
                    <option value="EVENING">🌙 晚间 (18-22)</option>
                    <option value="ANYTIME">⏳ 灵活备选</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    优先级
                  </label>
                  <select
                    value={newTodoPriority}
                    onChange={(e) => setNewTodoPriority(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-slate-300 outline-none cursor-pointer"
                  >
                    <option value="LOW">🔵 普通 Low</option>
                    <option value="MEDIUM">🟡 中等 Medium</option>
                    <option value="HIGH">🔴 紧急 High</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    预估耗时 (分钟)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={newTodoEstMinutes}
                    onChange={(e) => setNewTodoEstMinutes(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-300 select-none">
                  <input
                    type="checkbox"
                    checked={newTodoIsFrog}
                    onChange={(e) => setNewTodoIsFrog(e.target.checked)}
                    className="rounded border-amber-500 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-950"
                  />
                  <span>🐸 设为今日三只青蛙之一 (核心焦点)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingTask(false)}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-bold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 text-xs font-extrabold shadow-md shadow-amber-600/30 transition-all active:scale-95"
                >
                  保存并排入日程
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: PLANNER MODE (Elena Lin AI Digital Planner) */}
      {activeTab === "PLANNER" && (
        <div className="space-y-6">
          {/* Top 3 Frogs Focus Banner */}
          <PlannerFrogBanner
            tasks={filteredTasks}
            onToggleTask={handleToggleTask}
            onToggleFrog={handleToggleFrog}
            onOpenBreakdown={handleOpenBreakdown}
          />

          {/* Habit Tracker Matrix */}
          <PlannerHabitTracker onHabitsChange={setHabitsList} />

          {/* Time-Blocking Timeline Section */}
          <PlannerTimeline
            tasks={filteredTasks}
            onToggleTask={handleToggleTask}
            onToggleFrog={handleToggleFrog}
            onDeleteTask={handleDeleteTask}
            onUpdateTaskBlock={handleUpdateTaskBlock}
            onToggleSubtask={handleToggleSubtask}
            onOpenBreakdown={handleOpenBreakdown}
            onQuickAddInBlock={handleQuickAddInBlock}
            onExportSingleTaskIcs={handleExportSingleTaskIcs}
          />
        </div>
      )}

      {/* TAB 2: CLASSIC LIST MODE */}
      {activeTab === "TODOS" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">简洁待办清单</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                快速查看与勾选所有任务状态，支持批量管理。
              </p>
            </div>
            <button
              onClick={() => setIsCreatingTask(true)}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 text-xs font-bold transition-colors"
            >
              + 快速添加
            </button>
          </div>

          <div className="space-y-2.5">
            {filteredTasks.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">所有任务已清空！</p>
                <p className="text-xs text-slate-500">
                  享受从容时光，或点击上方“新建计划”继续规划。
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isCompleted = task.status === "COMPLETED";
                return (
                  <div
                    key={task.id}
                    className={`glass-card rounded-2xl p-3.5 sm:p-4 border transition-all flex items-center justify-between gap-3 ${
                      isCompleted
                        ? "border-slate-800/50 opacity-60 bg-slate-950/40"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="text-slate-400 hover:text-blue-400 transition-colors shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-500 hover:text-blue-400" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <span
                          className={`text-xs font-semibold break-words transition-all ${
                            isCompleted ? "line-through text-slate-500" : "text-white"
                          }`}
                        >
                          {task.isFrog ? "🐸 " : ""}
                          {task.title}
                        </span>

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              task.priority === "HIGH"
                                ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                : task.priority === "MEDIUM"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {task.priority}
                          </span>

                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                            {task.timeBlock} · {task.estimatedMinutes}m
                          </span>

                          {task.subtasks.length > 0 && (
                            <span className="text-[10px] font-mono text-purple-300">
                              步骤 {task.subtasks.filter((s) => s.isCompleted).length}/
                              {task.subtasks.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenBreakdown(task)}
                        title="AI 拆解"
                        className="p-1.5 text-purple-400 hover:text-purple-300 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NOTES MODE */}
      {activeTab === "NOTES" && (
        <div className="space-y-4">
          {/* Note Creation Modal */}
          {isCreatingNote && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
              <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white">✨ 新建灵感便签</h3>
                  <button
                    onClick={() => setIsCreatingNote(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleAddNote} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      便签标题
                    </label>
                    <input
                      type="text"
                      placeholder="便签标题（如：下周读书笔记、密码备忘）"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      正文内容
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="记录您的想法、随笔、灵感或参考链接..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">
                        分类
                      </label>
                      <select
                        value={newNoteCategory}
                        onChange={(e) => setNewNoteCategory(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-slate-300 outline-none cursor-pointer"
                      >
                        <option value="General">默认 General</option>
                        <option value="Idea">💡 灵感 Idea</option>
                        <option value="Work">💼 工作 Work</option>
                        <option value="Personal">🏠 生活 Personal</option>
                        <option value="Study">📖 学习 Study</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">
                        卡片色彩
                      </label>
                      <div className="flex items-center gap-2 pt-1.5">
                        {["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewNoteColor(c)}
                            className={`h-6 w-6 rounded-full transition-transform ${
                              newNoteColor === c ? "scale-125 ring-2 ring-white" : ""
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNote(false)}
                      className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-bold transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95"
                    >
                      保存便签
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-slate-800/80 p-12 text-center bg-slate-950/40 space-y-2">
                <StickyNote className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">暂无便签笔记</p>
                <p className="text-xs text-slate-500">
                  点击上方“新建便签”或使用“语音速记”记录灵感。
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between gap-3 group relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: note.color || "#8b5cf6" }}
                  />

                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-white break-words">
                        {note.title}
                      </h3>
                      <button
                        onClick={() => handleTogglePinNote(note)}
                        title={note.isPinned ? "取消置顶" : "置顶便签"}
                        className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                          note.isPinned ? "text-amber-400" : "text-slate-500 opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300/90 whitespace-pre-wrap mt-2 line-clamp-6 leading-relaxed">
                      {note.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                    <span className="rounded bg-slate-800/80 px-2 py-0.5 font-medium text-slate-400">
                      {note.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. AI Task Breakdown Modal */}
      <AITaskBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => {
          setIsBreakdownOpen(false);
          setTargetBreakdownTask(null);
        }}
        task={targetBreakdownTask}
        onSaveSubtasks={handleSaveSubtasks}
      />

      {/* 2. AI Evening Review Modal */}
      <AIReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        tasks={tasks}
        completedHabits={habitsList.filter((h) => h.isCompleted).map((h) => `${h.icon} ${h.name}`)}
        onRolloverTasks={handleRolloverTasks}
      />

      {/* 3. Obsidian & Calendar Export Modal */}
      <PlannerExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        tasks={tasks}
        habits={habitsList}
      />
    </div>
  );
}
