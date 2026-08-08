"use client";

import { useEffect, useState } from "react";
import { Activity, Cpu, HardDrive, ShieldCheck, Zap } from "lucide-react";

interface SystemResourceGaugeProps {
  compact?: boolean;
}

export function SystemResourceGauge({ compact = false }: SystemResourceGaugeProps) {
  const [load, setLoad] = useState(18);
  const [memoryFree, setMemoryFree] = useState(78);
  const storageBuffer = 92;

  useEffect(() => {
    const interval = setInterval(() => {
      // Gentle pseudo-live fluctuation for desktop monitoring feedback
      setLoad((prev) => Math.min(65, Math.max(12, prev + (Math.random() * 6 - 3))));
      setMemoryFree((prev) => Math.min(88, Math.max(60, prev + (Math.random() * 4 - 2))));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-4 bg-black/30 border border-white/5 rounded-xl px-3 py-1.5 text-[11px] text-stone-300">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400">Sistema Listo</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-stone-400">
          <Cpu className="h-3 w-3 text-stone-500" />
          <span>CPU: {Math.round(load)}%</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-stone-400">
          <HardDrive className="h-3 w-3 text-stone-500" />
          <span>Disco: {storageBuffer}% Libre</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-teal-500/20 bg-[#12161f]/90 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-teal-400 animate-pulse" />
          <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider">
            Monitor de Capacidad del Workstation
          </h4>
        </div>
        <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="h-3 w-3" />
          Motor Local Óptimo
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3 text-teal-400" /> Carga CPU
            </span>
            <span className="font-mono text-white">{Math.round(load)}%</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-400 transition-all duration-700"
              style={{ width: `${load}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-400" /> RAM Disponible
            </span>
            <span className="font-mono text-white">{Math.round(memoryFree)}%</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-700"
              style={{ width: `${memoryFree}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-emerald-400" /> Espacio Seguro
            </span>
            <span className="font-mono text-white">{storageBuffer}%</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-700"
              style={{ width: `${storageBuffer}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
