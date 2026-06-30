import type { Connector, RuntimeError, Session, Task } from '../services/mockRuntime';
import { StatusBadge } from './common';

export function SessionStrip({
  connector,
  runtimeError,
  session,
  task,
}: {
  connector: Connector;
  runtimeError?: RuntimeError;
  session: Session;
  task: Task;
}) {
  return (
    <section className="session-strip" aria-label="Runtime Session">
      <div>
        <span>Session</span>
        <strong>{session.id}</strong>
      </div>
      <div>
        <span>状态</span>
        <StatusBadge value={session.status} />
      </div>
      <div>
        <span>恢复次数</span>
        <strong>{session.restored_count}</strong>
      </div>
      <div>
        <span>任务</span>
        <StatusBadge value={task.status} />
      </div>
      <div>
        <span>连接器</span>
        <StatusBadge value={connector.status} />
      </div>
      {runtimeError && (
        <div>
          <span>最近错误</span>
          <strong>{runtimeError.code}</strong>
        </div>
      )}
    </section>
  );
}
