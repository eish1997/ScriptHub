import { describe, expect, it, vi } from 'vitest';
import { checkExternalMayaConnector, exportExternalMayaFbx } from './mayaConnectorHttpActivity';

describe('checkExternalMayaConnector', () => {
  it('reports connector mode and selection count when health and selection succeed', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            mode: 'fixture',
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            count: 2,
          },
        }),
      });
    vi.stubGlobal('fetch', fetchImpl);

    const status = await checkExternalMayaConnector('http://localhost:8795');

    expect(status.state).toBe('connected');
    expect(status.mode).toBe('fixture');
    expect(status.selectionCount).toBe(2);
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:8795/health');
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:8795/selection');
  });

  it('preserves repair suggestions from failed connector selection responses', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            mode: 'maya_python_command',
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          error: {
            code: 'maya_python_unavailable',
            message: 'maya.cmds is unavailable',
            repair_suggestion: {
              can_retry: false,
              hermes_actions: ['Switch to mayapy.exe'],
              recommended_action: 'switch_to_mayapy',
              requires_user_input: true,
              summary: 'The command is not running in a Maya Python environment.',
              user_message: '当前命令没有 Maya Python 环境。',
            },
          },
        }),
      }));

    const status = await checkExternalMayaConnector('http://localhost:8795');

    expect(status.state).toBe('failed');
    expect(status.mode).toBe('maya_python_command');
    expect(status.lastError).toBe('maya.cmds is unavailable');
    expect(status.lastRepairSuggestion?.recommendedAction).toBe('switch_to_mayapy');
    expect(status.lastRepairSuggestion?.requiresUserInput).toBe(true);
  });

  it('normalizes successful FBX export results', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        data: {
          bytes: 120,
          exported_at: '2026-05-24T08:00:00.000Z',
          local_path: 'C:/tmp/hero.fbx',
          selected_objects: ['hero_body_GEO'],
          selection_count: 1,
          source_uri: 'maya://selection/current',
          storage_uri: 'project://exports/hero.fbx',
          trace_id: 'trace_export_001',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchImpl);

    const result = await exportExternalMayaFbx({
      output_path: 'project://exports/hero.fbx',
      overwrite: true,
      trace_id: 'trace_export_001',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.storageUri).toBe('project://exports/hero.fbx');
      expect(result.data.bytes).toBe(120);
      expect(result.data.selectedObjects).toEqual(['hero_body_GEO']);
    }
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:8795/export/fbx', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('preserves repair suggestions from failed FBX export results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      json: async () => ({
        ok: false,
        error: {
          code: 'output_exists',
          message: 'Output already exists',
          repair_suggestion: {
            can_retry: false,
            hermes_actions: ['Ask whether overwriting is allowed.'],
            recommended_action: 'confirm_overwrite_or_rename',
            requires_user_input: true,
            summary: 'The target FBX already exists and overwrite is disabled.',
            user_message: '目标 FBX 已存在。',
          },
        },
      }),
    }));

    const result = await exportExternalMayaFbx({
      output_path: 'project://exports/hero.fbx',
      overwrite: false,
      trace_id: 'trace_export_002',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Output already exists');
      expect(result.error.repairSuggestion?.recommendedAction).toBe('confirm_overwrite_or_rename');
    }
  });
});
