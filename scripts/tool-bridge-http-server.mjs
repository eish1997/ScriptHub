import http from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.env.SCRIPTHUB_TOOL_BRIDGE_PORT ?? 8787);
const storagePath = path.resolve(
  process.env.SCRIPTHUB_TOOL_BRIDGE_STORE ?? '.scripthub/tool-bridge-calls.json',
);
const calls = new Map();
const idempotentCalls = new Map();

const descriptors = [
  {
    name: 'scriptHub.task.create',
    title: 'Create Task',
    version: '1.0.0',
    description: 'Create a ScriptHub task from external Hermes intent.',
    permissions: ['task:create'],
    risk_level: 'high',
    approval_required: true,
    supported_transports: ['http'],
    input_schema: {
      type: 'object',
      required: ['capability_id', 'output_path', 'overwrite'],
      properties: {
        capability_id: { type: 'string' },
        output_path: { type: 'string' },
        overwrite: { type: 'boolean' },
      },
    },
  },
  {
    name: 'scriptHub.asset.register',
    title: 'Register Asset',
    version: '1.0.0',
    description: 'Register an exported asset and attach provenance to a ScriptHub trace.',
    permissions: ['asset:register'],
    risk_level: 'low',
    approval_required: false,
    supported_transports: ['http'],
    input_schema: {
      type: 'object',
      required: ['storage_uri', 'task_id', 'trace_id'],
      properties: {
        approval_id: { type: 'string' },
        source_uri: { type: 'string' },
        storage_uri: { type: 'string' },
        task_id: { type: 'string' },
        trace_id: { type: 'string' },
      },
    },
  },
];

await loadStoredCalls();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    return sendJson(response, 200, {
      ok: true,
      persisted_call_count: calls.size,
      service: 'scriptHub.toolBridge.http',
      storage_path: storagePath,
      timestamp: new Date().toISOString(),
    });
  }

  if (request.method === 'GET' && url.pathname === '/tool-bridge/tools') {
    return sendRoute(response, true, 'trace_tool_bridge_discovery', descriptors);
  }

  if (request.method === 'POST' && url.pathname === '/tool-bridge/calls') {
    const body = await readJson(request);
    const result = await callTool(body);
    return sendRoute(response, result.status !== 'failed', result.trace_id, result, result.error);
  }

  if (request.method === 'GET' && url.pathname === '/tool-bridge/calls') {
    return sendRoute(response, true, 'trace_tool_bridge_calls', Array.from(calls.values()));
  }

  const callMatch = url.pathname.match(/^\/tool-bridge\/calls\/([^/]+)$/);
  if (request.method === 'GET' && callMatch) {
    const result = calls.get(callMatch[1]);
    if (!result) {
      return sendRoute(response, false, 'trace_unknown', undefined, {
        code: 'not_found',
        message: `Tool call ${callMatch[1]} not found`,
        recoverable: false,
      });
    }
    return sendRoute(response, true, result.trace_id, result);
  }

  return sendJson(response, 404, {
    ok: false,
    error: {
      code: 'not_found',
      message: `${request.method} ${url.pathname} is not a ScriptHub Tool Bridge route`,
    },
  });
});

server.listen(port, () => {
  console.log(`ScriptHub Tool Bridge HTTP listening on http://localhost:${port}`);
  console.log(`ToolCall persistence: ${storagePath}`);
});

