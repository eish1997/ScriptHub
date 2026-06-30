import {
  approval as fallbackApproval,
  capabilities as fallbackCapabilities,
  connector as fallbackConnector,
  task as fallbackTask,
  type Approval,
  type CapabilityManifest,
  type Connector,
  type Task,
} from './mockRuntime';
import {
  type ApprovalDecision,
  type RuntimeAdapter,
  type SubmitTaskInput,
  type SubmitTaskResult,
} from './runtimeAdapter';

type HermesConnectorHealthResponse = {
  capabilities?: string[];
  checked_at?: string;
  health?: {
    last_error?: string;
    latency_ms?: number;
    state?: 'healthy' | 'unavailable' | 'degraded';
  };
  id?: string;
  name?: string;
  status?: 'connected' | 'disconnected' | 'degraded';
  target?: 'maya';
  trace_id?: string;
  version?: string;
};

type HermesCapabilityResponse = Partial<CapabilityManifest> & {
  connector_capability?: string;
  connector_target?: 'maya';
  lifecycle?: CapabilityManifest['lifecycle'];
  permissions?: string[];
  requires_confirmation?: boolean;
  risk_level?: CapabilityManifest['risk_level'];
  status?: CapabilityManifest['status'];
  tags?: string[];
  type?: CapabilityManifest['type'];
};

type HermesCapabilitiesResponse = HermesCapabilityResponse[] | {
  capabilities?: HermesCapabilityResponse[];
};

type HermesTaskResponse = {
  approval?: Partial<Approval>;
  task?: Partial<Task>;
};

type HermesApprovalDecisionResponse = Partial<Approval> | {
  approval?: Partial<Approval>;
};

export type HermesAdapterOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

export function createHermesAdapter({ baseUrl, fetchImpl = fetch }: HermesAdapterOptions): RuntimeAdapter {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  return {
    async decideApproval(approval: Approval, decision: ApprovalDecision) {
      const response = await postJson<HermesApprovalDecisionResponse>(
        `${normalizedBaseUrl}/approvals/${encodeURIComponent(approval.id)}/decision`,
        {
          decision,
        },
        fetchImpl,
      );
      return normalizeApprovalDecision(response, approval, decision);
    },
    async getConnectorHealth() {
      const response = await fetchJson<HermesConnectorHealthResponse>(
        `${normalizedBaseUrl}/connectors/maya/health`,
        fetchImpl,
      );
      return normalizeConnectorHealth(response);
    },
    async listCapabilities() {
      const response = await fetchJson<HermesCapabilitiesResponse>(
        `${normalizedBaseUrl}/capabilities`,
        fetchImpl,
      );
      return normalizeCapabilities(response);
    },
    async setConnectorConnected(_connector: Connector, _connected: boolean) {
      throw new Error('Hermes connector control adapter is not implemented yet.');
    },
    async submitTask(input: SubmitTaskInput): Promise<SubmitTaskResult> {
      const response = await postJson<HermesTaskResponse>(
        `${normalizedBaseUrl}/tasks`,
        {
          capability_id: input.capability_id,
          metadata: {
            output_path: input.output_path,
            overwrite: input.overwrite,
          },
        },
        fetchImpl,
      );
      return normalizeSubmitTaskResult(response, input);
    },
  };
}

function normalizeApprovalDecision(
  response: HermesApprovalDecisionResponse,
  currentApproval: Approval,
  decision: ApprovalDecision,
): Approval {
  const now = new Date().toISOString();
  const approval = isWrappedApprovalDecisionResponse(response) ? response.approval ?? {} : response;

  return {
    ...currentApproval,
    ...approval,
    decision_note: approval.decision_note ?? (
      decision === 'approved'
        ? '允许写入项目 exports 目录。'
        : '暂不允许写入目标路径。'
    ),
    reviewed_at: approval.reviewed_at ?? now,
    reviewed_by: approval.reviewed_by ?? 'hermes.approver',
    status: approval.status ?? decision,
    updated_at: approval.updated_at ?? now,
  };
}

function isWrappedApprovalDecisionResponse(
  response: HermesApprovalDecisionResponse,
): response is { approval?: Partial<Approval> } {
  return Object.prototype.hasOwnProperty.call(response, 'approval');
}

