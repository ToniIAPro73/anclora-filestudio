"use client";

import { Wrench } from "lucide-react";
import type { UxConversionModel } from "@/lib/ux-v3/conversion-ux-model";

interface ToolHubProps {
  model: UxConversionModel;
  onOpenTool: (toolId: string) => void;
}

export function ToolHub({ model, onOpenTool }: ToolHubProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#13161b]/82 p-4">
      <div>
        <h2 className="text-xl font-black text-stone-100">Herramientas</h2>
        <p className="mt-1 text-sm text-stone-400">Quiero hacer algo con un archivo.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {model.tools.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onOpenTool(category.id)}
            className="min-h-32 rounded-lg border border-white/10 bg-white/3 p-4 text-left hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
          >
            <Wrench className="mb-3 h-5 w-5 text-amber-200" aria-hidden="true" />
            <span className="block text-base font-black text-stone-100">{category.label}</span>
            <span className="mt-1 block text-sm leading-6 text-stone-400">{category.description}</span>
            <span className="mt-3 block text-xs text-stone-500">
              {category.operations.map((operation) => operation.label).join(" · ")}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
