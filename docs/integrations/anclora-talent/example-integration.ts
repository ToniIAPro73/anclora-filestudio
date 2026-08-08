export async function createTalentAgentJob(input: {
  filestudioApiUrl: string;
  token: string;
  workspaceId: string;
  file: File;
}) {
  const form = new FormData();
  form.set("input", input.file);
  form.set("meta", JSON.stringify({
    operation: "image:resize",
    options: { width: 800, fit: "inside", quality: 85 },
    requestingOrg: "anclora",
    requestingApp: "anclora-talent",
    retentionMinutes: 30,
    timeoutMs: 60000,
    workspaceId: input.workspaceId,
    inputFilename: input.file.name,
    inputMimeType: input.file.type,
  }));

  return fetch(`${input.filestudioApiUrl}/api/v1/agent-jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "X-Anclora-Client-Id": "anclora-talent",
    },
    body: form,
  });
}
