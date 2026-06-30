import { describe, expect, it } from 'vitest';
import {
  buildUnifiedAuditEvents,
  filterAuditEvents,
  getRelatedAuditRecords,
  getToolBridgeContractRecord,
  mapHermesMessageEvent,
  mapToolCallEvent,
} from './auditEvents';
import type { HermesConversation, HermesMessage, ToolCallRecord } from './hermesConversation';
import type { RuntimeEvent } from './mockRuntime';

const occurredAt = '2026-05-20T09:30:00.000Z';

const runtimeEvent: RuntimeEvent = {
  id: 'evt_runtime_001',
  type: 'event',
  version: '1.0.0',
  event_type: 'task.created',
  source: 'runtime.task',
  target_type: 'task',
  target_id: 'task_001',
  level: 'audit',
  message: 'Task created',
  occurred_at: occurredAt,
  trace_id: 'trace_runtime_001',
};

const conversation: HermesConversation = {
  id: 'conv_001',
  title: 'External task',
  status: 'active',
  trace_id: 'trace_hermes_001',
  created_at: occurredAt,
  updated_at: occurredAt,
};

const hermesMessage: HermesMessage = {
  id: 'msg_001',
  conversation_id: conversation.id,
  role: 'hermes',
  content: 'I will create the task.',
  created_at: occurredAt,
  tool_call_id: 'tool_001',
};

const toolCall: ToolCallRecord = {
  id: 'tool_001',
  conversation_id: conversation.id,
  trace_id: 'trace_tool_001',
  tool_name: 'scriptHub.task.create',
  title: 'Create task',
  status: 'needs_approval',
  input: { capability_id: 'maya.export_fbx.v1' },
  output: { task_id: 'task_001', approval_id: 'approval_001' },
  risk_level: 'high',
  approval_required: true,
  started_at: occurredAt,
  finished_at: occurredAt,
};

describe('auditEvents', () => {
  it('builds unified events with source buckets', () => {
    const events = buildUnifiedAuditEvents({
      conversation,
      messages: [hermesMessage],
      runtimeEvents: [runtimeEvent],
      toolCalls: [toolCall],
    });

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.audit_source)).toEqual(['runtime', 'tool_bridge', 'hermes']);
  });

  it('filters by source and level', () => {
    const events = [
      { ...runtimeEvent, audit_source: 'runtime' as const },
      mapToolCallEvent(toolCall),
      mapHermesMessageEvent(hermesMessage, conversation),
    ];

    expect(filterAuditEvents(events, { level: 'all', source: 'tool_bridge', keyword: '' })).toEqual([
      expect.objectContaining({ id: 'audit_tool_001' }),
    ]);
    expect(filterAuditEvents(events, { level: 'audit', source: 'runtime', keyword: '' })).toEqual([
      expect.objectContaining({ id: 'evt_runtime_001' }),
    ]);
  });

  it('filters by conversation_id, trace_id, and tool_call_id', () => {
    const events = [
      { ...runtimeEvent, audit_source: 'runtime' as const },
      mapToolCallEvent(toolCall),
      mapHermesMessageEvent(hermesMessage, conversation),
    ];

    expect(filterAuditEvents(events, { level: 'all', source: 'all', keyword: 'conv_001' })).toHaveLength(2);
    expect(filterAuditEvents(events, { level: 'all', source: 'all', keyword: 'trace_runtime_001' })).toEqual([
      expect.objectContaining({ id: 'evt_runtime_001' }),
    ]);
    expect(filterAuditEvents(events, { level: 'all', source: 'all', keyword: 'tool_001' })).toHaveLength(2);
  });

  it('adds descriptor metadata and contract validation to Tool Bridge audit details', () => {
    const event = mapToolCallEvent({
      ...toolCall,
      output: {
        approval_id: 'approval_001',
        contract_validation: { errors: [], status: 'passed' },
        fallback_tool_call_id: 'tc_fallback_001',
        task_id: 'task_001',
      },
    });

    expect(event.detail).toMatchObject({
      contract_validation: { errors: [], status: 'passed' },
      descriptor: {
        approval_required: true,
        name: 'scriptHub.task.create',
        permissions: ['task:create'],
        risk_level: 'high',
        version: '1.0.0',
      },
      fallback_tool_call_id: 'tc_fallback_001',
    });
    expect(getToolBridgeContractRecord(event.detail)).toEqual({
      fields: expect.arrayContaining([
        { label: 'Version', value: '1.0.0' },
        { label: 'Permissions', value: 'task:create' },
        { label: 'Risk', value: 'high' },
        { label: 'Approval', value: 'true' },
        { label: 'Validation', value: 'passed' },
        { label: 'Fallback call', value: 'tc_fallback_001' },
      ]),
    });
    expect(filterAuditEvents([event], { level: 'all', source: 'all', keyword: 'tc_fallback_001' })).toEqual([event]);
  });

  it('keeps Maya Connector repair suggestions in audit details', () => {
    const event = mapToolCallEvent({
      ...toolCall,
      error: 'Output already exists',
      output: {
        repair_suggestion: {
          recommendedAction: 'confirm_overwrite_or_rename',
          userMessage: '目标 FBX 已存在。',
        },
      },
      status: 'failed',
      title: '真实 Maya Connector 导出失败',
      tool_name: 'scriptHub.mayaConnector.exportFbx',
    });

    expect(event.level).toBe('error');
    expect(event.message).toBe('Output already exists');
    expect(event.detail?.output).toEqual({
      repair_suggestion: {
        recommendedAction: 'confirm_overwrite_or_rename',
        userMessage: '目标 FBX 已存在。',
      },
    });
  });

  it('extracts readable related records from detail', () => {
    const records = getRelatedAuditRecords({
      task: {
        id: 'task_001',
        status: 'waiting_approval',
        goal: 'Export FBX',
        owner: 'operator',
        risk_level: 'high',
        approval_status: 'pending',
        trace_id: 'trace_001',
      },
      approval: {
        id: 'approval_001',
        status: 'pending',
        target_id: 'task_001',
        risk_level: 'high',
        reason: 'Filesystem write',
        trace_id: 'trace_001',
      },
      skill_candidate: {
        id: 'skill_001',
        name: 'Export current selection',
        status: 'draft',
        summary: 'Create an export workflow.',
        risk_level: 'high',
        source_trace_id: 'trace_001',
      },
    });

    expect(records).toEqual([
      expect.objectContaining({
        type: 'Task',
        fields: expect.arrayContaining([
          { label: 'ID', value: 'task_001' },
          { label: 'Goal', value: 'Export FBX' },
        ]),
      }),
      expect.objectContaining({
        type: 'Approval',
        fields: expect.arrayContaining([
          { label: 'ID', value: 'approval_001' },
          { label: 'Reason', value: 'Filesystem write' },
        ]),
      }),
      expect.objectContaining({
        type: 'SkillCandidate',
        fields: expect.arrayContaining([
          { label: 'ID', value: 'skill_001' },
          { label: 'Name', value: 'Export current selection' },
        ]),
      }),
    ]);
  });
});
