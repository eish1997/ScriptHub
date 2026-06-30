import type { ToolCallRecord } from './hermesConversation';
import {
  getToolBridgeDescriptor,
  type JsonSchema,
  type ToolBridgeDescriptor,
  type ToolBridgeTransport,
} from './toolBridgeDescriptors';

export type ToolBridgeCallerAgent = {
  auth_token_hint?: string;
  id: string;
  name: string;
  scopes?: string[];
  transport: ToolBridgeTransport;
  version?: string;
};

export type ToolBridgeCallRequest = {
  caller_agent: ToolBridgeCallerAgent;
  conversation_id: string;
  dry_run?: boolean;
  idempotency_key?: string;
  input: Record<string, unknown>;
  parent_tool_call_id?: string;
  requested_at: string;
  tool_name: string;
  tool_version?: string;
  trace_id?: string;
};

export type ToolBridgeErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'unsupported_transport'
  | 'version_mismatch';

export type ToolBridgeValidationIssue = {
  code: ToolBridgeErrorCode;
  message: string;
  path?: string;
};

export type ToolBridgeValidationResult = {
  descriptor?: ToolBridgeDescriptor;
  issues: ToolBridgeValidationIssue[];
  ok: boolean;
};

export type ToolBridgeCallError = {
  code: ToolBridgeErrorCode;
  detail?: ToolBridgeValidationIssue[];
  message: string;
  recoverable: boolean;
};

export type ToolBridgeCallAudit = {
  actor_id: string;
  actor_type: 'external_hermes' | 'scriptHub' | 'system' | 'user';
  audit_id: string;
  auth_token_hint?: string;
  caller_agent_id: string;
  created_at: string;
  permissions_checked: string[];
  policy_decision: 'allow' | 'deny';
  risk_level: ToolCallRecord['risk_level'];
  scopes: string[];
  transport: ToolBridgeTransport;
};

export type ToolBridgeCallResult = {
  audit: ToolBridgeCallAudit;
  conversation_id: string;
  error?: ToolBridgeCallError;
  finished_at?: string;
  output?: Record<string, unknown>;
  started_at: string;
  status: ToolCallRecord['status'] | 'cancelled' | 'queued';
  tool_call_id: string;
  tool_name: string;
  trace_id: string;
};

export function createToolBridgeCallRequestFromToolCall(input: {
  requestedAt: string;
  toolCall: ToolCallRecord;
  transport: ToolBridgeTransport;
}): ToolBridgeCallRequest {
  return {
    caller_agent: {
      id: 'external_hermes_dev',
      name: 'External Hermes',
      transport: input.transport,
      version: 'dev',
    },
    conversation_id: input.toolCall.conversation_id,
    input: removeUndefined(input.toolCall.input),
    requested_at: input.requestedAt,
    tool_name: input.toolCall.tool_name,
    tool_version: getToolBridgeDescriptor(input.toolCall.tool_name)?.version,
    trace_id: input.toolCall.trace_id,
  };
}

export function validateToolBridgeCallRequest(request: ToolBridgeCallRequest): ToolBridgeValidationResult {
  const descriptor = getToolBridgeDescriptor(request.tool_name);
  const issues: ToolBridgeValidationIssue[] = [];

  if (!descriptor) {
    return {
      issues: [
        {
          code: 'not_found',
          message: `Tool descriptor not found for ${request.tool_name}`,
          path: 'tool_name',
        },
      ],
      ok: false,
    };
  }

  if (request.tool_version && request.tool_version !== descriptor.version) {
    issues.push({
      code: 'version_mismatch',
      message: `Tool version ${request.tool_version} does not match descriptor version ${descriptor.version}`,
      path: 'tool_version',
    });
  }

  if (!descriptor.supported_transports.includes(request.caller_agent.transport)) {
    issues.push({
      code: 'unsupported_transport',
      message: `Transport ${request.caller_agent.transport} is not supported by ${descriptor.name}`,
      path: 'caller_agent.transport',
    });
  }

  issues.push(...validateJsonValue(request.input, descriptor.input_schema, 'input'));

  return {
    descriptor,
    issues,
    ok: issues.length === 0,
  };
}

function validateJsonValue(value: unknown, schema: JsonSchema, path: string): ToolBridgeValidationIssue[] {
  if (value === undefined) return [];
  if (schema.type === 'object') return validateObjectValue(value, schema, path);
  if (schema.type === 'array') return validateArrayValue(value, schema, path);
  if (!matchesPrimitiveType(value, schema.type)) {
    return [
      {
        code: 'invalid_input',
        message: `Expected ${schema.type}`,
        path,
      },
    ];
  }
  if (schema.enum && typeof value === 'string' && !schema.enum.includes(value)) {
    return [
      {
        code: 'invalid_input',
        message: `Expected one of ${schema.enum.join(', ')}`,
        path,
      },
    ];
  }
  return [];
}

function validateObjectValue(value: unknown, schema: JsonSchema, path: string): ToolBridgeValidationIssue[] {
  if (!isRecord(value)) {
    return [
      {
        code: 'invalid_input',
        message: 'Expected object',
        path,
      },
    ];
  }

  const issues: ToolBridgeValidationIssue[] = [];
  const properties = schema.properties ?? {};
  for (const requiredKey of schema.required ?? []) {
    if (value[requiredKey] === undefined) {
      issues.push({
        code: 'invalid_input',
        message: `${requiredKey} is required`,
        path: `${path}.${requiredKey}`,
      });
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        issues.push({
          code: 'invalid_input',
          message: `${key} is not allowed`,
          path: `${path}.${key}`,
        });
      }
    }
  }

  for (const [key, childSchema] of Object.entries(properties)) {
    issues.push(...validateJsonValue(value[key], childSchema, `${path}.${key}`));
  }
  return issues;
}

function validateArrayValue(value: unknown, schema: JsonSchema, path: string): ToolBridgeValidationIssue[] {
  if (!Array.isArray(value)) {
    return [
      {
        code: 'invalid_input',
        message: 'Expected array',
        path,
      },
    ];
  }
  if (!schema.items) return [];
  return value.flatMap((item, index) => validateJsonValue(item, schema.items as JsonSchema, `${path}.${index}`));
}

function matchesPrimitiveType(value: unknown, type: JsonSchema['type']) {
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number';
  if (type === 'string') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'null') return value === null;
  return true;
}

function removeUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
