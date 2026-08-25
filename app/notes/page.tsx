"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckSquare,
  StickyNote,
  Plus,
  Trash2,
  Pin,
  Mic,
  MicOff,
  Sparkles,
  Calendar,
  Clock,
  Tag,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  AlertCircle,
  Edit3,
  X,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  color: string;
  createdAt: string;
}

interface TodoTask {
  id: string;
  title: string;
  description?: string;
  status: "PENDING" | "COMPLETED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate?: string;
  createdAt: string;
}

export default function NotesAndTasksPage() {
  const [activeTab, setActiveTab] = useState<"TODOS" | "NOTES">("TODOS");
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Todo creation state
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");

  // Note creation modal state
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
      if (todosData.success) setTodos(todosData.todos || []);
    } catch (err) {
      console.error("Failed to load notes/todos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Todo Operations
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          priority: newTodoPriority,
          dueDate: newTodoDueDate || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTodos([data.todo, ...todos]);
        setNewTodoTitle("");
        setNewTodoDueDate("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTodo = async (todo: TodoTask) => {
    const nextStatus = todo.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    // Optimistic UI update
    setTodos(todos.map((t) => (t.id === todo.id ? { ...t, status: nextStatus } : t)));

    try {
      await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todo.id, status: nextStatus }),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleDeleteTodo = async (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
    try {
      await fetch(`/api/todos?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
      fetchData();
    }
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
                autoSave: false,
              }),
            });
            const data = await res.json();
            const transcript = data.parsed?.transcript || data.parsed?.description;

            if (transcript) {
              // Create note/todo from voice
              await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: "🎙️ Voice Memo",
                  content: transcript,
                  category: "Voice",
                  color: "#f59e0b",
                }),
              });
              fetchData();
            }
          } catch (e) {
            console.error(e);
          } finally {
            setVoiceProcessing(false);
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
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

  // Filtered lists
  const filteredTodos = todos.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20 text-white">
              <StickyNote className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Notes & Smart Tasks
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Organize thoughts, capture voice memos, and manage daily action items.
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher + Voice AI Action */}
        <div className="flex items-center gap-3">
          {/* Voice Memo Quick Record Button */}
          <button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={voiceProcessing}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-md active:scale-95 ${
              isRecording
                ? "bg-rose-600 text-white recording-pulse"
                : voiceProcessing
                ? "bg-amber-600/50 text-amber-200 cursor-not-allowed"
                : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="h-4 w-4 animate-spin" />
                <span>Recording... (Click to Stop)</span>
              </>
            ) : voiceProcessing ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>AI Transcribing...</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-amber-400" />
                <span>Voice Memo</span>
              </>
            )}
          </button>

          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              onClick={() => setActiveTab("TODOS")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-bold transition-all ${
                activeTab === "TODOS"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>To-Dos ({todos.filter((t) => t.status === "PENDING").length})</span>
            </button>
            <button
              onClick={() => setActiveTab("NOTES")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-bold transition-all ${
                activeTab === "NOTES"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <StickyNote className="h-3.5 w-3.5" />
              <span>Notes ({notes.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={activeTab === "TODOS" ? "Search tasks..." : "Search notes & ideas..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />
        </div>

        {activeTab === "NOTES" && (
          <button
            onClick={() => setIsCreatingNote(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/25 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </button>
        )}
      </div>

      {/* TAB 1: TODOS VIEW */}
      {activeTab === "TODOS" && (
        <div className="space-y-4">
          {/* Quick Add Todo Input Form */}
          <form
            onSubmit={handleAddTodo}
            className="glass-card rounded-2xl p-3 sm:p-4 border border-slate-800 flex flex-col sm:flex-row items-center gap-3 shadow-lg"
          >
            <div className="flex-1 w-full relative">
              <input
                type="text"
                required
                placeholder="What needs to be done? (e.g. Call dentist, Pay electricity bill)"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as any)}
                className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2.5 text-xs text-slate-300 outline-none cursor-pointer"
              >
                <option value="LOW">🔵 Low</option>
                <option value="MEDIUM">🟡 Med</option>
                <option value="HIGH">🔴 High</option>
              </select>

              <input
                type="date"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2.5 text-xs text-slate-300 outline-none"
              />

              <button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/30 transition-all active:scale-95 shrink-0"
              >
                Add
              </button>
            </div>
          </form>

          {/* Todo List */}
          <div className="space-y-2.5">
            {filteredTodos.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">All tasks completed!</p>
                <p className="text-xs text-slate-500">Enjoy your free time or add a new action item above.</p>
              </div>
            ) : (
              filteredTodos.map((todo) => {
                const isCompleted = todo.status === "COMPLETED";
                return (
                  <div
                    key={todo.id}
                    className={`glass-card rounded-2xl p-3.5 sm:p-4 border transition-all flex items-center justify-between gap-3 ${
                      isCompleted
                        ? "border-slate-800/50 opacity-60 bg-slate-950/40"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleTodo(todo)}
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
                          {todo.title}
                        </span>

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              todo.priority === "HIGH"
                                ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                : todo.priority === "MEDIUM"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {todo.priority}
                          </span>

                          {todo.dueDate && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Calendar className="h-3 w-3" />
                              {new Date(todo.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NOTES WALL VIEW */}
      {activeTab === "NOTES" && (
        <div className="space-y-6">
          {/* Note Creation Modal */}
          {isCreatingNote && (
            <div className="glass-card rounded-3xl p-6 border border-purple-500/30 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-purple-400" />
                  <span>Draft New Note</span>
                </h3>
                <button
                  onClick={() => setIsCreatingNote(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddNote} className="space-y-3">
                <input
                  type="text"
                  placeholder="Note Title (e.g. App Architecture Ideas)"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-purple-500"
                />

                <textarea
                  rows={4}
                  placeholder="Type your notes, markdown, key links, or thoughts here..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 text-xs text-slate-200 outline-none focus:border-purple-500 leading-relaxed resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={newNoteCategory}
                      onChange={(e) => setNewNoteCategory(e.target.value)}
                      className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs text-slate-300 outline-none"
                    >
                      <option value="General">General</option>
                      <option value="Idea">💡 Idea</option>
                      <option value="Work">💼 Work</option>
                      <option value="Personal">🏠 Personal</option>
                      <option value="Voice">🎙️ Voice</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNote(false)}
                      className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full glass-card rounded-2xl p-12 text-center border border-slate-800/80 space-y-2">
                <StickyNote className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No notes found</p>
                <p className="text-xs text-slate-500">Capture your first idea or voice memo above!</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="glass-card relative rounded-3xl p-5 border border-slate-800 hover:border-purple-500/40 transition-all shadow-xl flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white line-clamp-1">{note.title}</h4>
                      <button
                        onClick={() => handleTogglePinNote(note)}
                        className={`p-1 rounded-lg transition-colors ${
                          note.isPinned ? "text-amber-400 bg-amber-400/10" : "text-slate-500 hover:text-white"
                        }`}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
                      {note.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/60 text-[11px] text-slate-500">
                    <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 font-medium">
                      {note.category}
                    </span>

                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
