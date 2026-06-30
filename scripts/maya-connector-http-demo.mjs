const toolBridgeUrl = stripTrailingSlash(
  process.env.SCRIPTHUB_TOOL_BRIDGE_URL ?? 'http://localhost:8787',
);
const mayaConnectorUrl = stripTrailingSlash(
  process.env.SCRIPTHUB_MAYA_CONNECTOR_URL ?? 'http://localhost:8795',
);
const exportUri = process.env.SCRIPTHUB_MAYA_EXPORT_URI ?? 'project://exports/maya_connector_demo.fbx';
const overwrite = (process.env.SCRIPTHUB_MAYA_EXPORT_OVERWRITE ?? 'true') !== 'false';
const traceId = process.env.SCRIPTHUB_MAYA_TRACE_ID ?? `trace_maya_connector_demo_${Date.now()}`;
const conversationId = process.env.SCRIPTHUB_MAYA_CONVERSATION_ID ?? 'conv_maya_connector_demo_001';

const selectionResponse = await getJson(`${mayaConnectorUrl}/selection`);
requireOk(selectionResponse, 'Read Maya selection');
const selection = selectionResponse.data;

const taskCall = await postJson(`${toolBridgeUrl}/tool-bridge/calls`, {
  caller_agent: {
    id: 'maya_connector_demo',
    name: 'Maya Connector HTTP Demo',
    version: '0.1.0',
  },
  conversation_id: conversationId,
  idempotency_key: `${conversationId}:task.create:${traceId}`,
  input: {
    capability_id: 'maya.export_fbx.v1',
    output_path: exportUri,
    overwrite,
    selected_objects: selection.objects.map((object) => object.name),
  },
  tool_name: 'scriptHub.task.create',
  trace_id: traceId,
});
requireOk(taskCall, 'Create ScriptHub task');
const task = taskCall.data?.output;

const exportResponse = await postJson(`${mayaConnectorUrl}/export/fbx`, {
  output_path: exportUri,
  overwrite,
  selection,
  trace_id: traceId,
});
requireOk(exportResponse, 'Export FBX through Maya Connector');
const exportResult = exportResponse.data;

const assetCall = await postJson(`${toolBridgeUrl}/tool-bridge/calls`, {
  caller_agent: {
    id: 'maya_connector_demo',
    name: 'Maya Connector HTTP Demo',
    version: '0.1.0',
  },
  conversation_id: conversationId,
  idempotency_key: `${conversationId}:asset.register:${traceId}`,
  input: {
    asset_type: 'fbx',
    bytes: exportResult.bytes,
    local_path: exportResult.local_path,
    source_uri: exportResult.source_uri,
    storage_uri: exportResult.storage_uri,
    task_id: task?.task_id,
    trace_id: task?.trace_id ?? traceId,
  },
  tool_name: 'scriptHub.asset.register',
  trace_id: traceId,
});
requireOk(assetCall, 'Register exported asset');

console.log(`SELECTION_COUNT ${selection.count}`);
console.log(`TASK_CALL_STATUS ${taskCall.data?.status}`);
console.log(`EXPORT_STORAGE_URI ${exportResult.storage_uri}`);
console.log(`ASSET_CALL_STATUS ${assetCall.data?.status}`);
console.log(`LOCAL_PATH ${exportResult.local_path}`);

async function getJson(url) {
  const response = await fetch(url);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  return response.json();
}

function requireOk(response, label) {
  if (response?.ok) return;
  const error = response?.error?.message ?? JSON.stringify(response);
  throw new Error(`${label} failed: ${error}`);
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}