function normalizeCapabilities(response: HermesCapabilitiesResponse): CapabilityManifest[] {
  const items = Array.isArray(response) ? response : response.capabilities ?? [];

  return items
    .filter((item): item is HermesCapabilityResponse & { id: string } => Boolean(item.id))
    .map((item) => normalizeCapability(item));
}

function normalizeCapability(item: HermesCapabilityResponse & { id: string }): CapabilityManifest {
  const fallback = fallbackCapabilities.find((capability) => capability.id === item.id);

  return {
    connector_capability: item.connector_capability ?? fallback?.connector_capability ?? item.id,
    connector_target: item.connector_target ?? fallback?.connector_target ?? 'maya',
    description: item.description ?? fallback?.description ?? 'Hermes discovered capability.',
    id: item.id,
    inputs: item.inputs ?? fallback?.inputs ?? {},
    lifecycle: item.lifecycle ?? fallback?.lifecycle ?? 'available',
    name: item.name ?? fallback?.name ?? item.id,
    outputs: item.outputs ?? fallback?.outputs ?? {},
    permissions: item.permissions ?? fallback?.permissions ?? [],
    requires_confirmation: item.requires_confirmation ?? fallback?.requires_confirmation ?? false,
    risk_level: item.risk_level ?? fallback?.risk_level ?? 'low',
    status: item.status ?? fallback?.status ?? 'available',
    tags: item.tags ?? fallback?.tags ?? ['hermes'],
    type: item.type ?? fallback?.type ?? 'tool',
    version: item.version ?? fallback?.version ?? '1.0.0',
  };
}

function normalizeConnectorHealth(response: HermesConnectorHealthResponse): Connector {
  const now = new Date().toISOString();
  const status = response.status ?? fallbackConnector.status;
  const healthState = response.health?.state ?? (status === 'connected' ? 'healthy' : 'unavailable');

  return {
    ...fallbackConnector,
    capabilities: response.capabilities ?? fallbackConnector.capabilities,
    health: {
      checked_at: response.checked_at ?? now,
      last_error: response.health?.last_error,
      latency_ms: response.health?.latency_ms,
      state: healthState,
    },
    id: response.id ?? fallbackConnector.id,
    name: response.name ?? fallbackConnector.name,
    status,
    target: response.target ?? fallbackConnector.target,
    trace_id: response.trace_id ?? fallbackConnector.trace_id,
    updated_at: response.checked_at ?? now,
    version: response.version ?? fallbackConnector.version,
  };
}

function normalizeSubmitTaskResult(response: HermesTaskResponse, input: SubmitTaskInput): SubmitTaskResult {
  const now = new Date().toISOString();
  const taskId = response.task?.id ?? `task_${input.capability_id.replaceAll('.', '_')}`;
  const traceId = response.task?.trace_id ?? response.approval?.trace_id ?? `trace_${taskId}`;
  const outputPath = response.task?.metadata?.output_path ?? input.output_path;
  const overwrite = response.task?.metadata?.overwrite ?? input.overwrite;
  const capabilityId = response.task?.metadata?.capability_id ?? input.capability_id;

  const task: Task = {
    ...fallbackTask,
    ...response.task,
    approval_status: response.task?.approval_status ?? response.approval?.status ?? 'pending',
    artifact_ids: response.task?.artifact_ids ?? [],
    created_at: response.task?.created_at ?? now,
    event_ids: response.task?.event_ids ?? ['evt_001', 'evt_002', 'evt_003'],
    id: taskId,
    metadata: {
      capability_id: capabilityId,
      output_path: outputPath,
      overwrite,
    },
    status: response.task?.status ?? 'planned',
    trace_id: traceId,
    updated_at: response.task?.updated_at ?? now,
  };

  const approval: Approval = {
    ...fallbackApproval,
    ...response.approval,
    created_at: response.approval?.created_at ?? now,
    id: response.approval?.id ?? `approval_${task.id}`,
    impact_scope: response.approval?.impact_scope ?? `${outputPath}；${overwrite ? '允许覆盖同名文件。' : '不会覆盖同名文件。'}`,
    status: response.approval?.status ?? 'pending',
    target_id: response.approval?.target_id ?? task.id,
    trace_id: response.approval?.trace_id ?? traceId,
    updated_at: response.approval?.updated_at ?? now,
  };

  return { approval, task };
}

async function fetchJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Hermes request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(url, {
    body: JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Hermes request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
