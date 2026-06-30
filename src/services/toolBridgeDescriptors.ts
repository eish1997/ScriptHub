import type { ToolCallRecord } from './hermesConversation';

export type JsonSchema = {
  additionalProperties?: boolean;
  enum?: string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type: 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string';
};

export type ToolBridgeTransport = 'mcp' | 'http' | 'local_bridge';

export type ToolBridgeDescriptor = {
  approval_required: boolean;
  description: string;
  idempotent: boolean;
  input_schema: JsonSchema;
  name: string;
  output_schema: JsonSchema;
  owner: 'ScriptHub';
  permissions: string[];
  retryable: boolean;
  risk_level: ToolCallRecord['risk_level'];
  supported_transports: ToolBridgeTransport[];
  tags: string[];
  timeout_ms: number;
  title: string;
  version: string;
};

export type McpToolListItem = {
  description: string;
  inputSchema: JsonSchema;
  name: string;
  title: string;
};

export type HttpToolListItem = ToolBridgeDescriptor;

const commonTransports: ToolBridgeTransport[] = ['mcp', 'http', 'local_bridge'];

export const toolBridgeDescriptors = [
  {
    name: 'scriptHub.connector.health.get',
    title: 'Get Connector Health',
    version: '1.0.0',
    description: 'Read the current health state of a ScriptHub connector.',
    input_schema: objectSchema({
      connector_id: stringSchema(),
    }, ['connector_id']),
    output_schema: objectSchema({
      connector_id: stringSchema(),
      latency_ms: numberSchema(),
      state: stringSchema(['healthy', 'degraded', 'offline']),
      status: stringSchema(['connected', 'disconnected']),
      trace_id: stringSchema(),
    }, ['connector_id', 'state', 'status', 'trace_id']),
    permissions: ['connector:read'],
    risk_level: 'low',
    approval_required: false,
    idempotent: true,
    retryable: true,
    timeout_ms: 5000,
    owner: 'ScriptHub',
    tags: ['connector', 'tool-bridge'],
    supported_transports: commonTransports,
  },
  {
    name: 'scriptHub.task.create',
    title: 'Create Task',
    version: '1.0.0',
    description: 'Create a ScriptHub task from external Hermes intent.',
    input_schema: objectSchema({
      capability_id: stringSchema(),
      output_path: stringSchema(),
      overwrite: booleanSchema(),
    }, ['capability_id', 'output_path', 'overwrite']),
    output_schema: objectSchema({
      approval_id: stringSchema(),
      task_id: stringSchema(),
      task_status: stringSchema(['planned', 'running', 'completed', 'failed', 'cancelled']),
      trace_id: stringSchema(),
    }, ['approval_id', 'task_id', 'task_status', 'trace_id']),
    permissions: ['task:create'],
    risk_level: 'high',
    approval_required: true,
    idempotent: true,
    retryable: true,
    timeout_ms: 30000,
    owner: 'ScriptHub',
    tags: ['task', 'tool-bridge'],
    supported_transports: commonTransports,
  },
  {
    name: 'scriptHub.approval.decide',
    title: 'Decide Approval',
    version: '1.0.0',
    description: 'Apply an approval decision confirmed through external Hermes conversation.',
    input_schema: objectSchema({
      approval_id: stringSchema(),
      conversation_id: stringSchema(),
      decision: stringSchema(['approved', 'rejected']),
      decision_note: stringSchema(),
    }, ['approval_id', 'conversation_id', 'decision']),
    output_schema: objectSchema({
      approval_id: stringSchema(),
      approval_status: stringSchema(['approved', 'rejected', 'pending']),
      decision: stringSchema(['approved', 'rejected']),
      task_id: stringSchema(),
      task_status: stringSchema(['planned', 'running', 'completed', 'failed', 'cancelled']),
      trace_id: stringSchema(),
    }, ['approval_id', 'approval_status', 'decision', 'trace_id']),
    permissions: ['approval:decide'],
    risk_level: 'high',
    approval_required: false,
    idempotent: true,
    retryable: false,
    timeout_ms: 15000,
    owner: 'ScriptHub',
    tags: ['approval', 'tool-bridge'],
    supported_transports: commonTransports,
  },
  {
    name: 'scriptHub.asset.register',
    title: 'Register Asset',
    version: '1.0.0',
    description: 'Register an exported asset and attach provenance to a ScriptHub trace.',
    input_schema: objectSchema({
      approval_id: stringSchema(),
      source_uri: stringSchema(),
      storage_uri: stringSchema(),
      task_id: stringSchema(),
      trace_id: stringSchema(),
    }, ['storage_uri', 'task_id', 'trace_id']),
    output_schema: objectSchema({
      asset_id: stringSchema(),
      asset_type: stringSchema(),
      status: stringSchema(['created', 'validated', 'rejected']),
      storage_uri: stringSchema(),
      trace_id: stringSchema(),
    }, ['asset_id', 'status', 'storage_uri', 'trace_id']),
    permissions: ['asset:register'],
    risk_level: 'low',
    approval_required: false,
    idempotent: true,
    retryable: true,
    timeout_ms: 15000,
    owner: 'ScriptHub',
    tags: ['asset', 'provenance', 'tool-bridge'],
    supported_transports: commonTransports,
  },
  {
    name: 'scriptHub.skill.candidate.create',
    title: 'Create Skill Candidate',
    version: '1.0.0',
    description: 'Create or update a skill candidate draft from a Tool Bridge trace.',
    input_schema: objectSchema({
      asset_id: stringSchema(),
      source: stringSchema(['tool_call_sequence', 'runtime_tool_call_sequence', 'conversation']),
      source_trace_id: stringSchema(),
    }, ['source', 'source_trace_id']),
    output_schema: objectSchema({
      skill_candidate_id: stringSchema(),
      status: stringSchema(['draft', 'reviewing', 'validated', 'published', 'rejected']),
      trace_id: stringSchema(),
    }, ['skill_candidate_id', 'status']),
    permissions: ['skill_candidate:create'],
    risk_level: 'low',
    approval_required: false,
    idempotent: true,
    retryable: true,
    timeout_ms: 15000,
    owner: 'ScriptHub',
    tags: ['skill', 'tool-bridge', 'provenance'],
    supported_transports: commonTransports,
  },
  {
    name: 'scriptHub.skill.candidate.save_draft',
    title: 'Save Skill Candidate Draft',
    version: '1.0.0',
    description: 'Save a skill candidate as draft from external Hermes workflow control.',
    input_schema: skillCandidateTransitionInputSchema(),
    output_schema: skillCandidateTransitionOutputSchema('draft'),
    permissions: ['skill_candidate:update'],
    risk_level: 'low',
    approval_required: false,
    idempotent: true,
    retryable: true,
    timeout_ms: 10000,
    owner: 'ScriptHub',
    tags: ['skill', 'review-flow', 'tool-bridge'],
    supported_transports: commonTransports,
  },
  {
    name: 'scriptHub.skill.candidate.submit_review',
    title: 'Submit Skill Candidate For Review',
    version: '1.0.0',
    description: 'Submit a skill candidate draft for human review.',
    input_schema: skillCandidateTransitionInputSchema(),
    output_schema: skillCandidateTransitionOutputSchema('reviewing'),
    permissions: ['skill_candidate:submit_review'],
    risk_level: 'medium',
    approval_required: false,
    idempotent: true,
    retryable: true,
    timeout_ms: 10000,
    owner: 'ScriptHub',
    tags: ['skill', 'review-flow', 'tool-bridge'],
    supported_transports: commonTransports,
  },
  {
    name: 'scriptHub.skill.candidate.reject',
    title: 'Reject Skill Candidate',
    version: '1.0.0',
    description: 'Reject a skill candidate under review and keep traceable review context.',
    input_schema: skillCandidateTransitionInputSchema(),
    output_schema: skillCandidateTransitionOutputSchema('rejected'),
    permissions: ['skill_candidate:review'],
    risk_level: 'medium',
    approval_required: false,
    idempotent: true,
    retryable: false,
    timeout_ms: 10000,
    owner: 'ScriptHub',
    tags: ['skill', 'review-flow', 'tool-bridge'],
    supported_transports: commonTransports,
  },
  {
    name: 'scriptHub.skill.candidate.publish',
    title: 'Publish Skill Candidate',
    version: '1.0.0',
    description: 'Publish a reviewed skill candidate so Hermes can reuse it as a durable skill.',
    input_schema: skillCandidateTransitionInputSchema(),
    output_schema: skillCandidateTransitionOutputSchema('published'),
    permissions: ['skill_candidate:publish'],
    risk_level: 'high',
    approval_required: true,
    idempotent: true,
    retryable: false,
    timeout_ms: 15000,
    owner: 'ScriptHub',
    tags: ['skill', 'review-flow', 'tool-bridge'],
    supported_transports: commonTransports,
  },
] satisfies ToolBridgeDescriptor[];

