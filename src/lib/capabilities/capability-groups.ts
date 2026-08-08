export type RuntimeTarget = "vercel-web" | "desktop-local" | "service-api" | "worker" | "local-agent";

export interface CapabilityGroup {
  id: string;
  label: string;
  description: string;
  requiredTools: string[];
  operations: string[];
  quickMode: string;
  proMode: string;
}
