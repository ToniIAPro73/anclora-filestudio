import {
  RuntimePackManager,
  currentRuntimePackArchitecture,
  currentRuntimePackPlatform,
} from "@/lib/runtime-packs";

export function createRuntimePackManager(): RuntimePackManager {
  return new RuntimePackManager({
    platform: currentRuntimePackPlatform(),
    architecture: currentRuntimePackArchitecture(),
  });
}

export function getRuntimePackProductName(id: string): string {
  if (id === "chromium-runtime") return "Componente de renderizado web";
  return "Componente adicional";
}

export function getRuntimePackProductDescription(id: string): string {
  if (id === "chromium-runtime") {
    return "Esta conversión necesita el componente de renderizado web.";
  }
  return "Esta conversión necesita un componente adicional.";
}
