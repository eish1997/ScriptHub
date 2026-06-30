import type { SkillCandidateStatus } from './skillCandidateTransitions';

export type HermesConversation = {
  id: string;
  title: string;
  status: 'active' | 'waiting_user' | 'running' | 'completed' | 'failed';
  trace_id: string;
  created_at: string;
  updated_at: string;
};

export type HermesMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'hermes' | 'system' | 'tool';
  content: string;
  created_at: string;
  tool_call_id?: string;
};

export type ToolCallStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'needs_approval';

export type ToolCallRecord = {
  id: string;
  conversation_id: string;
  trace_id: string;
  tool_name: string;
  title: string;
  status: ToolCallStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  risk_level: 'low' | 'medium' | 'high';
  approval_required: boolean;
  started_at: string;
  finished_at?: string;
};

export type SkillCandidate = {
  id: string;
  source_conversation_id: string;
  source_trace_id: string;
  name: string;
  summary: string;
  trigger_examples: string[];
  steps: SkillStep[];
  required_tools: string[];
  required_permissions: string[];
  risk_level: 'low' | 'medium' | 'high';
  status: SkillCandidateStatus;
  created_at: string;
};

export type SkillStep = {
  order: number;
  intent: string;
  tool_name?: string;
  input_template?: Record<string, unknown>;
  approval_required?: boolean;
  failure_handling?: string;
};

export type HermesConversationState = {
  conversation: HermesConversation;
  messages: HermesMessage[];
  toolCalls: ToolCallRecord[];
  skillCandidate: SkillCandidate;
};

const now = '2026-05-20T09:30:00.000Z';

export const initialHermesConversation: HermesConversationState = {
  conversation: {
    id: 'conv_hermes_fbx_001',
    title: '通过 Hermes 导出 FBX',
    status: 'waiting_user',
    trace_id: 'trace_fbx_export_001',
    created_at: now,
    updated_at: now,
  },
  messages: [
    {
      id: 'msg_001',
      conversation_id: 'conv_hermes_fbx_001',
      role: 'system',
      content: 'Hermes 已连接 ScriptHub 工具桥，当前以记录、审批和技能沉淀优先。',
      created_at: now,
    },
    {
      id: 'msg_002',
      conversation_id: 'conv_hermes_fbx_001',
      role: 'user',
      content: '把 Maya 里当前选中的模型导出成 FBX，放到项目 exports 目录。',
      created_at: now,
    },
    {
      id: 'msg_003',
      conversation_id: 'conv_hermes_fbx_001',
      role: 'hermes',
      content: '我会先检查 Maya Connector，再读取当前选择，随后创建高风险写入任务并等待审批。',
      created_at: now,
    },
  ],
  toolCalls: [
    {
      id: 'tool_001',
      conversation_id: 'conv_hermes_fbx_001',
      trace_id: 'trace_fbx_export_001',
      tool_name: 'connector.health.get',
      title: '检查 Maya Connector',
      status: 'succeeded',
      input: { connector_id: 'connector_maya_local' },
      output: { state: 'healthy', latency_ms: 18 },
      risk_level: 'low',
      approval_required: false,
      started_at: now,
      finished_at: now,
    },
    {
      id: 'tool_002',
      conversation_id: 'conv_hermes_fbx_001',
      trace_id: 'trace_fbx_export_001',
      tool_name: 'connector.capability.list',
      title: '读取可用工具',
      status: 'succeeded',
      input: { target: 'maya' },
      output: { capabilities: ['maya.current_selection', 'asset.export.fbx'] },
      risk_level: 'low',
      approval_required: false,
      started_at: now,
      finished_at: now,
    },
    {
      id: 'tool_003',
      conversation_id: 'conv_hermes_fbx_001',
      trace_id: 'trace_fbx_export_001',
      tool_name: 'task.create',
      title: '创建 FBX 导出任务',
      status: 'needs_approval',
      input: {
        capability_id: 'maya.export_fbx.v1',
        output_path: 'project://exports/selected_asset.fbx',
        overwrite: false,
      },
      output: { task_id: 'task_fbx_export_001', approval_id: 'approval_fbx_export_001' },
      risk_level: 'high',
      approval_required: true,
      started_at: now,
      finished_at: now,
    },
  ],
  skillCandidate: {
    id: 'skill_candidate_fbx_export_001',
    source_conversation_id: 'conv_hermes_fbx_001',
    source_trace_id: 'trace_fbx_export_001',
    name: 'Maya 当前选择导出 FBX',
    summary: '将 Maya 当前选择导出为项目 FBX 资产，并保留审批、事件和资产来源链。',
    trigger_examples: [
      '把当前选中的模型导出 FBX',
      '导出 Maya 当前选择到项目 exports',
      '生成一个可追溯的 FBX 资产',
    ],
    steps: [
      {
        order: 1,
        intent: '确认 Maya Connector 可用',
        tool_name: 'connector.health.get',
      },
      {
        order: 2,
        intent: '读取 Connector 能力和当前选择',
        tool_name: 'connector.capability.list',
      },
      {
        order: 3,
        intent: '创建导出任务并暴露写入路径',
        tool_name: 'task.create',
        input_template: {
          capability_id: 'maya.export_fbx.v1',
          output_path: '{{project_exports}}/{{asset_name}}.fbx',
          overwrite: false,
        },
        approval_required: true,
        failure_handling: '路径冲突时要求用户修改输出路径或显式允许覆盖。',
      },
    ],
    required_tools: ['connector.health.get', 'connector.capability.list', 'task.create', 'approval.decide'],
    required_permissions: ['dcc.maya.read_selection', 'filesystem.write', 'approval.decide'],
    risk_level: 'high',
    status: 'draft',
    created_at: now,
  },
};

export function submitHermesMessage(state: HermesConversationState, content: string): HermesConversationState {
  const submittedAt = new Date().toISOString();
  const messageId = Date.now();
  const userMessage: HermesMessage = {
    id: `msg_user_${messageId}`,
    conversation_id: state.conversation.id,
    role: 'user',
    content,
    created_at: submittedAt,
  };
  const toolCall: ToolCallRecord = {
    id: `tool_draft_${messageId}`,
    conversation_id: state.conversation.id,
    trace_id: state.conversation.trace_id,
    tool_name: 'skill.candidate.create',
    title: '更新技能候选草稿',
    status: 'succeeded',
    input: { message: content },
    output: { skill_candidate_id: state.skillCandidate.id, status: 'draft' },
    risk_level: 'low',
    approval_required: false,
    started_at: submittedAt,
    finished_at: submittedAt,
  };
  const hermesMessage: HermesMessage = {
    id: `msg_hermes_${messageId}`,
    conversation_id: state.conversation.id,
    role: 'hermes',
    content: '已把这次补充写入技能候选草稿。真正执行前，我会继续把工具调用、审批点和失败处理写进 trace。',
    created_at: submittedAt,
    tool_call_id: toolCall.id,
  };

  return {
    conversation: {
      ...state.conversation,
      status: 'active',
      updated_at: submittedAt,
    },
    messages: [...state.messages, userMessage, hermesMessage],
    toolCalls: [...state.toolCalls, toolCall],
    skillCandidate: {
      ...state.skillCandidate,
      trigger_examples: [...state.skillCandidate.trigger_examples, content],
    },
  };
}
