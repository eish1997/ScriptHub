import type { Approval, Connector, RuntimeError, Session, Task } from './mockRuntime';

const STORAGE_KEY = 'creative-runtime-demo-session';

export type RuntimeSnapshot = {
  session: Session;
  task: Task;
  approval: Approval;
  connector: Connector;
  runtimeError?: RuntimeError;
  recoveryEvent: string;
  toast: string;
};

export function loadSnapshot(): RuntimeSnapshot | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const snapshot = JSON.parse(raw) as RuntimeSnapshot;
    return {
      ...snapshot,
      session: {
        ...snapshot.session,
        status: 'restored',
        restored_count: snapshot.session.restored_count + 1,
        updated_at: new Date().toISOString(),
      },
      toast: '已恢复上次 Runtime Session',
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export function saveSnapshot(snapshot: RuntimeSnapshot) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearSnapshot() {
  window.localStorage.removeItem(STORAGE_KEY);
}
