import { Activity, Archive, Clock3, FileText, ShieldAlert, TerminalSquare } from 'lucide-react';
import { Metric, RiskBadge, StatusBadge } from '../../components/common';
import { asset, type Approval, type Task } from '../../services/mockRuntime';

export function Dashboard({
  approval,
  connectorState,
  onOpenReview,
  onSubmitTask,
  task,
}: {
  approval: Approval;
  connectorState: string;
  onOpenReview: () => void;
  onSubmitTask: () => void;
  task: Task;
}) {
  return (
    <div className="page-grid">
      <section className="metric-row">
        <Metric icon={Activity} label="运行任务" value={task.status === 'running' ? '1' : '0'} tone="info" />
        <Metric icon={ShieldAlert} label="待审批" value={approval.status === 'pending' ? '1' : '0'} tone="warn" />
        <Metric icon={Archive} label="最近资产" value={task.status === 'succeeded' ? '1' : '0'} tone="success" />
        <Metric icon={TerminalSquare} label="Maya Connector" value={connectorState} tone="success" />
      </section>

      <section className="panel wide">
        <div className="section-title">
          <div>
            <p className="eyebrow">Current Task</p>
            <h2>{task.goal}</h2>
          </div>
          <StatusBadge value={task.status} />
        </div>
        <div className="task-summary">
          <div>
            <span className="field-label">输出路径</span>
            <strong>{task.metadata.output_path}</strong>
          </div>
          <div>
            <span className="field-label">风险等级</span>
            <RiskBadge value={task.risk_level} />
          </div>
          <div>
            <span className="field-label">审批状态</span>
            <StatusBadge value={approval.status} />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-title compact">
          <h2>待处理</h2>
          <Clock3 size={18} />
        </div>
        <p className="muted">文件写入和同名文件冲突检查需要人工确认。</p>
        <div className="stacked-actions">
          <button className="primary-button full" onClick={onOpenReview} type="button">
            查看审批
          </button>
          <button className="secondary-button full" onClick={onSubmitTask} type="button">
            新建导出任务
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title compact">
          <h2>最近资产</h2>
          <Archive size={18} />
        </div>
        <AssetMini />
      </section>
    </div>
  );
}

function AssetMini() {
  return (
    <div className="asset-mini">
      <FileText size={28} />
      <div>
        <strong>{asset.name}</strong>
        <span>{asset.asset_type.toUpperCase()} · {asset.version}</span>
      </div>
    </div>
  );
}
