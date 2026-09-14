"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, Flame, Plus, Sparkles, Heart } from "lucide-react";

export interface HabitItem {
  id: string;
  name: string;
  icon: string;
  isCompleted: boolean;
  streak: number;
}

const DEFAULT_HABITS: HabitItem[] = [
  { id: "water", name: "规律饮水 2000ml", icon: "💧", isCompleted: false, streak: 5 },
  { id: "workout", name: "适度运动/拉伸", icon: "🏃", isCompleted: false, streak: 3 },
  { id: "reading", name: "深度阅读 20m", icon: "📖", isCompleted: false, streak: 8 },
  { id: "meditation", name: "正念冥想呼吸", icon: "🧘", isCompleted: false, streak: 4 },
  { id: "sleep", name: "23:00前早睡", icon: "🛌", isCompleted: false, streak: 6 },
];

export const PlannerHabitTracker: React.FC<{
  onHabitsChange?: (habits: HabitItem[]) => void;
}> = ({ onHabitsChange }) => {
  const [habits, setHabits] = useState<HabitItem[]>(DEFAULT_HABITS);
  const onHabitsChangeRef = useRef(onHabitsChange);
  onHabitsChangeRef.current = onHabitsChange;

  useEffect(() => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const key = `iv4n6hub_habits_${today}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHabits(parsed);
        onHabitsChangeRef.current?.(parsed);
      }
    } catch (err) {
      console.error('Failed to load habits from localStorage:', err);
    }
  }, []);

  const handleToggleHabit = (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    const key = `iv4n6hub_habits_${today}`;

    const nextHabits = habits.map((h) => {
      if (h.id === id) {
        const nextCompleted = !h.isCompleted;
        return {
          ...h,
          isCompleted: nextCompleted,
          streak: nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1),
        };
      }
      return h;
    });

    setHabits(nextHabits);
    onHabitsChangeRef.current?.(nextHabits);
    try {
      localStorage.setItem(key, JSON.stringify(nextHabits));
    } catch (err) {
      console.error('Failed to save habits to localStorage:', err);
    }
  };

  const completedCount = habits.filter((h) => h.isCompleted).length;
  const percentage = Math.round((completedCount / habits.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 font-bold text-xs border border-purple-500/20">
            🌱
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              每日微习惯矩阵 <span className="text-[10px] text-purple-300 font-medium">Routine Tracker</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
            {completedCount}/{habits.length} 已达成
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              percentage === 100
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
            }`}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Horizontal smooth swipe on phone, 5-col grid on desktop */}
      <div className="flex sm:grid sm:grid-cols-5 gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
        {habits.map((habit) => {
          return (
            <button
              key={habit.id}
              onClick={() => handleToggleHabit(habit.id)}
              className={`flex items-center justify-between gap-2 min-w-[140px] sm:min-w-0 rounded-xl px-2.5 py-2 border transition-all text-left shrink-0 sm:shrink ${
                habit.isCompleted
                  ? "border-emerald-500/40 bg-emerald-950/25 text-emerald-200 shadow-sm"
                  : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 active:scale-98"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm shrink-0">{habit.icon}</span>
                <span className="text-[11px] font-medium truncate">{habit.name}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] font-mono text-amber-400 flex items-center">
                  <Flame className="h-2.5 w-2.5 fill-amber-400" />
                  {habit.streak}
                </span>
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-md border transition-all ${
                    habit.isCompleted
                      ? "border-emerald-400 bg-emerald-500 text-slate-950"
                      : "border-slate-700 bg-slate-900"
                  }`}
                >
                  {habit.isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
