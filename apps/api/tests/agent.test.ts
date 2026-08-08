import { beforeAll, describe, expect, it } from "vitest";
import { generateKeyPair, exportSPKI, SignJWT } from "jose";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryAgentService } from "../src/routes/agent.js";
import { createApp } from "../src/app.js";
import type { KeyLike } from "jose";

const auth = { claims: { client_id: "client_nexus", sub: "ws_1", scopes: ["filestudio:admin"] } };
const publicKey = "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA0000000000000000000000000000000000000000000=\n-----END PUBLIC KEY-----";
const audience = "anclora-filestudio-service";
let keysDir: string;
let signKey: CryptoKey | KeyLike;

beforeAll(async () => {
  const pair = await generateKeyPair("EdDSA");
  signKey = pair.privateKey;
  keysDir = mkdtempSync(`${tmpdir()}/anci-agent-test-`);
  writeFileSync(join(keysDir, "key-1.pem"), await exportSPKI(pair.publicKey));
});

async function makeToken(scopes: string[], clientId = "anclora-talent", workspaceId = "ws_talent") {
  return new SignJWT({ client_id: clientId, scopes, sub: workspaceId })
    .setProtectedHeader({ alg: "EdDSA", kid: "key-1" })
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime("1h")
    .sign(signKey);
}

function makeTalentForm(meta?: Partial<Record<string, unknown>>) {
  const form = new FormData();
  form.set("input", new File([Buffer.from([0x89, 0x50, 0x4e, 0x47])], "cover.png", { type: "image/png" }));
  form.set("meta", JSON.stringify({
    operation: "image:resize",
    options: { width: 800, fit: "inside", quality: 85 },
    requestingOrg: "anclora",
    requestingApp: "anclora-talent",
    retentionMinutes: 30,
    timeoutMs: 60_000,
    workspaceId: "ws_talent",
    inputFilename: "cover.png",
    inputMimeType: "image/png",
    ...meta,
  }));
  return form;
}

describe("Agent service", () => {
  it("supports approved pairing, token refresh rotation, capabilities and unpair", () => {
    const service = new InMemoryAgentService();
    const pairing = service.createPairing({
      publicKey,
      deviceName: "Workstation",
      platform: "linux",
      arch: "x64",
      version: "0.2.0",
    });
    const approved = service.approve(pairing.requestId, pairing.code, auth);
    expect("deviceId" in approved).toBe(true);
    if (!("deviceId" in approved)) throw new Error("not approved");

    expect(service.status(pairing.requestId)).toMatchObject({ status: "authorized", deviceId: approved.deviceId });
    const refreshed = service.refresh(approved.refreshToken, approved.deviceId);
    expect("refreshToken" in refreshed).toBe(true);
    expect("refreshToken" in refreshed && refreshed.refreshToken).not.toBe(approved.refreshToken);

    const reuse = service.refresh(approved.refreshToken, approved.deviceId);
    expect(reuse).toMatchObject({ error: "AUTH_REFRESH_REUSE_DETECTED" });
    expect(service.authenticate(approved.accessToken)).toBeNull();
  });

  it("prevents pairing code reuse and supports rejection", () => {
    const service = new InMemoryAgentService();
    const pairing = service.createPairing({ publicKey, deviceName: "PC", platform: "linux", arch: "x64", version: "0.2.0" });
    expect(service.reject(pairing.requestId)).toBe(true);
    expect(service.status(pairing.requestId)).toEqual({ status: "rejected" });
    expect(service.approve(pairing.requestId, pairing.code, auth)).toEqual({ error: "PAIRING_NOT_PENDING" });
  });

  it("leases only jobs matching device workspace and capabilities", () => {
    const service = new InMemoryAgentService();
    const pairing = service.createPairing({ publicKey, deviceName: "PC", platform: "linux", arch: "x64", version: "0.2.0" });
    const approved = service.approve(pairing.requestId, pairing.code, auth);
    if (!("deviceId" in approved)) throw new Error("not approved");
    const device = service.authenticate(approved.accessToken);
    expect(device).not.toBeNull();
    service.saveCapabilities(approved.deviceId, {
      deviceId: approved.deviceId,
      platform: "linux",
      arch: "x64",
      version: "0.2.0",
      operations: ["data.json-to-yaml"],
      engineVersions: { "data-ts": "yaml" },
      limits: { maxFileSizeBytes: 1024, maxConcurrent: 1 },
      load: 0,
      freeDiskBytes: 0,
      status: "idle",
      lastSeen: new Date().toISOString(),
    });
    service.enqueueLocalJob({
      workspaceId: "ws_1",
      clientId: "client_nexus",
      operation: "data.json-to-yaml",
      input: new TextEncoder().encode('{"ok":true}'),
      inputFilename: "input.json",
      inputMimeType: "application/json",
      options: {},
      requestingOrg: "Nexus",
      requestingApp: "Contract",
      retentionMinutes: 1,
      timeoutMs: 10_000,
    });
    const job = service.nextJob(device!);
    expect(job?.operation).toBe("data.json-to-yaml");
    const leaseId = service.accept(job!.id, device!);
    expect(leaseId).toMatch(/^lease_/);
  });
});

