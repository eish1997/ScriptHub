import { describe, expect, it, vi } from 'vitest';
import { approval, connector, task } from './mockRuntime';
import {
  createPollingRuntimeEventStream,
  mockRuntimeEventStream,
  type RuntimeEventSnapshotInput,
} from './runtimeEvents';

const snapshotInput: RuntimeEventSnapshotInput = {
  approvalStatus: approval.status,
  connectorStatus: connector.status,
  taskId: task.id,
  taskStatus: task.status,
  traceId: task.trace_id,
};

describe('runtimeEvents', () => {
  it('returns mock snapshot events synchronously', () => {
    const events = mockRuntimeEventStream.getSnapshot(snapshotInput);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].event_type).toBe('task.created');
  });

  it('supports mock subscription with immediate snapshot', () => {
    const onEvents = vi.fn();

    const subscription = mockRuntimeEventStream.subscribe(snapshotInput, onEvents);

    expect(onEvents).toHaveBeenCalledTimes(1);
    expect(onEvents.mock.calls[0][0][0].event_type).toBe('task.created');
    subscription.unsubscribe();
  });

  it('polls runtime events from an array endpoint', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([
      {
        event_type: 'task.created',
        id: 'evt_runtime_001',
        level: 'info',
        message: 'Task created',
        occurred_at: '2026-05-20T01:00:00.000Z',
        source: 'runtime',
        target_id: task.id,
        target_type: 'task',
        trace_id: task.trace_id,
        type: 'event',
        version: '1.0.0',
      },
    ]), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));
    const stream = createPollingRuntimeEventStream({
      baseUrl: 'http://localhost:9100/',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const events = await stream.pollSnapshot(snapshotInput);

    expect(fetchImpl).toHaveBeenCalledWith(
      `http://localhost:9100/events?task_id=${task.id}&trace_id=${task.trace_id}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('evt_runtime_001');
  });

  it('polls runtime events from a wrapped endpoint', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      events: [],
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }));
    const stream = createPollingRuntimeEventStream({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const events = await stream.pollSnapshot(snapshotInput);

    expect(events).toEqual([]);
  });

  it('reports polling failures', async () => {
    const fetchImpl = vi.fn(async () => new Response('offline', {
      status: 503,
      statusText: 'Service Unavailable',
    }));
    const stream = createPollingRuntimeEventStream({
      baseUrl: 'http://localhost:9100',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(stream.pollSnapshot(snapshotInput)).rejects.toThrow(
      'Runtime events request failed: 503 Service Unavailable',
    );
  });
});
