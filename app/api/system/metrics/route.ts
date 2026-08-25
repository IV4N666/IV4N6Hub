import { NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

// Helper to calculate CPU usage over an interval
function getCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += (cpu.times as any)[type];
    }
    totalIdle += cpu.times.idle;
  }

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - (100 * idle) / total;
  return Math.max(0, Math.min(100, Math.round(usage * 10) / 10));
}

// Format seconds into readable duration
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}

export async function GET() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 1000) / 10;

    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : "Unknown CPU";
    const cpuCores = cpus.length;
    const cpuSpeedMhz = cpus.length > 0 ? cpus[0].speed : 0;
    const cpuUsage = getCpuUsage();

    const systemUptimeSeconds = os.uptime();
    const processUptimeSeconds = process.uptime();

    // Memory in Gigabytes
    const totalMemGb = (totalMem / (1024 * 1024 * 1024)).toFixed(2);
    const usedMemGb = (usedMem / (1024 * 1024 * 1024)).toFixed(2);
    const freeMemGb = (freeMem / (1024 * 1024 * 1024)).toFixed(2);

    // Network Interfaces summary
    const networkInterfaces = os.networkInterfaces();
    const activeIps: Array<{ interfaceName: string; address: string; family: string }> = [];

    for (const [name, netList] of Object.entries(networkInterfaces)) {
      if (netList) {
        for (const net of netList) {
          if (!net.internal && net.family === "IPv4") {
            activeIps.push({
              interfaceName: name,
              address: net.address,
              family: net.family,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        speedMhz: cpuSpeedMhz,
        usagePercent: cpuUsage,
      },
      memory: {
        totalGb: parseFloat(totalMemGb),
        usedGb: parseFloat(usedMemGb),
        freeGb: parseFloat(freeMemGb),
        usagePercent: memUsagePercent,
      },
      os: {
        platform: os.platform(),
        type: os.type(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeFormatted: formatUptime(systemUptimeSeconds),
        uptimeSeconds: Math.floor(systemUptimeSeconds),
      },
      process: {
        nodeVersion: process.version,
        uptimeFormatted: formatUptime(processUptimeSeconds),
        memoryUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      network: {
        activeIps,
      },
    });
  } catch (error: any) {
    console.error("System metrics API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to query system metrics" },
      { status: 500 }
    );
  }
}