async function callTool(request) {
  if (request?.idempotency_key && idempotentCalls.has(request.idempotency_key)) {
    return idempotentCalls.get(request.idempotency_key);
  }

  const now = new Date().toISOString();
  const traceId = request?.trace_id ?? `trace_tool_bridge_${Date.now()}`;
  const toolCallId = `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const descriptor = descriptors.find((tool) => tool.name === request?.tool_name);
  const validationIssues = validateRequest(request, descriptor);
  const ok = validationIssues.length === 0;

  const result = {
    audit: {
      actor_id: request?.caller_agent?.id ?? 'external_client',
      actor_type: 'external_hermes',
      audit_id: `audit_${toolCallId}`,
      caller_agent_id: request?.caller_agent?.id ?? 'external_client',
      created_at: now,
      permissions_checked: descriptor?.permissions ?? [],
      policy_decision: ok ? 'allow' : 'deny',
      risk_level: descriptor?.risk_level ?? 'high',
      scopes: request?.caller_agent?.scopes ?? [],
      transport: request?.caller_agent?.transport ?? 'http',
    },
    conversation_id: request?.conversation_id ?? 'conv_external_http',
    error: ok
      ? undefined
      : {
          code: 'invalid_input',
          detail: validationIssues,
          message: validationIssues.map((issue) => issue.message).join('; '),
          recoverable: true,
        },
    finished_at: now,
    output: ok ? buildOutput(descriptor, request, traceId) : undefined,
    request_idempotency_key: request?.idempotency_key,
    started_at: now,
    status: ok ? (descriptor.approval_required ? 'needs_approval' : 'succeeded') : 'failed',
    tool_call_id: toolCallId,
    tool_name: request?.tool_name ?? 'unknown',
    trace_id: traceId,
  };

  calls.set(toolCallId, result);
  if (request?.idempotency_key) idempotentCalls.set(request.idempotency_key, result);
  await persistCalls();
  return result;
}

async function loadStoredCalls() {
  try {
    const raw = await readFile(storagePath, 'utf8');
    const payload = JSON.parse(raw);
    const storedCalls = Array.isArray(payload?.calls) ? payload.calls : [];
    for (const call of storedCalls) {
      if (!call?.tool_call_id) continue;
      calls.set(call.tool_call_id, call);
      if (call.request_idempotency_key) {
        idempotentCalls.set(call.request_idempotency_key, call);
      }
    }
    console.log(`Loaded ${calls.size} persisted ToolCall records`);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn(`Could not load ToolCall store: ${error.message}`);
    }
  }
}

async function persistCalls() {
  const payload = {
    calls: Array.from(calls.values()),
    saved_at: new Date().toISOString(),
    schema_version: 1,
  };
  await mkdir(path.dirname(storagePath), { recursive: true });
  const tempPath = `${storagePath}.${process.pid}.tmp`;
  await writeFile(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  await rename(tempPath, storagePath);
}

function buildOutput(descriptor, request, traceId) {
  if (descriptor.name === 'scriptHub.task.create') {
    return {
      approval_id: `approval_${request.input.capability_id.replaceAll('.', '_')}`,
      task_id: `task_${Date.now()}`,
      task_status: 'planned',
      trace_id: traceId,
    };
  }

  if (descriptor.name === 'scriptHub.asset.register') {
    return {
      asset_id: `asset_${Date.now()}`,
      asset_type: 'fbx',
      status: 'created',
      storage_uri: request.input.storage_uri,
      trace_id: traceId,
    };
  }

  return {
    accepted: true,
    trace_id: traceId,
  };
}

function validateRequest(request, descriptor) {
  const issues = [];
  if (!request || typeof request !== 'object') {
    return [{ path: 'body', message: 'Request body must be an object' }];
  }
  if (!descriptor) {
    issues.push({ path: 'tool_name', message: `Unknown tool ${request.tool_name}` });
    return issues;
  }
  if (!request.caller_agent?.id) {
    issues.push({ path: 'caller_agent.id', message: 'caller_agent.id is required' });
  }
  if (!request.input || typeof request.input !== 'object') {
    issues.push({ path: 'input', message: 'input is required' });
    return issues;
  }
  for (const key of descriptor.input_schema.required ?? []) {
    if (!(key in request.input)) {
      issues.push({ path: `input.${key}`, message: `${key} is required` });
    }
  }
  for (const [key, schema] of Object.entries(descriptor.input_schema.properties ?? {})) {
    if (!(key in request.input)) continue;
    if (typeof request.input[key] !== schema.type) {
      issues.push({ path: `input.${key}`, message: `${key} must be ${schema.type}` });
    }
  }
  return issues;
}

function sendRoute(response, ok, traceId, data, error) {
  return sendJson(response, ok ? 200 : 400, {
    data: ok ? data : undefined,
    error: ok ? undefined : error,
    ok,
    timestamp: new Date().toISOString(),
    trace_id: traceId,
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
