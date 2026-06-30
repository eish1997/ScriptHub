import { describe, expect, it, vi } from 'vitest';
import { approval } from './mockRuntime';
import { createHermesAdapter } from './hermesAdapter';

describe('createHermesAdapter', () => {
  it('normalizes Hermes connector health response into Connector shape', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      capabilities: ['maya.current_selection', 'asset.export.fbx'],
      checked_at: '2026-05-20T01:00:00.000Z',
      health: {
        latency_ms: 42,
        state: 'healthy',
      },
      id: 'connector_maya_hermes',
      name: 'Hermes Maya Connector',
      status: 'connected',
      target: 'maya',
      trace_id: 'trace_hermes_health',
      version: '1.2.0',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));

    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100/',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const connector = await adapter.getConnectorHealth();

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:9100/connectors/maya/health', {
      headers: {
        Accept: 'application/json',
      },
    });
    expect(connector.id).toBe('connector_maya_hermes');
    expect(connector.status).toBe('connected');
    expect(connector.health.state).toBe('healthy');
    expect(connector.health.latency_ms).toBe(42);
    expect(connector.capabilities).toContain('asset.export.fbx');
  });

  it('throws when Hermes health request fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('offline', {
      status: 503,
      statusText: 'Service Unavailable',
    }));

    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(adapter.getConnectorHealth()).rejects.toThrow('Hermes request failed: 503 Service Unavailable');
  });

  it('normalizes Hermes capabilities array response', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([
      {
        connector_capability: 'asset.export.fbx',
        connector_target: 'maya',
        description: 'Export selected meshes as FBX.',
        id: 'maya.export_fbx.v1',
        inputs: {
          output_path: 'string',
        },
        name: 'Export FBX',
        outputs: {
          fbx_file: 'asset.fbx',
        },
        permissions: ['filesystem.write'],
        requires_confirmation: true,
        risk_level: 'high',
        status: 'available',
        tags: ['maya', 'fbx'],
        type: 'skill',
        version: '2.0.0',
      },
    ]), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));

    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const capabilities = await adapter.listCapabilities();

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:9100/capabilities', {
      headers: {
        Accept: 'application/json',
      },
    });
    expect(capabilities).toHaveLength(1);
    expect(capabilities[0].id).toBe('maya.export_fbx.v1');
    expect(capabilities[0].type).toBe('skill');
    expect(capabilities[0].risk_level).toBe('high');
    expect(capabilities[0].requires_confirmation).toBe(true);
  });

  it('normalizes wrapped capabilities response and fills missing fields', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      capabilities: [
        {
          id: 'custom.hermes.health',
          name: 'Hermes Health',
        },
      ],
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));

    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const capabilities = await adapter.listCapabilities();

    expect(capabilities).toHaveLength(1);
    expect(capabilities[0]).toMatchObject({
      connector_capability: 'custom.hermes.health',
      connector_target: 'maya',
      id: 'custom.hermes.health',
      lifecycle: 'available',
      name: 'Hermes Health',
      risk_level: 'low',
      status: 'available',
      type: 'tool',
      version: '1.0.0',
    });
  });

  it('throws when Hermes capabilities request fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad gateway', {
      status: 502,
      statusText: 'Bad Gateway',
    }));

    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(adapter.listCapabilities()).rejects.toThrow('Hermes request failed: 502 Bad Gateway');
  });

  it('submits task dispatch request and normalizes full response', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      approval: {
        id: 'approval_hermes_001',
        status: 'pending',
        target_id: 'task_hermes_001',
        trace_id: 'trace_hermes_001',
      },
      task: {
        approval_status: 'pending',
        id: 'task_hermes_001',
        metadata: {
          capability_id: 'maya.export_fbx.v1',
          output_path: 'project://exports/hermes_asset.fbx',
          overwrite: true,
        },
        status: 'planned',
        trace_id: 'trace_hermes_001',
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));
    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await adapter.submitTask({
      capability_id: 'maya.export_fbx.v1',
      output_path: 'project://exports/hermes_asset.fbx',
      overwrite: true,
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:9100/tasks', {
      body: JSON.stringify({
        capability_id: 'maya.export_fbx.v1',
        metadata: {
          output_path: 'project://exports/hermes_asset.fbx',
          overwrite: true,
        },
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    expect(result.task.id).toBe('task_hermes_001');
    expect(result.task.metadata.output_path).toBe('project://exports/hermes_asset.fbx');
    expect(result.approval.id).toBe('approval_hermes_001');
    expect(result.approval.target_id).toBe('task_hermes_001');
  });

  it('fills missing task dispatch response fields', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));
    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await adapter.submitTask({
      capability_id: 'maya.export_fbx.v1',
      output_path: 'project://exports/fallback_asset.fbx',
      overwrite: false,
    });

    expect(result.task.id).toBe('task_maya_export_fbx_v1');
    expect(result.task.status).toBe('planned');
    expect(result.task.approval_status).toBe('pending');
    expect(result.task.metadata).toEqual({
      capability_id: 'maya.export_fbx.v1',
      output_path: 'project://exports/fallback_asset.fbx',
      overwrite: false,
    });
    expect(result.approval.id).toBe('approval_task_maya_export_fbx_v1');
    expect(result.approval.status).toBe('pending');
    expect(result.approval.target_id).toBe(result.task.id);
  });

  it('throws when Hermes task dispatch request fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('invalid plan', {
      status: 400,
      statusText: 'Bad Request',
    }));
    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(adapter.submitTask({
      capability_id: 'maya.export_fbx.v1',
      output_path: 'project://exports/bad_asset.fbx',
      overwrite: false,
    })).rejects.toThrow('Hermes request failed: 400 Bad Request');
  });

  it('posts approval decision and normalizes direct response', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      decision_note: 'Approved by Hermes policy.',
      id: approval.id,
      reviewed_at: '2026-05-20T02:00:00.000Z',
      reviewed_by: 'hermes.user',
      status: 'approved',
      updated_at: '2026-05-20T02:00:00.000Z',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));
    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await adapter.decideApproval(approval, 'approved');

    expect(fetchImpl).toHaveBeenCalledWith(`http://localhost:9100/approvals/${approval.id}/decision`, {
      body: JSON.stringify({
        decision: 'approved',
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    expect(result.status).toBe('approved');
    expect(result.reviewed_by).toBe('hermes.user');
    expect(result.decision_note).toBe('Approved by Hermes policy.');
  });

  it('normalizes wrapped approval decision response and fills missing fields', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      approval: {
        status: 'rejected',
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));
    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await adapter.decideApproval(approval, 'rejected');

    expect(result.id).toBe(approval.id);
    expect(result.status).toBe('rejected');
    expect(result.reviewed_by).toBe('hermes.approver');
    expect(result.reviewed_at).toBeTruthy();
    expect(result.decision_note).toContain('暂不允许');
  });

  it('throws when Hermes approval decision request fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('forbidden', {
      status: 403,
      statusText: 'Forbidden',
    }));
    const adapter = createHermesAdapter({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(adapter.decideApproval(approval, 'approved')).rejects.toThrow(
      'Hermes request failed: 403 Forbidden',
    );
  });
});
