import { RuntimePackError } from "@/lib/runtime-packs";
import type { RuntimePackId, RuntimePackInstallState, RuntimePackProgress } from "@/lib/runtime-packs";
import {
  createRuntimePackManager,
  getRuntimePackProductDescription,
  getRuntimePackProductName,
} from "@/lib/runtime-packs/product";

export type RuntimePackInstallStatus =
  | "idle"
  | "downloading"
  | "verifying"
  | "installing"
  | "completed"
  | "failed"
  | "cancelled";

export interface RuntimePackPublicStatus {
  id: string;
  productName: string;
  description: string;
  state: RuntimePackInstallState["state"];
  version: string;
  definition: {
    compressedSize: number | null;
    installedSize: number | null;
  };
  install: {
    status: RuntimePackInstallStatus;
    progress: RuntimePackProgress | null;
    error: string | null;
    errorCode: string | null;
  };
}

interface RuntimePackTask {
  status: RuntimePackInstallStatus;
  progress: RuntimePackProgress | null;
  error: string | null;
  errorCode: string | null;
  controller: AbortController;
}

const tasks = new Map<string, RuntimePackTask>();

function mapProgressStatus(progress: RuntimePackProgress): RuntimePackInstallStatus {
  if (progress.state === "DOWNLOADING") return "downloading";
  if (progress.state === "VERIFYING") return "verifying";
  if (progress.state === "INSTALLING") return "installing";
  if (progress.state === "AVAILABLE" || progress.state === "UPDATE_AVAILABLE") return "completed";
  return "idle";
}

function humanRuntimePackError(error: unknown): { message: string; code: string | null; status: RuntimePackInstallStatus } {
  if (error instanceof RuntimePackError) {
    if (error.code === "RUNTIME_PACK_HASH_MISMATCH") {
      return { message: "No se pudo verificar el componente descargado.", code: error.code, status: "failed" };
    }
    if (error.code === "RUNTIME_PACK_DOWNLOAD_FAILED") {
      return { message: "No se pudo descargar el componente.", code: error.code, status: "failed" };
    }
    if (error.code === "RUNTIME_PACK_BROKEN" || error.code === "RUNTIME_PACK_INSTALL_FAILED") {
      return { message: "No se pudo instalar el componente.", code: error.code, status: "failed" };
    }
    return { message: "El componente no es compatible con esta plataforma.", code: error.code, status: "failed" };
  }
  return { message: "No se pudo instalar el componente.", code: null, status: "failed" };
}

export async function getRuntimePackStatus(id: RuntimePackId): Promise<RuntimePackPublicStatus> {
  const manager = createRuntimePackManager();
  const definition = manager.getDefinition(id);
  const state = await manager.getState(id);
  const task = tasks.get(id);

  return {
    id,
    productName: getRuntimePackProductName(id),
    description: getRuntimePackProductDescription(id),
    state: state.state,
    version: state.version,
    definition: {
      compressedSize: definition?.compressedSize ?? null,
      installedSize: definition?.installedSize ?? null,
    },
    install: {
      status: task?.status ?? "idle",
      progress: task?.progress ?? null,
      error: task?.error ?? state.error ?? state.health.error ?? null,
      errorCode: task?.errorCode ?? null,
    },
  };
}

export async function startRuntimePackInstall(id: RuntimePackId): Promise<RuntimePackPublicStatus> {
  const existing = tasks.get(id);
  if (existing && ["downloading", "verifying", "installing"].includes(existing.status)) {
    return getRuntimePackStatus(id);
  }

  const manager = createRuntimePackManager();
  const current = await manager.getState(id);
  if (current.state === "AVAILABLE" || current.state === "UPDATE_AVAILABLE") {
    return getRuntimePackStatus(id);
  }

  const controller = new AbortController();
  const task: RuntimePackTask = {
    status: "downloading",
    progress: null,
    error: null,
    errorCode: null,
    controller,
  };
  tasks.set(id, task);

  void manager.installFromSource(id, {
    signal: controller.signal,
    onProgress: (progress) => {
      task.progress = progress;
      task.status = mapProgressStatus(progress);
    },
  }).then((installed) => {
    task.status = "completed";
    task.progress = {
      id,
      state: installed.state,
      bytesDownloaded: manager.getDefinition(id)?.compressedSize ?? 0,
      totalBytes: manager.getDefinition(id)?.compressedSize ?? null,
      percent: 100,
    };
  }).catch((error: unknown) => {
    if (controller.signal.aborted) {
      task.status = "cancelled";
      task.error = "Instalación cancelada.";
      task.errorCode = null;
      return;
    }
    const mapped = humanRuntimePackError(error);
    task.status = mapped.status;
    task.error = mapped.message;
    task.errorCode = mapped.code;
  });

  return getRuntimePackStatus(id);
}

export async function cancelRuntimePackInstall(id: RuntimePackId): Promise<RuntimePackPublicStatus> {
  const task = tasks.get(id);
  if (task && ["downloading", "verifying", "installing"].includes(task.status)) {
    task.controller.abort();
    task.status = "cancelled";
    task.error = "Instalación cancelada.";
  }
  return getRuntimePackStatus(id);
}
