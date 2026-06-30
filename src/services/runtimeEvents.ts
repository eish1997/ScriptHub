import {
  events,
  type Approval,
  type Connector,
  type RuntimeError,
  type RuntimeEvent,
  type Task,
} from './mockRuntime';

export type RuntimeEventSnapshotInput = {
  approvalStatus: Approval['status'];
  connectorStatus: Connector['status'];
  recoveryEvent?: string;
  runtimeError?: RuntimeError;
  taskId?: string;
  taskStatus: Task['status'];
  traceId?: string;
};

export type RuntimeEventSubscription = {
  unsubscribe: () => void;
};

export type RuntimeEventStream = {
  getSnapshot: (input: RuntimeEventSnapshotInput) => RuntimeEvent[];
  pollSnapshot: (input: RuntimeEventSnapshotInput) => Promise<RuntimeEvent[]>;
  subscribe: (
    input: RuntimeEventSnapshotInput,
    onEvents: (events: RuntimeEvent[]) => void,
    onError?: (error: Error) => void,
  ) => RuntimeEventSubscription;
};

export const mockRuntimeEventStream: RuntimeEventStream = {
  getSnapshot(input) {
    return events(
      input.approvalStatus,
      input.taskStatus,
      input.connectorStatus,
      input.runtimeError,
      input.recoveryEvent,
    );
  },
  async pollSnapshot(input) {
    return this.getSnapshot(input);
  },
  subscribe(input, onEvents) {
    onEvents(this.getSnapshot(input));
    return {
      unsubscribe() {},
    };
  },
};

export const runtimeEventStream = mockRuntimeEventStream;

export type PollingRuntimeEventStreamOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  intervalMs?: number;
};

type RuntimeEventsResponse = RuntimeEvent[] | {
  events?: RuntimeEvent[];
};

export function createPollingRuntimeEventStream({
  baseUrl,
  fetchImpl = fetch,
  intervalMs = 2500,
}: PollingRuntimeEventStreamOptions): RuntimeEventStream {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  async function pollSnapshot(input: RuntimeEventSnapshotInput) {
    const query = new URLSearchParams();
    if (input.taskId) query.set('task_id', input.taskId);
    if (input.traceId) query.set('trace_id', input.traceId);

    const suffix = query.size > 0 ? `?${query.toString()}` : '';
    const response = await fetchImpl(`${normalizedBaseUrl}/events${suffix}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Runtime events request failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as RuntimeEventsResponse;
    return Array.isArray(payload) ? payload : payload.events ?? [];
  }

  return {
    getSnapshot() {
      return [];
    },
    pollSnapshot,
    subscribe(input, onEvents, onError) {
      let active = true;

      async function tick() {
        try {
          const nextEvents = await pollSnapshot(input);
          if (active) onEvents(nextEvents);
        } catch (error) {
          if (active && onError) {
            onError(error instanceof Error ? error : new Error('Runtime events request failed'));
          }
        }
      }

      void tick();
      const intervalId = globalThis.setInterval(() => {
        void tick();
      }, intervalMs);

      return {
        unsubscribe() {
          active = false;
          globalThis.clearInterval(intervalId);
        },
      };
    },
  };
}
