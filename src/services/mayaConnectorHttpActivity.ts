import type { MayaConnectorRepairSuggestion } from './mayaConnectorRepair';

export type ExternalMayaConnectorSyncState = 'checking' | 'connected' | 'offline' | 'failed';

export type ExternalMayaConnectorSyncStatus = {
  lastCheckedAt?: string;
  lastError?: string;
  lastRepairSuggestion?: MayaConnectorRepairSuggestion;
  mode?: string;
  selectionCount?: number;
  state: ExternalMayaConnectorSyncState;
};

export type ExternalMayaConnectorExportResult =
  | {
      data: {
        bytes: number;
        exportedAt: string;
        localPath: string;
        selectedObjects: string[];
        selectionCount: number;
        sourceUri: string;
        storageUri: string;
        traceId?: string;
      };
      ok: true;
    }
  | {
      error: {
        message: string;
        repairSuggestion?: MayaConnectorRepairSuggestion;
      };
      ok: false;
    };

const defaultBaseUrl = 'http://localhost:8795';

export async function checkExternalMayaConnector(baseUrl = defaultBaseUrl): Promise<ExternalMayaConnectorSyncStatus> {
  const checkedAt = new Date().toISOString();
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const health = await readRoute(`${normalizedBaseUrl}/health`);
  if (!health.ok) {
    return {
      lastCheckedAt: checkedAt,
      lastError: getRouteErrorMessage(health),
      lastRepairSuggestion: getRouteRepairSuggestion(health),
      state: 'failed',
    };
  }

  const selection = await readRoute(`${normalizedBaseUrl}/selection`);
  if (!selection.ok) {
    return {
      lastCheckedAt: checkedAt,
      lastError: getRouteErrorMessage(selection),
      lastRepairSuggestion: getRouteRepairSuggestion(selection),
      mode: getStringField(health.data, 'mode'),
      state: 'failed',
    };
  }

  return {
    lastCheckedAt: checkedAt,
    mode: getStringField(health.data, 'mode'),
    selectionCount: getNumberField(selection.data, 'count'),
    state: 'connected',
  };
}

export async function exportExternalMayaFbx(
  input: {
    output_path: string;
    overwrite: boolean;
    trace_id?: string;
  },
  baseUrl = defaultBaseUrl,
): Promise<ExternalMayaConnectorExportResult> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const route = await postRoute(`${normalizedBaseUrl}/export/fbx`, input);
  if (!route.ok) {
    return {
      error: {
        message: getRouteErrorMessage(route),
        repairSuggestion: getRouteRepairSuggestion(route),
      },
      ok: false,
    };
  }

  return {
    data: {
      bytes: getNumberField(route.data, 'bytes') ?? 0,
      exportedAt: getStringField(route.data, 'exported_at') ?? new Date().toISOString(),
      localPath: getStringField(route.data, 'local_path') ?? input.output_path,
      selectedObjects: getStringArrayField(route.data, 'selected_objects'),
      selectionCount: getNumberField(route.data, 'selection_count') ?? 0,
      sourceUri: getStringField(route.data, 'source_uri') ?? 'maya://selection/current',
      storageUri: getStringField(route.data, 'storage_uri') ?? input.output_path,
      traceId: getStringField(route.data, 'trace_id') ?? input.trace_id,
    },
    ok: true,
  };
}

async function readRoute(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  return await response.json() as Record<string, unknown>;
}

async function postRoute(url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  return await response.json() as Record<string, unknown>;
}

function getRouteErrorMessage(route: Record<string, unknown>) {
  const error = isRecord(route.error) ? route.error : {};
  return getStringField(error, 'message') ?? getStringField(error, 'code') ?? 'Maya Connector request failed';
}

function getRouteRepairSuggestion(route: Record<string, unknown>) {
  const error = isRecord(route.error) ? route.error : {};
  const suggestion = isRecord(error.repair_suggestion) ? error.repair_suggestion : undefined;
  if (!suggestion) return undefined;

  return {
    canRetry: Boolean(suggestion.can_retry),
    hermesActions: Array.isArray(suggestion.hermes_actions)
      ? suggestion.hermes_actions.filter((item): item is string => typeof item === 'string')
      : [],
    recommendedAction: getStringField(suggestion, 'recommended_action') ?? 'inspect_connector_error',
    recoveryAction: 'review',
    requiresUserInput: Boolean(suggestion.requires_user_input),
    summary: getStringField(suggestion, 'summary') ?? 'Maya Connector failure',
    userMessage: getStringField(suggestion, 'user_message') ?? getRouteErrorMessage(route),
  } satisfies MayaConnectorRepairSuggestion;
}

function getStringField(record: unknown, key: string) {
  if (!isRecord(record)) return undefined;
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function getNumberField(record: unknown, key: string) {
  if (!isRecord(record)) return undefined;
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

function getStringArrayField(record: unknown, key: string) {
  if (!isRecord(record)) return [];
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
