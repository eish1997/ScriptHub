import { describe, expect, it } from 'vitest';
import { asset, events, task } from './mockRuntime';
import { buildAssetProvenance, buildAssetProvenanceSummary } from './provenance';

describe('buildAssetProvenance', () => {
  it('builds an asset chain from existing runtime inputs', () => {
    const result = buildAssetProvenance({
      asset,
      events: events('approved', 'succeeded'),
      task: { ...task, approval_status: 'approved', status: 'succeeded' },
    });

    expect(result.chain.map((item) => item.label)).toEqual([
      'External Hermes',
      'ToolCall',
      'Task',
      'Approval',
      'Asset',
      'Trace',
    ]);
    expect(result.chain.find((item) => item.id === 'tool_call')).toMatchObject({
      value: 'scriptHub.asset.register',
      detail: `Creates Task ${task.id} and registers Asset ${asset.id}`,
    });
    expect(result.chain.find((item) => item.id === 'trace')?.value).toBe(asset.trace_id);
  });

  it('keeps approval and trace events visible in the provenance timeline', () => {
    const result = buildAssetProvenance({
      asset,
      events: events('approved', 'succeeded'),
      task,
    });

    expect(result.events.map((event) => event.event_type)).toContain('approval.requested');
    expect(result.events.map((event) => event.event_type)).toContain('trace.checkpoint');
    expect(result.events.every((event) => event.trace_id === asset.trace_id)).toBe(true);
  });

  it('builds a compact registry summary from the same provenance inputs', () => {
    const summary = buildAssetProvenanceSummary({
      asset,
      events: events('approved', 'succeeded'),
      task,
    });

    expect(summary).toEqual([
      {
        id: 'external_hermes',
        label: 'External Hermes',
        value: 'conv_hermes_fbx_export_001',
      },
      {
        id: 'tool_call',
        label: 'ToolCall',
        value: 'scriptHub.asset.register',
      },
      {
        id: 'trace',
        label: 'trace_id',
        value: asset.trace_id,
      },
    ]);
  });

  it('falls back to dispatch provenance when the asset registration event is not present yet', () => {
    const summary = buildAssetProvenanceSummary({
      asset,
      events: events('approved', 'running'),
      task,
    });

    expect(summary.find((item) => item.id === 'tool_call')?.value).toBe('scriptHub.asset.export.fbx');
    expect(summary.find((item) => item.id === 'trace')?.value).toBe(asset.trace_id);
  });
});
