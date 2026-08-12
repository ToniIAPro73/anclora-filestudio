// Conversion routing types — bounded multistep conversion-route engine.

import type { LossProfile, ResourceProfile } from "../domain/operations";

export interface ConversionStep {
  source: string;
  target: string;
  operationId: string;
  engineId: string;
  lossProfile: LossProfile;
  resourceProfile: ResourceProfile;
}

export type RouteClassification = "direct" | "multistep" | "lossy";

export type RouteRisk = "low" | "medium" | "high";

export type QualityBand = "excellent" | "good" | "format-loss" | "not-recommended";

export interface ConversionRoute {
  source: string;
  destination: string;
  steps: ConversionStep[];
  intermediateFormats: string[];
  score: number;
  classification: RouteClassification;
  risk: RouteRisk;
}

export interface ConversionEdge {
  source: string;
  target: string;
  operationId: string;
  engineId: string;
  lossProfile: LossProfile;
  resourceProfile: ResourceProfile;
  experimental: boolean;
}

/**
 * Client-safe route summary — no engine or operation ids.
 * Attached to CapabilityInfo entries as an optional field.
 */
export interface ConversionRouteSummary {
  steps: Array<{ source: string; target: string }>;
  classification: RouteClassification;
  risk: RouteRisk;
  qualityBand: QualityBand;
  recommended: boolean;
}
