export type RuntimePackId = "chromium-runtime" | (string & {});

export type RuntimePackPlatform = "windows" | "linux" | "darwin";
export type RuntimePackArchitecture = "x64" | "arm64";

export type RuntimePackState =
  | "NOT_REQUIRED"
  | "NOT_INSTALLED"
  | "DOWNLOADING"
  | "VERIFYING"
  | "INSTALLING"
  | "AVAILABLE"
  | "UPDATE_AVAILABLE"
  | "BROKEN"
  | "INCOMPATIBLE";

export type CapabilityRuntimeState = "available" | "installable" | "unavailable";

export type RuntimePackSource = {
  type: "https";
  url: string;
  trustedOrigin: string;
};

export type RuntimePackLicense = {
  name: string;
  url: string;
};

export type RuntimePackExecutablePaths = Record<RuntimePackPlatform, string>;

export interface RuntimePackHealthProbe {
  type: "executable-version" | "chromium";
  executableKey: string;
  args: string[];
  expectedVersion?: string;
  timeoutMs: number;
}

export interface RuntimePackDefinition {
  id: RuntimePackId;
  name: string;
  version: string;
  revision?: string;
  platform: RuntimePackPlatform;
  architecture: RuntimePackArchitecture;
  source: RuntimePackSource;
  sha256: string;
  compressedSize: number;
  installedSize: number;
  license: RuntimePackLicense;
  notices: string[];
  sbom?: string;
  capabilities: string[];
  executablePaths: RuntimePackExecutablePaths;
  healthProbe: RuntimePackHealthProbe;
}

export interface RuntimePackInstallState {
  id: RuntimePackId;
  version: string;
  platform: RuntimePackPlatform;
  architecture: RuntimePackArchitecture;
  state: RuntimePackState;
  installPath: string | null;
  executablePath: string | null;
  sourceUrl: string | null;
  sha256: string | null;
  installedAt: string | null;
  health: {
    ok: boolean;
    version: string | null;
    error: string | null;
    checkedAt: string | null;
  };
  error?: string;
}

export interface RuntimePackProgress {
  id: RuntimePackId;
  state: RuntimePackState;
  bytesDownloaded: number;
  totalBytes: number | null;
  percent: number | null;
}

export interface RuntimePackInstallOptions {
  signal?: AbortSignal;
  onProgress?: (progress: RuntimePackProgress) => void;
  timeoutMs?: number;
}

export interface RuntimePackRegistry {
  list(): RuntimePackDefinition[];
  find(
    id: RuntimePackId,
    platform: RuntimePackPlatform,
    architecture: RuntimePackArchitecture,
  ): RuntimePackDefinition | null;
}
