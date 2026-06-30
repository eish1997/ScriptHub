import { describe, expect, it } from 'vitest';
import { approval, asset, connector, createRuntimeError, task } from './mockRuntime';
import { initialHermesConversation } from './hermesConversation';
import {
  buildPersonalRuntimeView,
  buildSubmitTaskInputFromToolParameters,
  getDefaultToolParameterValues,
} from './personalRuntime';
import { mockToolBridgeProvider } from './toolBridgeMock';

describe('buildPersonalRuntimeView', () => {
  it('maps pending approval into personal safety confirmation', () => {
    const view = buildPersonalRuntimeView({
      approval,
      asset,
      connector,
      hermesConversation: initialHermesConversation,
      task,
    });

    expect(view.history[0].status).toBe('waiting_confirmation');
    expect(view.hermesTool.needsConfirmation).toBe(true);
    expect(view.safetyPreview.writeScope).toBe('project://exports/selected_asset.fbx');
    expect(view.safetyPreview.overwriteLabel).toBe('不会覆盖同名文件');
    expect(view.tools.map((tool) => tool.source)).toEqual([
      'dcc_plugin',
      'script',
      'hermes_captured',
      'hermes_captured',
    ]);
    expect(view.tools.map((tool) => tool.runtime)).toEqual(['maya', 'blender', 'maya', 'unreal']);
    expect(view.tools.map((tool) => tool.category)).toEqual([
      'dcc_operation',
      'asset_processing',
      'dcc_operation',
      'dcc_operation',
    ]);
    expect(view.tools.map((tool) => tool.maturity)).toEqual(['verified', 'verified', 'stable', 'usable']);
    expect(view.tools[0].manifest?.entrypoint).toBe('scripts/maya/batch_export_fbx.py');
    expect(view.toolDetail.title).toBe('Maya 当前选择导出 FBX 工具详情');
    expect(view.toolDetail.parameterTemplate).toEqual(
      expect.arrayContaining([
        { name: '输入对象', value: 'Maya 当前选择' },
        { name: '输出路径', value: 'project://exports/selected_asset.fbx' },
      ]),
    );
    expect(view.toolDetail.validation.status).toBe('waiting_confirmation');
  });

  it('turns runtime errors into repair actions', () => {
    const view = buildPersonalRuntimeView({
      approval,
      asset,
      connector,
      hermesConversation: initialHermesConversation,
      runtimeError: createRuntimeError('output_conflict', task.trace_id),
      task: { ...task, status: 'failed' },
    });

    expect(view.history[0].status).toBe('failed');
    expect(view.toolDetail.validation.status).toBe('failed');
    expect(view.toolDetail.validation.summary).toContain('目标 FBX 文件已经存在');
    expect(view.repairActions.map((action) => action.id)).toContain('revise_path');
    expect(view.repairActions.find((action) => action.id === 'revise_path')?.recommended).toBe(true);
    expect(view.repairSuggestion?.recommendedAction).toBe('confirm_overwrite_or_rename');
  });

  it('adds connector repair suggestions to failed history details', () => {
    const view = buildPersonalRuntimeView({
      approval,
      asset,
      connector,
      hermesConversation: initialHermesConversation,
      runtimeError: createRuntimeError('empty_selection', task.trace_id),
      task: { ...task, status: 'failed' },
    });
    const detail = view.historyDetails[view.history[0].id];

    expect(view.repairSuggestion?.recommendedAction).toBe('select_objects');
    expect(detail.repairSuggestion?.recommendedAction).toBe('select_objects');
    expect(detail.repairSuggestion?.requiresUserInput).toBe(true);
  });

  it('builds an operation history list from repeated task.create calls', () => {
    const firstState = mockToolBridgeProvider.appendRuntimeResult(initialHermesConversation, {
      approval,
      connector,
      task,
      taskCreateInput: {
        capability_id: 'maya.export_fbx.v1',
        output_path: 'project://exports/first_run.fbx',
        overwrite: false,
      },
    });
    const secondState = mockToolBridgeProvider.appendRuntimeResult(firstState, {
      approval,
      connector,
      task: {
        ...task,
        metadata: {
          capability_id: 'maya.export_fbx.v1',
          output_path: 'project://exports/second_run.fbx',
          overwrite: true,
        },
      },
      taskCreateInput: {
        capability_id: 'maya.export_fbx.v1',
        output_path: 'project://exports/second_run.fbx',
        overwrite: true,
      },
    });

    const view = buildPersonalRuntimeView({
      approval,
      asset,
      connector,
      hermesConversation: secondState,
      task: {
        ...task,
        metadata: {
          capability_id: 'maya.export_fbx.v1',
          output_path: 'project://exports/second_run.fbx',
          overwrite: true,
        },
      },
    });

    expect(view.history).toHaveLength(3);
    expect(view.history[0].summary).toContain('second_run.fbx');
    expect(view.history[1].summary).toContain('first_run.fbx');
  });

  it('builds operation history details for repeatable run inspection', () => {
    const nextState = mockToolBridgeProvider.appendRuntimeResult(initialHermesConversation, {
      approval,
      connector,
      task,
      taskCreateInput: {
        capability_id: 'maya.export_fbx.v1',
        output_path: 'project://exports/history_detail.fbx',
        overwrite: true,
      },
    });

    const view = buildPersonalRuntimeView({
      approval,
      asset,
      connector,
      hermesConversation: nextState,
      task,
    });
    const detail = view.historyDetails[view.history[0].id];

    expect(detail.readScope).toBe('Maya 当前选择对象');
    expect(detail.writeScope).toBe('project://exports/history_detail.fbx');
    expect(detail.overwriteLabel).toBe('允许覆盖同名文件');
    expect(detail.parameters).toEqual(
      expect.arrayContaining([
        { name: '能力', value: 'maya.export_fbx.v1' },
        { name: '输出路径', value: 'project://exports/history_detail.fbx' },
      ]),
    );
    expect(detail.artifact.id).toBe(asset.id);
    expect(detail.repairs[0].result).toBe('not_needed');
    expect(detail.replayInput).toEqual({
      capability_id: 'maya.export_fbx.v1',
      output_path: 'project://exports/history_detail.fbx',
      overwrite: true,
    });
    expect(detail.replayChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'output_path_changed',
          severity: 'warning',
        }),
        expect.objectContaining({
          id: 'dcc_selection_runtime_check',
          severity: 'info',
        }),
      ]),
    );
    expect(detail.timeline.length).toBeGreaterThan(1);
  });

  it('builds run input from plugin script tool parameters', () => {
    const view = buildPersonalRuntimeView({
      approval,
      asset,
      connector,
      hermesConversation: initialHermesConversation,
      task,
    });
    const pluginTool = view.tools.find((tool) => tool.source === 'dcc_plugin');

    expect(pluginTool).toBeDefined();
    expect(buildSubmitTaskInputFromToolParameters(pluginTool!, getDefaultToolParameterValues(pluginTool!))).toEqual({
      capability_id: 'maya.export_fbx.v1',
      output_path: 'project://exports/batch/current_scene_selected_asset.fbx',
      overwrite: false,
    });
  });

  it('builds runtime-specific run input for Blender and Unreal tools', () => {
    const view = buildPersonalRuntimeView({
      approval,
      asset,
      connector,
      hermesConversation: initialHermesConversation,
      task,
    });
    const blenderTool = view.tools.find((tool) => tool.runtime === 'blender');
    const unrealTool = view.tools.find((tool) => tool.runtime === 'unreal');

    expect(blenderTool).toBeDefined();
    expect(unrealTool).toBeDefined();
    expect(buildSubmitTaskInputFromToolParameters(blenderTool!, getDefaultToolParameterValues(blenderTool!))).toEqual({
      capability_id: 'blender.export_fbx.v1',
      output_path: 'project://exports/blender/current_scene_selected_asset.fbx',
      overwrite: false,
    });
    expect(buildSubmitTaskInputFromToolParameters(unrealTool!, getDefaultToolParameterValues(unrealTool!))).toEqual({
      capability_id: 'unreal.export_fbx.v1',
      output_path: 'project://exports/unreal/selected_assets.fbx',
      overwrite: false,
    });
  });

  it('builds run input from Hermes tool parameters', () => {
    const view = buildPersonalRuntimeView({
      approval,
      asset,
      connector,
      hermesConversation: initialHermesConversation,
      task,
    });
    const hermesTool = view.tools.find((tool) => tool.source === 'hermes_captured');

    expect(hermesTool).toBeDefined();
    expect(buildSubmitTaskInputFromToolParameters(hermesTool!, {
      ...getDefaultToolParameterValues(hermesTool!),
      output_path: 'project://exports/hero.fbx',
      overwrite: true,
    })).toEqual({
      capability_id: 'maya.export_fbx.v1',
      output_path: 'project://exports/hero.fbx',
      overwrite: true,
    });
  });
});
