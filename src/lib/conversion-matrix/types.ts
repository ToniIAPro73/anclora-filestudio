import type { EngineId } from "../domain/engines";
import type { LossProfile } from "../domain/operations";

export type ConversionEnvironment = "windows" | "linux" | "web";

export type RuntimeAvailabilityState =
  | "available"
  | "unavailable"
  | "degraded"
  | "unknown";

export type EffectiveAvailabilityState =
  | "available"
  | "declared-only"
  | "missing-implementation"
  | "disabled"
  | "wrong-platform"
  | "engine-unavailable"
  | "engine-degraded"
  | "engine-unknown"
  | "dependency-unavailable"
  | "format-unknown";

export type ConversionMode = "conversion" | "ocr";
export type CostModel = "included" | "credits" | "metered";

export interface EngineRuntimeCapability {
  engineId: EngineId;
  environment: ConversionEnvironment;
  state: RuntimeAvailabilityState;
  version: string | null;
  capabilities: string[];
  health: RuntimeAvailabilityState;
  reason?: string;
}

export interface RuntimeCapabilitySet {
  environment: ConversionEnvironment;
  engines: ReadonlyMap<string, EngineRuntimeCapability>;
}

export interface CanonicalConversionEdge {
  id: string;
  source: string;
  target: string;
  operationId: string;
  implementationId: string;
  engineId: EngineId;
  dependencies: string[];
  environments: ConversionEnvironment[];
  lossProfile: LossProfile;
  supportsOCR: boolean;
  mode: ConversionMode;
  enabled: boolean;
  declared: boolean;
  implemented: boolean;
  priority: number;
  costModel?: CostModel;
  outputCardinality: "single" | "multiple";
  supportsAsIntermediate: boolean;
  notes?: string;
}

export interface EffectiveAvailability {
  state: EffectiveAvailabilityState;
  available: boolean;
  reasons: string[];
  edge: CanonicalConversionEdge;
  runtime?: EngineRuntimeCapability;
}

export interface DirectConversionResult {
  edge: CanonicalConversionEdge;
  availability: EffectiveAvailability;
}

export interface ConversionTargetResult {
  source: string;
  target: string;
  direct: boolean;
  multistep: boolean;
  lossProfile: LossProfile;
  ocr: boolean;
  availability: EffectiveAvailabilityState;
  route: import("../conversion-routing/types").ConversionRoute;
}
