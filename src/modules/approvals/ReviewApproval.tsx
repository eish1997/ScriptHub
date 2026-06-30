import { GitBranch } from 'lucide-react';
import { RiskBadge, StatusBadge, Timeline } from '../../components/common';
import {
  policyRules,
  type Approval,
  type Connector,
  type RuntimeEvent,
  type RuntimeRole,
  type Task,
} from '../../services/mockRuntime';
import { hasPermission } from '../../services/permissions';

export function ReviewApproval({
  approval,
  approvalError,
  connector,
  events: runtimeEvents,
  onDecision,
  role,
  task,
}: {
  approval: Approval;
  approvalError?: string;
  connector: Connector;
  events: RuntimeEvent[];
  onDecision: (decision: 'approved' | 'rejected') => void;
  role: RuntimeRole;
  task: Task;
}) {
  const isPending = approval.status === 'pending';
  const canApprove = isPending && connector.status === 'connected' && hasPermission(role, 'approval.decide');
  const triggeredPolicies = policyRules.filter((policy) =>
    ['policy.high_risk_requires_approval', 'policy.filesystem_write_requires_confirmation'].includes(policy.id),
  );

  return (
    <div className="detail-layout">
      <section className="panel main-column">
        <div className="section-title">
          <div>
            <p className="eyebrow">Approval</p>
            <h2>导出 FBX 审批</h2>
          </div>
          <RiskBadge value={approval.risk_level} />
        </div>
        <div className="approval-box">
          <strong>{approval.reason}</strong>
          <p>{approval.impact_scope}</p>
        </div>
        <div className="policy-explain">
          <strong>触发策略</strong>
          {triggeredPolicies.map((policy) => (
            <div key={policy.id}>
              <code>{policy.id}</code>
              <span>{policy.description}</span>
            </div>
          ))}
        </div>
        {connector.status !== 'connected' && (
          <div className="blocking-banner">
            Maya Connector 已断开。可以拒绝审批，但批准执行会被 Runtime 暂停。
          </div>
        )}
        {approvalError && (
          <div className="blocking-banner">审批请求失败：{approvalError}</div>
        )}
        <dl className="inspector-list">
          <div>
            <dt>关联任务</dt>
            <dd>{task.goal}</dd>
          </div>
          <div>
            <dt>审批状态</dt>
            <dd>
              <StatusBadge value={approval.status} />
            </dd>
          </div>
          <div>
            <dt>Trace</dt>
            <dd>{approval.trace_id}</dd>
          </div>
        </dl>
        <div className="action-row">
          <button className="primary-button" disabled={!canApprove} onClick={() => onDecision('approved')} type="button">
            批准
          </button>
          <button className="secondary-button" disabled={!isPending} onClick={() => onDecision('rejected')} type="button">
            拒绝
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="section-title compact">
          <h2>Trace 时间线</h2>
          <GitBranch size={18} />
        </div>
        <Timeline events={runtimeEvents} />
      </section>
    </div>
  );
}
