import type { AssetRecord, RuntimeEvent, Task } from './mockRuntime';

export type ProvenanceSourceKind =
  | 'external_hermes'
  | 'tool_call'
  | 'task'
  | 'approval'
  | 'asset'
  | 'trace';

export type ProvenanceItem = {
  id: ProvenanceSourceKind;
  label: string;
  value: string;
  detail: string;
};

export type AssetProvenanceSummaryItem = {
  id: 'external_hermes' | 'tool_call' | 'trace';
  label: string;
  value: string;
};

const provenanceEventTypes = new Set([
  'task.created',
  'approval.requested',
  'approval.decided',
  'dispatch.started',
  'dispatch.completed',
  'artifact.created',
  'trace.checkpoint',
]);

export function buildAssetProvenance(input: {
  asset: AssetRecord;
  events: RuntimeEvent[];
  task: Task;
}): { chain: ProvenanceItem[]; events: RuntimeEvent[] } {
  const { asset, events, task } = input;
  const traceId = asset.trace_id || task.trace_id;
  const toolCallName = inferToolCallName(asset, events);
  const approvalStatus = asset.approval_status || task.approval_status;

  return {
    chain: [
      {
        id: 'external_hermes',
        label: 'External Hermes',
        value: inferHermesConversationId(traceId),
        detail: 'Requests the export through ScriptHub Tool Bridge',
      },
      {
        id: 'tool_call',
        label: 'ToolCall',
        value: toolCallName,
        detail: `Creates Task ${task.id} and registers Asset ${asset.id}`,
      },
      {
        id: 'task',
        label: 'Task',
        value: task.id,
        detail: task.metadata.capability_id,
      },
      {
        id: 'approval',
        label: 'Approval',
        value: approvalStatus,
        detail: `Required for ${task.risk_level} risk write`,
      },
      {
        id: 'asset',
        label: 'Asset',
        value: asset.id,
        detail: `${asset.generated_by} -> ${asset.storage_uri}`,
      },
      {
        id: 'trace',
        label: 'Trace',
        value: traceId,
        detail: 'Shared by ToolCall, Task, Approval, and Asset',
      },
    ],
    events: selectProvenanceEvents(events, traceId),
  };
}

export function buildAssetProvenanceSummary(input: {
  asset: AssetRecord;
  events: RuntimeEvent[];
  task: Task;
}): AssetProvenanceSummaryItem[] {
  const { asset, events, task } = input;
  const traceId = asset.trace_id || task.trace_id;

  return [
    {
      id: 'external_hermes',
      label: 'External Hermes',
      value: inferHermesConversationId(traceId),
    },
    {
      id: 'tool_call',
      label: 'ToolCall',
      value: inferToolCallName(asset, events),
    },
    {
      id: 'trace',
      label: 'trace_id',
      value: traceId,
    },
  ];
}

function inferToolCallName(asset: AssetRecord, events: RuntimeEvent[]) {
  const registeredAsset = events.some((event) => event.event_type === 'artifact.created');
  if (registeredAsset) return 'scriptHub.asset.register';

  const dispatchStarted = events.some((event) => event.event_type === 'dispatch.started');
  if (dispatchStarted) return `scriptHub.${asset.generated_by}`;

  return `scriptHub.task.create -> ${asset.generated_by}`;
}

function inferHermesConversationId(traceId: string) {
  const suffix = traceId.replace(/^trace_/, '');
  return suffix ? `conv_hermes_${suffix}` : 'External Hermes';
}

function selectProvenanceEvents(events: RuntimeEvent[], traceId: string) {
  const relatedEvents = events.filter(
    (event) => event.trace_id === traceId && provenanceEventTypes.has(event.event_type),
  );

  return relatedEvents.length > 0 ? relatedEvents : events.filter((event) => event.trace_id === traceId);
}
