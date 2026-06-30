import http from 'node:http';
import { access, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { enrichMayaConnectorError } from './maya-connector-repair-suggestions.mjs';

const port = Number(process.env.SCRIPTHUB_MAYA_CONNECTOR_PORT ?? 8795);
const connectorRoot = path.resolve(
  process.env.SCRIPTHUB_MAYA_CONNECTOR_ROOT ?? '.scripthub/maya-connector',
);
const mayaPythonCommand = process.env.SCRIPTHUB_MAYA_PYTHON_COMMAND?.trim();
const mayaCommandScript = path.resolve(
  process.env.SCRIPTHUB_MAYA_COMMAND_SCRIPT ?? 'scripts/maya_connector_command.py',
);
const mayaCommandTimeoutMs = Number(process.env.SCRIPTHUB_MAYA_COMMAND_TIMEOUT_MS ?? 30000);
const selectionNames = (process.env.SCRIPTHUB_MAYA_SELECTION ?? 'hero_body_GEO,hero_prop_GEO')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const connectorMode = mayaPythonCommand ? 'maya_python_command' : 'fixture';

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    return sendJson(response, 200, {
      ok: true,
      data: {
        capabilities: ['maya.current_selection', 'asset.export.fbx', 'dcc.session.health'],
        connector_id: 'connector_maya_local_http',
        mode: connectorMode,
        python_command_configured: Boolean(mayaPythonCommand),
        root: connectorRoot,
        script: mayaPythonCommand ? mayaCommandScript : undefined,
        service: 'scriptHub.mayaConnector.http',
        state: 'healthy',
        status: 'connected',
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (request.method === 'GET' && url.pathname === '/selection') {
    const result = await getSelection();
    return sendJson(response, result.ok ? 200 : 502, {
      data: result.ok ? result.data : undefined,
      error: result.ok ? undefined : enrichMayaConnectorError(result.error),
      ok: result.ok,
      timestamp: new Date().toISOString(),
    });
  }

  if (request.method === 'POST' && url.pathname === '/export/fbx') {
    const body = await readJson(request);
    const result = await exportFbx(body);
    return sendJson(response, result.ok ? 200 : result.status, {
      data: result.ok ? result.data : undefined,
      error: result.ok ? undefined : enrichMayaConnectorError(result.error),
      ok: result.ok,
      timestamp: new Date().toISOString(),
      trace_id: body?.trace_id,
    });
  }

  return sendJson(response, 404, {
    ok: false,
      error: {
        code: 'not_found',
        message: `${request.method} ${url.pathname} is not a Maya Connector route`,
        repair_suggestion: enrichMayaConnectorError({ code: 'not_found' })?.repair_suggestion,
      },
  });
});

server.listen(port, () => {
  console.log(`ScriptHub Maya Connector HTTP listening on http://localhost:${port}`);
  console.log(`Maya Connector root: ${connectorRoot}`);
  console.log(`Maya Connector mode: ${connectorMode}`);
});

async function getSelection() {
  if (mayaPythonCommand) {
    return runMayaCommand('selection', {});
  }

  return {
    ok: true,
    data: buildFixtureSelection(),
  };
}

function buildFixtureSelection() {
  return {
    checked_at: new Date().toISOString(),
    count: selectionNames.length,
    objects: selectionNames.map((name) => ({
      name,
      type: 'mesh',
    })),
    source_uri: 'maya://selection/current',
  };
}

async function exportFbx(request) {
  const selection = await getExportSelection(request);
  const outputPath = typeof request?.output_path === 'string' ? request.output_path.trim() : '';
  const overwrite = Boolean(request?.overwrite);

  if (selection.objects.length === 0) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'empty_selection',
        message: 'Maya selection is empty',
        recoverable: true,
        repair_suggestion: enrichMayaConnectorError({ code: 'empty_selection' })?.repair_suggestion,
      },
    };
  }

  if (!outputPath.endsWith('.fbx')) {
    return {
      ok: false,
      status: 400,
      error: {
        code: 'invalid_output_path',
        message: 'output_path must end with .fbx',
        recoverable: true,
        repair_suggestion: enrichMayaConnectorError({ code: 'invalid_output_path' })?.repair_suggestion,
      },
    };
  }

  const localPath = resolveOutputPath(outputPath);
  if (!overwrite && await exists(localPath)) {
    return {
      ok: false,
      status: 409,
      error: {
        code: 'output_exists',
        message: `Output already exists: ${outputPath}`,
        recoverable: true,
        repair_suggestion: enrichMayaConnectorError({ code: 'output_exists' })?.repair_suggestion,
      },
    };
  }

  if (mayaPythonCommand) {
    const commandResult = await runMayaCommand('export_fbx', {
      ...request,
      local_path: localPath,
      output_path: outputPath,
      selection,
    });

    if (!commandResult.ok) {
      return {
        ok: false,
        status: 502,
        error: enrichMayaConnectorError(commandResult.error),
      };
    }

    return {
      ok: true,
      data: normalizeExportResult(commandResult.data, {
        localPath,
        outputPath,
        request,
        selection,
      }),
    };
  }

  await mkdir(path.dirname(localPath), { recursive: true });
  const content = buildFbxPlaceholder({ outputPath, request, selection });
  await writeFile(localPath, content, 'utf8');
  const fileStat = await stat(localPath);

  return {
    ok: true,
    data: {
      bytes: fileStat.size,
      exported_at: new Date().toISOString(),
      local_path: localPath,
      selected_objects: selection.objects.map((object) => object.name),
      selection_count: selection.objects.length,
      source_uri: selection.source_uri,
      storage_uri: outputPath,
      trace_id: request?.trace_id,
    },
  };
}

