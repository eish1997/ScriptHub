import { access, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const mayaPythonCommand = process.env.SCRIPTHUB_MAYA_PYTHON_COMMAND?.trim()
  ?? await findMayaPythonCommand();
const commandScript = path.resolve(
  process.env.SCRIPTHUB_MAYA_COMMAND_SCRIPT ?? 'scripts/maya_connector_command.py',
);
const outputPath = path.resolve(
  process.env.SCRIPTHUB_MAYA_SMOKE_OUTPUT
    ?? path.join(os.tmpdir(), 'scripthub-maya-real-smoke', 'self_test_export.fbx'),
);

if (!mayaPythonCommand) {
  throw new Error('No mayapy command found. Set SCRIPTHUB_MAYA_PYTHON_COMMAND to mayapy.exe.');
}

await mkdir(path.dirname(outputPath), { recursive: true });
const response = await runMayaCommand('self_test_export', {
  local_path: outputPath,
  output_path: outputPath,
  trace_id: `trace_maya_real_smoke_${Date.now()}`,
});

if (!response.ok) {
  throw new Error(`Maya smoke test failed: ${response.error?.code} ${response.error?.message}`);
}

console.log(`MAYA_PYTHON_COMMAND ${mayaPythonCommand}`);
console.log(`SMOKE_EXPORT_BYTES ${response.data.bytes}`);
console.log(`SMOKE_EXPORT_PATH ${response.data.local_path}`);

async function findMayaPythonCommand() {
  const candidates = [
    'C:\\Program Files\\Autodesk\\Maya2026\\bin\\mayapy.exe',
    'C:\\Program Files\\Autodesk\\Maya2025\\bin\\mayapy.exe',
    'C:\\Program Files\\Autodesk\\Maya2024\\bin\\mayapy.exe',
    'C:\\Program Files\\Autodesk\\Maya2023\\bin\\mayapy.exe',
    'C:\\Program Files\\Autodesk\\Maya2022\\bin\\mayapy.exe',
    'C:\\Program Files\\Autodesk\\Maya2020\\bin\\mayapy.exe',
    'C:\\Program Files\\Autodesk\\Maya2019\\bin\\mayapy.exe',
    'C:\\Program Files\\Autodesk\\Maya2018\\bin\\mayapy.exe',
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common Maya install path.
    }
  }

  return undefined;
}

function runMayaCommand(operation, payload) {
  return new Promise((resolve) => {
    const child = spawn(mayaPythonCommand, [commandScript, operation], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      resolve({
        ok: false,
        error: {
          code: 'maya_command_spawn_failed',
          message: error.message,
        },
      });
    });
    child.on('close', () => {
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({
          ok: false,
          error: {
            code: 'maya_command_invalid_response',
            message: stderr || stdout || 'Maya command did not return JSON',
          },
        });
      }
    });

    child.stdin.end(JSON.stringify(payload));
  });
}
