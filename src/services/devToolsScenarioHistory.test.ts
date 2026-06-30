import { describe, expect, it } from 'vitest';
import {
  createDevToolsScenarioHistoryEntry,
  devToolsScenarioHistoryLimit,
  prependDevToolsScenarioHistory,
} from './devToolsScenarioHistory';

describe('devToolsScenarioHistory', () => {
  it('creates replayable scenario history entries', () => {
    const entry = createDevToolsScenarioHistoryEntry(
      {
        detail: '任务已写入 Tool Bridge 时间线',
        kind: 'tool_bridge_success',
        status: 'succeeded',
        title: '模拟 Tool Bridge 调用',
      },
      new Date('2026-05-23T10:30:12.000Z'),
    );

    expect(entry).toMatchObject({
      created_at: '2026-05-23T10:30:12.000Z',
      detail: '任务已写入 Tool Bridge 时间线',
      kind: 'tool_bridge_success',
      status: 'succeeded',
      title: '模拟 Tool Bridge 调用',
    });
    expect(entry.id).toContain('devtools_scenario_');
  });

  it('keeps only the newest scenario history entries', () => {
    const history = Array.from({ length: devToolsScenarioHistoryLimit }, (_, index) =>
      createDevToolsScenarioHistoryEntry(
        {
          detail: `detail ${index}`,
          kind: 'failure_scenario',
          payload: { scenario: 'task_create_failed' },
          status: 'failed',
          title: `scenario ${index}`,
        },
        new Date(2026, 4, 23, 10, 0, index),
      ),
    );
    const newest = createDevToolsScenarioHistoryEntry(
      {
        detail: 'newest',
        kind: 'approval_decision',
        payload: { decision: 'approved' },
        status: 'succeeded',
        title: '模拟批准',
      },
      new Date(2026, 4, 23, 10, 1, 0),
    );

    const nextHistory = prependDevToolsScenarioHistory(history, newest);

    expect(nextHistory).toHaveLength(devToolsScenarioHistoryLimit);
    expect(nextHistory[0]).toBe(newest);
    expect(nextHistory).not.toContain(history.at(-1));
  });
});
