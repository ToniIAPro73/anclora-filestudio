import { WebToolsShell } from "@/components/web-tools/web-tools-shell";
import type { WebTab } from "@/components/web-tools/web-tools-shell";

export function WebModeConverter({ initialTab = "home" }: { initialTab?: WebTab }) {
  return <WebToolsShell initialTab={initialTab} />;
}