describe("POST /api/v1/agent-jobs", () => {
  it("creates a local agent job from Talent multipart payload", async () => {
    const app = createApp({ jwtPublicKeysPath: keysDir, jwtAudience: audience });
    const token = await makeToken(["filestudio:agent-jobs:create", "filestudio:jobs:read"]);
    const res = await app.request("/api/v1/agent-jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "X-Anclora-Client-Id": "anclora-talent" },
      body: makeTalentForm(),
    });

    expect(res.status).toBe(202);
    const body = await res.json() as {
      jobId: string;
      status: string;
      operation: string;
      links: { self: string };
    };
    expect(body.status).toBe("queued");
    expect(body.operation).toBe("image:resize");
    expect(body.links.self).toBe(`/api/v1/jobs/${body.jobId}`);

    const status = await app.request(body.links.self, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(status.status).toBe(200);
    await expect(status.json()).resolves.toMatchObject({
      jobId: body.jobId,
      status: "queued",
      operation: "image:resize",
    });
  });

  it("rejects missing agent-jobs scope", async () => {
    const app = createApp({ jwtPublicKeysPath: keysDir, jwtAudience: audience });
    const token = await makeToken(["filestudio:jobs:create"]);
    const res = await app.request("/api/v1/agent-jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: makeTalentForm(),
    });
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ code: "AUTH_INSUFFICIENT_SCOPE" });
  });

  it("validates meta and rejects unsupported MIME", async () => {
    const app = createApp({ jwtPublicKeysPath: keysDir, jwtAudience: audience });
    const token = await makeToken(["filestudio:agent-jobs:create"]);
    const invalid = await app.request("/api/v1/agent-jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: makeTalentForm({ operation: "" }),
    });
    expect(invalid.status).toBe(400);

    const rejected = await app.request("/api/v1/agent-jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: makeTalentForm({ inputMimeType: "application/x-msdownload" }),
    });
    expect(rejected.status).toBe(415);
    await expect(rejected.json()).resolves.toMatchObject({ code: "UPLOAD_MIME_REJECTED" });
  });

  it("is idempotent and isolated by client/workspace", async () => {
    const app = createApp({ jwtPublicKeysPath: keysDir, jwtAudience: audience });
    const token = await makeToken(["filestudio:agent-jobs:create", "filestudio:jobs:read"]);
    const first = await app.request("/api/v1/agent-jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": "talent-cover-1" },
      body: makeTalentForm(),
    });
    const second = await app.request("/api/v1/agent-jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": "talent-cover-1" },
      body: makeTalentForm(),
    });
    const firstBody = await first.json() as { jobId: string; links: { self: string } };
    const secondBody = await second.json() as { jobId: string };
    expect(secondBody.jobId).toBe(firstBody.jobId);

    const otherWorkspaceToken = await makeToken(["filestudio:jobs:read"], "anclora-talent", "ws_other");
    const forbidden = await app.request(firstBody.links.self, {
      headers: { Authorization: `Bearer ${otherWorkspaceToken}` },
    });
    expect(forbidden.status).toBe(503);
  });
});
