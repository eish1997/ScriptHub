import { RiskBadge, StatusBadge } from '../../components/common';
import { type Task } from '../../services/mockRuntime';

export function TaskList({ onOpenTask, task }: { onOpenTask: () => void; task: Task }) {
  return (
    <section className="panel full-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">Task Center</p>
          <h2>任务中心</h2>
        </div>
        <div className="filter-pills">
          <span>全部</span>
          <span>高风险</span>
          <span>待审批</span>
        </div>
      </div>
      <button className="task-row" onClick={onOpenTask} type="button">
        <div>
          <strong>{task.goal}</strong>
          <span>{task.description}</span>
        </div>
        <RiskBadge value={task.risk_level} />
        <StatusBadge value={task.status} />
        <span className="trace-id">{task.trace_id}</span>
      </button>
    </section>
  );
}
