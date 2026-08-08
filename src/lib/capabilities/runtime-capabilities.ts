import { DESKTOP_PRO_GROUPS } from "./desktop-capabilities";
import { WEB_TOOL_CAPABILITIES } from "./web-capabilities";
import type { RuntimeTarget } from "./capability-groups";

export function getRuntimeCapabilities(runtime: RuntimeTarget) {
  if (runtime === "vercel-web") {
    return {
      runtime,
      groups: ["images", "pdf", "structured"],
      webTools: WEB_TOOL_CAPABILITIES,
      desktopGroups: [],
      uploads: false,
      serverConversions: false,
    };
  }

  if (runtime === "desktop-local") {
    return {
      runtime,
      groups: DESKTOP_PRO_GROUPS.map((group) => group.id),
      webTools: WEB_TOOL_CAPABILITIES,
      desktopGroups: DESKTOP_PRO_GROUPS,
      uploads: false,
      serverConversions: true,
    };
  }

  return {
    runtime,
    groups: [],
    webTools: null,
    desktopGroups: [],
    uploads: false,
    serverConversions: false,
  };
}
