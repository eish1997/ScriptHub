import type { HermesConversation, HermesMessage, ToolCallRecord } from './hermesConversation';
import type { RuntimeEvent } from './mockRuntime';
import { getToolBridgeDescriptor } from './toolBridgeDescriptors';

export type AuditSource = 'runtime' | 'hermes' | 'tool_bridge';
export type AuditSourceFilter = 'all' | AuditSource;

export type UnifiedAuditEvent = {
  id: string;
  event_type: string;
  source: string;
  message: string;
  level: RuntimeEvent['level'];
  target_type: string;
  target_id: string;
  trace_id: string;
  occurred_at: string;
  audit_source: AuditSource;
  detail?: Record<string, unknown>;
};

export type RelatedAuditRecord = {
  type: 'Task' | 'Approval' | 'SkillCandidate';
  fields: Array<{ label: string; value: string }>;
};

export type ToolBridgeContractRecord = {
  fields: Array<{ label: string; value: string }>;
};

export function buildUnifiedAuditEvents(input: {
  conversation?: HermesConversation;
  messages?: HermesMessage[];
  runtimeEvents: RuntimeEvent[];
  toolCalls?: ToolCallRecord[];
}): UnifiedAuditEvent[] {
  return [
    ...input.runtimeEvents.map(mapRuntimeEvent),
    ...(input.toolCalls ?? []).map(mapToolCallEvent),
    ...(input.messages ?? []).map((message) => mapHermesMessageEvent(message, input.conversation)),
  ].sort((left, right) => right.occurred_at.localeCompare(left.occurred_at));
}

export function filterAuditEvents(
  events: UnifiedAuditEvent[],
  input: { level: 'all' | RuntimeEvent['level']; source: AuditSourceFilter; keyword: string },
): UnifiedAuditEvent[] {
  const keyword = input.keyword.trim().toLowerCase();

  return events.filter((event) => {
    if (input.level !== 'all' && event.level !== input.level) return false;
    if (input.source !== 'all' && event.audit_source !== input.source) return false;
    if (!keyword) return true;

    return getSearchableAuditTokens(event).some((token) => token.toLowerCase().includes(keyword));
  });
}

export function getRelatedAuditRecords(detail?: Record<string, unknown>): RelatedAuditRecord[] {
  if (!detail) return [];

  return [
    makeRelatedRecord('Task', getRecord(detail.task) ?? getRecord(detail.Task)),
    makeRelatedRecord('Approval', getRecord(detail.approval) ?? getRecord(detail.Approval)),
    makeRelatedRecord(
      'SkillCandidate',
      getRecord(detail.skillCandidate) ?? getRecord(detail.skill_candidate) ?? getRecord(detail.SkillCandidate),
    ),
  ].filter((record): record is RelatedAuditRecord => Boolean(record));
}

export function getToolBridgeContractRecord(detail?: Record<string, unknown>): ToolBridgeContractRecord | undefined {
  if (!detail) return undefined;

  const descriptor = getRecord(detail.descriptor);
  const contractValidation = getRecord(detail.contract_validation);
  const fallbackToolCallId = formatReadableValue(detail.fallback_tool_call_id);
  if (!descriptor && !contractValidation && !fallbackToolCallId) return undefined;

  const fields = [
    makeField('Version', descriptor?.version),
    makeField('Permissions', Array.isArray(descriptor?.permissions) ? descriptor.permissions.join(', ') : undefined),
    makeField('Risk', descriptor?.risk_level),
    makeField('Approval', descriptor?.approval_required),
    makeField('Validation', contractValidation?.status),
    makeField(
      'Validation errors',
      Array.isArray(contractValidation?.errors) && contractValidation.errors.length > 0
        ? contractValidation.errors.join(' / ')
        : undefined,
    ),
    makeField('Fallback call', fallbackToolCallId),
  ].filter((field): field is { label: string; value: string } => Boolean(field));

  return fields.length > 0 ? { fields } : undefined;
}

export function mapRuntimeEvent(event: RuntimeEvent): UnifiedAuditEvent {
  return {
    ...event,
    audit_source: 'runtime',
  };
}

