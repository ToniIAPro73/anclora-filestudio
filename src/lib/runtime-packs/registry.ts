import { CHROMIUM_RUNTIME_PACKS } from "./registry/chromium";
import type {
  RuntimePackArchitecture,
  RuntimePackDefinition,
  RuntimePackId,
  RuntimePackPlatform,
  RuntimePackRegistry,
} from "./types";

export class StaticRuntimePackRegistry implements RuntimePackRegistry {
  constructor(private readonly definitions: RuntimePackDefinition[]) {}

  list(): RuntimePackDefinition[] {
    return [...this.definitions];
  }

  find(
    id: RuntimePackId,
    platform: RuntimePackPlatform,
    architecture: RuntimePackArchitecture,
  ): RuntimePackDefinition | null {
    return this.definitions.find((definition) =>
      definition.id === id &&
      definition.platform === platform &&
      definition.architecture === architecture
    ) ?? null;
  }
}

export const runtimePackRegistry = new StaticRuntimePackRegistry([
  ...CHROMIUM_RUNTIME_PACKS,
]);
