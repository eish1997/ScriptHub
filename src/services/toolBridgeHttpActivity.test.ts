import { describe, expect, it } from 'vitest';
import { mapExternalHttpToolCall } from './toolBridgeHttpActivity';

describe('toolBridgeHttpActivity', () => {
  it('maps external HTTP Tool Bridge calls into UI ToolCall records', () => {
    expect(mapExternalHttpToolCall({
      audit: {
        risk_level: 'high',
      },
      conversation_id: 'conv_http_001',
      input: {
        capability_id: 'maya.export_fbx.v1',
        output_path: 'project://exports/demo.fbx',
        overwrite: false,
      },
      output: {
        approval_id: 'approval_http_001',
        task_id: 'task_http_001',
      },
      started_at: '2026-05-23T10:00:00.000Z',
      status: 'needs_approval',
      tool_call_id: 'tc_http_001',
      tool_name: 'scriptHub.task.create',
      trace_id: 'trace_http_001',
    })).toMatchObject({
      approval_required: true,
      conversation_id: 'conv_http_001',
      id: 'tc_http_001',
      risk_level: 'high',
      status: 'needs_approval',
      title: '外部 HTTP 创建任务',
      tool_name: 'scriptHub.task.create',
      trace_id: 'trace_http_001',
    });
  });
});