export function mapToolCallEvent(toolCall: ToolCallRecord): UnifiedAuditEvent {
  const descriptor = getToolBridgeDescriptor(toolCall.tool_name);
  const contractValidation = getRecord(toolCall.output?.contract_validation) ?? getRecord(toolCall.input.contract_validation);
  const fallbackToolCallId = getString(toolCall.output?.fallback_tool_call_id) ?? getString(toolCall.input.fallback_tool_call_id);

  return {
    id: `audit_${toolCall.id}`,
    event_type: `tool.${toolCall.status}`,
    source: toolCall.tool_name,
    message: toolCall.error ?? toolCall.title,
    level: toolCall.status === 'failed' ? 'error' : toolCall.approval_required ? 'audit' : 'info',
    target_type: 'tool_call',
    target_id: toolCall.id,
    trace_id: toolCall.trace_id,
    occurred_at: toolCall.finished_at ?? toolCall.started_at,
    audit_source: 'tool_bridge',
    detail: {
      contract_validation: contractValidation,
      conversation_id: toolCall.conversation_id,
      descriptor: descriptor
        ? {
            approval_required: descriptor.approval_required,
            name: descriptor.name,
            permissions: descriptor.permissions,
            risk_level: descriptor.risk_level,
            tags: descriptor.tags,
            version: descriptor.version,
          }
        : undefined,
      fallback_tool_call_id: fallbackToolCallId,
      input: toolCall.input,
      output: toolCall.output ?? {},
      risk_level: toolCall.risk_level,
      status: toolCall.status,
    },
  };
}

export function mapHermesMessageEvent(
  message: HermesMessage,
  conversation?: HermesConversation,
): UnifiedAuditEvent {
  return {
    id: `audit_${message.id}`,
    event_type: `agent.message.${message.role}`,
    source: message.role === 'tool' ? 'scriptHub.tool_bridge' : `external_hermes.${message.role}`,
    message: message.content,
    level: message.role === 'tool' ? 'audit' : 'info',
    target_type: 'conversation',
    target_id: message.conversation_id,
    trace_id: conversation?.trace_id ?? 'trace_unknown',
    occurred_at: message.created_at,
    audit_source: 'hermes',
    detail: {
      conversation_id: message.conversation_id,
      role: message.role,
      tool_call_id: message.tool_call_id ?? '',
    },
  };
}

function getSearchableAuditTokens(event: UnifiedAuditEvent): string[] {
  return [
    event.trace_id,
    event.target_id,
    getString(event.detail?.conversation_id),
    getString(event.detail?.fallback_tool_call_id),
    getString(event.detail?.trace_id),
    getString(event.detail?.tool_call_id),
    ...getNestedIdTokens(event.detail),
  ].filter((token): token is string => Boolean(token));
}

function makeField(label: string, rawValue: unknown) {
  const value = formatReadableValue(rawValue);
  return value ? { label, value } : undefined;
}

function getNestedIdTokens(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) => {
    if (['conversation_id', 'trace_id', 'tool_call_id'].includes(key)) {
      return getString(nestedValue) ? [String(nestedValue)] : [];
    }

    if (nestedValue && typeof nestedValue === 'object') return getNestedIdTokens(nestedValue);

    return [];
  });
}

function makeRelatedRecord(type: RelatedAuditRecord['type'], record?: Record<string, unknown>): RelatedAuditRecord | undefined {
  if (!record) return undefined;

  const fields = getReadableFields(type, record);
  if (fields.length === 0) return undefined;

  return { type, fields };
}

function getReadableFields(type: RelatedAuditRecord['type'], record: Record<string, unknown>) {
  const fieldMap: Record<RelatedAuditRecord['type'], Array<[string, string]>> = {
    Task: [
      ['ID', 'id'],
      ['Status', 'status'],
      ['Goal', 'goal'],
      ['Owner', 'owner'],
      ['Risk', 'risk_level'],
      ['Approval', 'approval_status'],
      ['Trace', 'trace_id'],
    ],
    Approval: [
      ['ID', 'id'],
      ['Status', 'status'],
      ['Target', 'target_id'],
      ['Risk', 'risk_level'],
      ['Reason', 'reason'],
      ['Reviewed by', 'reviewed_by'],
      ['Trace', 'trace_id'],
    ],
    SkillCandidate: [
      ['ID', 'id'],
      ['Name', 'name'],
      ['Status', 'status'],
      ['Summary', 'summary'],
      ['Risk', 'risk_level'],
      ['Trace', 'source_trace_id'],
    ],
  };

  return fieldMap[type].flatMap(([label, key]) => {
    const value = formatReadableValue(record[key]);
    return value ? [{ label, value }] : [];
  });
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || Array.isArray(value) || typeof value !== 'object') return undefined;
  return value as Record<string, unknown>;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function formatReadableValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}