async function getExportSelection(request) {
  if (Array.isArray(request?.selection?.objects)) return request.selection;
  if (!mayaPythonCommand) return buildFixtureSelection();

  const result = await getSelection();
  if (result.ok) return result.data;
  return {
    checked_at: new Date().toISOString(),
    count: 0,
    error: result.error,
    objects: [],
    source_uri: 'maya://selection/current',
  };
}

function normalizeExportResult(result, fallback) {
  return {
    bytes: result?.bytes ?? 0,
    exported_at: result?.exported_at ?? new Date().toISOString(),
    local_path: result?.local_path ?? fallback.localPath,
    selected_objects: result?.selected_objects ?? fallback.selection.objects.map((object) => object.name),
    selection_count: result?.selection_count ?? fallback.selection.objects.length,
    source_uri: result?.source_uri ?? fallback.selection.source_uri,
    storage_uri: result?.storage_uri ?? fallback.outputPath,
    trace_id: result?.trace_id ?? fallback.request?.trace_id,
  };
}

function runMayaCommand(operation, payload) {
  return new Promise((resolve) => {
    const child = spawn(mayaPythonCommand, [mayaCommandScript, operation], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      child.kill();
      resolve({
        ok: false,
        error: {
          code: 'maya_command_timeout',
          message: `Maya command timed out after ${mayaCommandTimeoutMs}ms`,
          recoverable: true,
          repair_suggestion: enrichMayaConnectorError({ code: 'maya_command_timeout' })?.repair_suggestion,
        },
      });
    }, mayaCommandTimeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        ok: false,
        error: {
          code: 'maya_command_spawn_failed',
          message: error.message,
          recoverable: true,
          repair_suggestion: enrichMayaConnectorError({ code: 'maya_command_spawn_failed' })?.repair_suggestion,
        },
      });
    });
    child.on('close', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(parseMayaCommandResponse(stdout, stderr));
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

function parseMayaCommandResponse(stdout, stderr) {
  try {
    const response = JSON.parse(stdout);
    if (response?.ok) return response;
    return {
      ok: false,
      error: response?.error ?? {
        code: 'maya_command_failed',
        message: stderr || 'Maya command failed without a structured error',
        recoverable: true,
        repair_suggestion: enrichMayaConnectorError({ code: 'maya_command_failed' })?.repair_suggestion,
      },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: 'maya_command_invalid_response',
        message: stderr || stdout || 'Maya command did not return JSON',
        recoverable: true,
        repair_suggestion: enrichMayaConnectorError({ code: 'maya_command_invalid_response' })?.repair_suggestion,
      },
    };
  }
}

function resolveOutputPath(outputPath) {
  if (outputPath.startsWith('project://')) {
    const relativePath = outputPath.slice('project://'.length).replace(/^\/+/, '');
    return path.resolve(connectorRoot, relativePath);
  }

  if (outputPath.startsWith('file://')) {
    return path.resolve(new URL(outputPath));
  }

  return path.resolve(connectorRoot, outputPath.replace(/^\/+/, ''));
}

function buildFbxPlaceholder({ outputPath, request, selection }) {
  return [
    '; ScriptHub Maya Connector FBX placeholder',
    `; output_path=${outputPath}`,
    `; trace_id=${request?.trace_id ?? ''}`,
    `; selected=${selection.objects.map((object) => object.name).join(',')}`,
    '; Replace this server with the Maya Python connector to write a real FBX binary.',
    '',
  ].join('\n');
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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
