"use client";

import { ArrowRight, Wrench } from "lucide-react";
import type { UxConversionCategoryId, UxConversionModel } from "@/lib/ux-v3/conversion-ux-model";

interface FileStudioHomeProps {
  model: UxConversionModel | null;
  onOpenConvert: (categoryId?: UxConversionCategoryId) => void;
  onOpenTools: () => void;
}

export function FileStudioHome({ model, onOpenConvert, onOpenTools }: FileStudioHomeProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-[#13161b]/82 p-5">
        <h2 className="text-2xl font-black text-stone-100">¿Qué quieres hacer?</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-black uppercase text-teal-200">Convertir</h3>
              <p className="mt-1 text-sm text-stone-400">Cambia archivos de un formato a otro.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(model?.categories ?? []).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onOpenConvert(category.id)}
                  className="min-h-24 rounded-lg border border-white/10 bg-white/3 p-4 text-left hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
                >
                  <span className="block text-base font-black text-stone-100">{category.label}</span>
                  <span className="mt-1 block text-xs text-stone-500">{category.formats.length} destinos disponibles</span>
                  <ArrowRight className="mt-3 h-4 w-4 text-teal-200" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3">
              <h3 className="text-sm font-black uppercase text-amber-200">Herramientas</h3>
              <p className="mt-1 text-sm text-stone-400">Edita, analiza, optimiza o procesa archivos.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(model?.tools ?? []).map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={onOpenTools}
                  className="min-h-24 rounded-lg border border-white/10 bg-white/3 p-4 text-left hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
                >
                  <span className="block text-base font-black text-stone-100">{tool.label}</span>
                  <span className="mt-1 block text-xs text-stone-500">{tool.operations.length} operaciones</span>
                  <Wrench className="mt-3 h-4 w-4 text-amber-200" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