export function listToolBridgeDescriptors() {
  return toolBridgeDescriptors;
}

export function getToolBridgeDescriptor(name: string) {
  return toolBridgeDescriptors.find((descriptor) => descriptor.name === name);
}

export function listMcpToolDescriptors(): McpToolListItem[] {
  return toolBridgeDescriptors.map((descriptor) => ({
    description: descriptor.description,
    inputSchema: descriptor.input_schema,
    name: descriptor.name,
    title: descriptor.title,
  }));
}

export function listHttpToolDescriptors(): HttpToolListItem[] {
  return toolBridgeDescriptors;
}

function objectSchema(properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema {
  return {
    additionalProperties: false,
    properties,
    required,
    type: 'object',
  };
}

function stringSchema(values?: string[]): JsonSchema {
  return values ? { enum: values, type: 'string' } : { type: 'string' };
}

function booleanSchema(): JsonSchema {
  return { type: 'boolean' };
}

function numberSchema(): JsonSchema {
  return { type: 'number' };
}

function skillCandidateTransitionInputSchema(): JsonSchema {
  return objectSchema({
    actor_id: stringSchema(),
    conversation_id: stringSchema(),
    note: stringSchema(),
    skill_candidate_id: stringSchema(),
    trace_id: stringSchema(),
  }, ['skill_candidate_id', 'trace_id']);
}

function skillCandidateTransitionOutputSchema(status: string): JsonSchema {
  return objectSchema({
    skill_candidate_id: stringSchema(),
    status: stringSchema([status]),
    trace_id: stringSchema(),
  }, ['skill_candidate_id', 'status', 'trace_id']);
}
