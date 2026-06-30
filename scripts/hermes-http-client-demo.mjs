const baseUrl = process.env.SCRIPTHUB_TOOL_BRIDGE_URL ?? 'http://localhost:8787';

const taskResponse = await post('/tool-bridge/calls', {
  caller_agent: {
    id: 'hermes_demo_client',
    name: 'Hermes Demo Client',
    scopes: ['tool_bridge:call', 'task:create'],
    transport: 'http',
  },
  conversation_id: 'conv_real_http_demo_001',
  idempotency_key: 'conv_real_http_demo_001:task_create:maya_fbx',
  input: {
    capability_id: 'maya.export_fbx.v1',
    output_path: 'project://exports/real_http_demo.fbx',
    overwrite: false,
  },
  requested_at: new Date().toISOString(),
  tool_name: 'scriptHub.task.create',
  tool_version: '1.0.0',
  trace_id: 'trace_real_http_demo_001',
});

console.log('task.create');
console.log(JSON.stringify(taskResponse, null, 2));

const task = taskResponse.data?.output;
if (task?.task_id) {
  const assetResponse = await post('/tool-bridge/calls', {
    caller_agent: {
      id: 'hermes_demo_client',
      name: 'Hermes Demo Client',
      scopes: ['tool_bridge:call', 'asset:register'],
      transport: 'http',
    },
    conversation_id: 'conv_real_http_demo_001',
    input: {
      approval_id: task.approval_id,
      source_uri: 'maya://selection/current',
      storage_uri: 'project://exports/real_http_demo.fbx',
      task_id: task.task_id,
      trace_id: task.trace_id,
    },
    requested_at: new Date().toISOString(),
    tool_name: 'scriptHub.asset.register',
    tool_version: '1.0.0',
    trace_id: task.trace_id,
  });

  console.log('asset.register');
  console.log(JSON.stringify(assetResponse, null, 2));
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  return response.json();
}
