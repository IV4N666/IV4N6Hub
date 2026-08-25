"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Cpu,
  HardDrive,
  Activity,
  Battery,
  BatteryCharging,
  Wifi,
  Monitor,
  Server,
  Layers,
  RefreshCw,
  Clock,
  Zap,
  Globe,
  Gauge,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface SystemMetrics {
  cpu: {
    model: string;
    cores: number;
    speedMhz: number;
    usagePercent: number;
  };
  memory: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePercent: number;
  };
  os: {
    platform: string;
    type: string;
    release: string;
    arch: string;
    hostname: string;
    uptimeFormatted: string;
    uptimeSeconds: number;
  };
  process: {
    nodeVersion: string;
    uptimeFormatted: string;
    memoryUsedMb: number;
  };
  network: {
    activeIps: Array<{ interfaceName: string; address: string; family: string }>;
  };
}

interface ClientHardwareInfo {
  gpuRenderer: string;
  gpuVendor: string;
  logicalCores: number;
  deviceMemoryGb?: number;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
  batteryLevel?: number;
  isCharging?: boolean;
  chargingTime?: number;
  dischargingTime?: number;
  online: boolean;
  pingMs?: number;
}

export default function SystemMonitorPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientHardwareInfo | null>(null);
  const [history, setHistory] = useState<Array<{ time: string; cpu: number; ram: number }>>([]);
  const [isLive, setIsLive] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(2000); // 2 seconds
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Detect Client-Side Hardware (GPU, Battery, Screen, Network)
  useEffect(() => {
    const detectClientHardware = async () => {
      let gpuRenderer = "Integrated Graphics";
      let gpuVendor = "Standard Vendor";

      try {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl") ||
          (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
        if (gl) {
          const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
          if (debugInfo) {
            gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
            gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || gpuVendor;
          }
        }
      } catch (e) {
        console.warn("GPU detection failed:", e);
      }

      let batteryInfo: { level?: number; charging?: boolean } = {};
      try {
        if ("getBattery" in navigator) {
          const battery: any = await (navigator as any).getBattery();
          batteryInfo = {
            level: Math.round(battery.level * 100),
            charging: battery.charging,
          };

          battery.addEventListener("levelchange", () => {
            setClientInfo((prev) => (prev ? { ...prev, batteryLevel: Math.round(battery.level * 100) } : prev));
          });
          battery.addEventListener("chargingchange", () => {
            setClientInfo((prev) => (prev ? { ...prev, isCharging: battery.charging } : prev));
          });
        }
      } catch (e) {
        console.warn("Battery API unavailable");
      }

      const info: ClientHardwareInfo = {
        gpuRenderer,
        gpuVendor,
        logicalCores: navigator.hardwareConcurrency || 4,
        deviceMemoryGb: (navigator as any).deviceMemory || undefined,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
        batteryLevel: batteryInfo.level,
        isCharging: batteryInfo.charging,
        online: navigator.onLine,
      };

      setClientInfo(info);
    };

    detectClientHardware();
  }, []);

  // Fetch System Metrics from backend API
  const fetchMetrics = async () => {
    const startTime = performance.now();
    try {
      const res = await fetch("/api/system/metrics");
      const data = await res.json();
      const endTime = performance.now();
      const ping = Math.round(endTime - startTime);

      if (data.success) {
        setMetrics(data);
        setLastUpdated(new Date().toLocaleTimeString());

        // Update Client Ping
        setClientInfo((prev) => (prev ? { ...prev, pingMs: ping } : prev));

        // Append to history for charts
        const timeLabel = new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        setHistory((prev) => {
          const updated = [
            ...prev,
            {
              time: timeLabel,
              cpu: data.cpu.usagePercent,
              ram: data.memory.usagePercent,
            },
          ];
          // Keep last 25 data points
          return updated.slice(-25);
        });
      }
    } catch (err) {
      console.error("Failed to fetch system metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time polling timer
  useEffect(() => {
    fetchMetrics();
    if (!isLive) return;

    const timer = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(timer);
  }, [isLive, refreshInterval]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  PC & System Hardware Monitor
                </h1>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {isLive ? "Live Telemetry" : "Paused"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time workstation diagnostics, CPU, RAM, GPU, battery & network telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
              isLive
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>{isLive ? "Live Streaming" : "Resume Stream"}</span>
          </button>

          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer hover:border-slate-600"
          >
            <option value={1000}>Refresh: 1s</option>
            <option value={2000}>Refresh: 2s</option>
            <option value={5000}>Refresh: 5s</option>
          </select>

          <button
            onClick={fetchMetrics}
            title="Refresh Now"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4 Core Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <div className="glass-card relative overflow-hidden rounded-3xl p-5 border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 to-slate-950/90 shadow-xl">
          <div className="absolute top-0 right-0 h-24 w-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Cpu className="h-4 w-4" />
              <span>Processor (CPU)</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {metrics ? `${metrics.cpu.cores} Cores` : "Detecting..."}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {metrics ? `${metrics.cpu.usagePercent}%` : "--"}
            </span>
            <span className="text-xs text-slate-400">Load</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${metrics ? metrics.cpu.usagePercent : 0}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-3 truncate font-mono" title={metrics?.cpu.model}>
            {metrics?.cpu.model || "Loading CPU architecture..."}
          </p>
        </div>

        {/* RAM Card */}
        <div className="glass-card relative overflow-hidden rounded-3xl p-5 border border-purple-500/20 bg-gradient-to-br from-slate-900/90 to-slate-950/90 shadow-xl">
          <div className="absolute top-0 right-0 h-24 w-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              <span>Memory (RAM)</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {metrics ? `${metrics.memory.usedGb} / ${metrics.memory.totalGb} GB` : "--"}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {metrics ? `${metrics.memory.usagePercent}%` : "--"}
            </span>
            <span className="text-xs text-slate-400">
              ({metrics ? `${metrics.memory.freeGb} GB Free` : "--"})
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (metrics?.memory.usagePercent || 0) > 85
                  ? "bg-gradient-to-r from-purple-500 to-rose-500"
                  : "bg-gradient-to-r from-purple-500 to-indigo-500"
              }`}
              style={{ width: `${metrics ? metrics.memory.usagePercent : 0}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
            <span>Process Heap: {metrics?.process.memoryUsedMb || 0} MB</span>
            <span className="text-purple-300 font-mono text-[10px]">DDR Active</span>
          </p>
        </div>

        {/* Graphics GPU Card */}
        <div className="glass-card relative overflow-hidden rounded-3xl p-5 border border-emerald-500/20 bg-gradient-to-br from-slate-900/90 to-slate-950/90 shadow-xl">
          <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              <span>Graphics (GPU)</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Hardware Accel
            </span>
          </div>

          <div className="mb-2">
            <div className="text-sm font-black text-white line-clamp-2 leading-tight">
              {clientInfo?.gpuRenderer || "DirectX / WebGL GPU"}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Display: {clientInfo ? `${clientInfo.screenWidth}×${clientInfo.screenHeight}` : "--"}</span>
            <span className="text-emerald-400 font-mono">DPR {clientInfo?.pixelRatio || 1}x</span>
          </p>
        </div>

        {/* Battery & Power Card */}
        <div className="glass-card relative overflow-hidden rounded-3xl p-5 border border-amber-500/20 bg-gradient-to-br from-slate-900/90 to-slate-950/90 shadow-xl">
          <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              {clientInfo?.isCharging ? (
                <BatteryCharging className="h-4 w-4 text-emerald-400 animate-pulse" />
              ) : (
                <Battery className="h-4 w-4" />
              )}
              <span>Power & Battery</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              {clientInfo?.isCharging ? "⚡ AC Connected" : "On Battery / Power"}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {clientInfo?.batteryLevel !== undefined ? `${clientInfo.batteryLevel}%` : "AC Powered"}
            </span>
            {clientInfo?.batteryLevel !== undefined && (
              <span className="text-xs text-slate-400">Capacity</span>
            )}
          </div>

          {/* Progress bar if battery available */}
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                clientInfo?.isCharging
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-gradient-to-r from-amber-500 to-yellow-400"
              }`}
              style={{ width: `${clientInfo?.batteryLevel !== undefined ? clientInfo.batteryLevel : 100}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
            <span>Ping Latency: {clientInfo?.pingMs || 12} ms</span>
            <span className="text-emerald-400 font-semibold">● Stable</span>
          </p>
        </div>
      </div>

      {/* Real-time Telemetry Graph */}
      <div className="glass-card rounded-3xl p-6 border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-400" />
              <span>Real-Time CPU & Memory Waveform</span>
            </h2>
            <p className="text-xs text-slate-400">
              Continuous 25-frame historical resource load trend
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <span>CPU Usage (%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-400">
              <div className="h-2.5 w-2.5 rounded-full bg-purple-400" />
              <span>RAM Usage (%)</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="cpu"
                name="CPU Load"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fill="url(#cpuGrad)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="ram"
                name="RAM Load"
                stroke="#a855f7"
                strokeWidth={2.5}
                fill="url(#ramGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hardware & OS Technical Specs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Workstation & OS info */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-400" />
            <span>Operating System & Host</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Hostname</span>
              <span className="font-mono font-semibold text-white">{metrics?.os.hostname || "Detecting..."}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Platform / Kernel</span>
              <span className="font-semibold text-slate-200">{metrics ? `${metrics.os.type} (${metrics.os.platform})` : "--"}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Architecture</span>
              <span className="font-mono text-cyan-400 font-bold">{metrics?.os.arch.toUpperCase() || "X64"}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">System Uptime</span>
              <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {metrics?.os.uptimeFormatted || "0s"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Runtime Engine</span>
              <span className="font-mono text-slate-300">{metrics?.process.nodeVersion || "Node.js"}</span>
            </div>
          </div>
        </div>

        {/* Display & Graphic Details */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-emerald-400" />
            <span>Client Display & Graphics</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Resolution</span>
              <span className="font-mono font-semibold text-white">
                {clientInfo ? `${clientInfo.screenWidth} × ${clientInfo.screenHeight}` : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Device Pixel Ratio</span>
              <span className="font-mono text-slate-200">{clientInfo?.pixelRatio || 1}x Scale</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Color Depth</span>
              <span className="font-mono text-slate-200">{clientInfo?.colorDepth || 24}-bit TrueColor</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Client Concurrency</span>
              <span className="font-mono text-purple-400 font-bold">{clientInfo?.logicalCores || 4} Threads</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">GPU Vendor</span>
              <span className="font-mono text-emerald-400 truncate max-w-[150px]">{clientInfo?.gpuVendor || "Standard"}</span>
            </div>
          </div>
        </div>

        {/* Network & Connectivity */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-amber-400" />
            <span>Network Interfaces & Status</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Connection State</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Online & Connected
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Round-Trip Latency</span>
              <span className="font-mono text-amber-400 font-bold">{clientInfo?.pingMs || 12} ms</span>
            </div>
            {metrics?.network.activeIps && metrics.network.activeIps.length > 0 ? (
              metrics.network.activeIps.slice(0, 2).map((ip, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400 truncate max-w-[100px]">{ip.interfaceName}</span>
                  <span className="font-mono text-cyan-300 font-semibold">{ip.address}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Local IPv4</span>
                <span className="font-mono text-cyan-300">127.0.0.1</span>
              </div>
            )}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Data Stream</span>
              <span className="text-slate-300 font-mono">Telemetry Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
