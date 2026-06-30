import { Activity, Waypoints } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge, statusLabel } from '../../components/common';
import { type Permission, type RuntimeRole, type Task } from '../../services/mockRuntime';
import { hasPermission } from '../../services/permissions';

type StateTransition = {
  from: Task['status'];
  to: Task['status'];
  label: string;
  trigger: string;
  permission: Permission;
  audit: boolean;
  recoverable: boolean;
  ui_action: string;
};

const stateTransitions: StateTransition[] = [
  {
    from: 'planned',
    to: 'waiting_approval',
    label: '请求审批',
    trigger: '计划包含高风险文件写入',
    permission: 'task.create',
    audit: true,
    recoverable: true,
    ui_action: '提交任务',
  },
  {
    from: 'waiting_approval',
    to: 'running',
    label: '审批通过',
    trigger: 'Approver 批准执行',
    permission: 'approval.decide',
    audit: true,
    recoverable: true,
    ui_action: '批准',
  },
  {
    from: 'running',
    to: 'succeeded',
    label: '执行完成',
    trigger: 'Connector 返回成功并生成 Asset',
    permission: 'runtime.read',
    audit: false,
    recoverable: false,
    ui_action: '模拟执行完成',
  },
  {
    from: 'running',
    to: 'failed',
    label: '执行失败',
    trigger: 'Connector 超时、路径冲突或结果不确定',
    permission: 'runtime.read',
    audit: true,
    recoverable: true,
    ui_action: '失败模拟',
  },
  {
    from: 'failed',
    to: 'running',
    label: '重试/复核',
    trigger: '用户选择重试或人工复核通过',
    permission: 'runtime.read',
    audit: true,
    recoverable: true,
    ui_action: '重试 / 人工复核通过',
  },
  {
    from: 'failed',
    to: 'planned',
    label: '修改计划',
    trigger: '用户修改输出路径',
    permission: 'task.create',
    audit: true,
    recoverable: true,
    ui_action: '修改路径',
  },
  {
    from: 'failed',
    to: 'canceled',
    label: '取消任务',
    trigger: '用户取消失败任务',
    permission: 'runtime.read',
    audit: true,
    recoverable: false,
    ui_action: '取消任务',
  },
];

export function StateMachinePage({ role, task }: { role: RuntimeRole; task: Task }) {
  const [selectedTransition, setSelectedTransition] = useState<StateTransition>(stateTransitions[0]);
  const states: Task['status'][] = ['planned', 'waiting_approval', 'running', 'failed', 'succeeded', 'canceled'];
  const activeTransitions = stateTransitions.filter((transition) => transition.from === task.status);

  return (
    <div className="state-machine-layout">
      <section className="panel state-machine-main">
        <div className="section-title">
          <div>
            <p className="eyebrow">Runtime Control Plane</p>
            <h2>状态机</h2>
          </div>
          <StatusBadge value={task.status} />
        </div>
        <div className="state-node-grid">
          {states.map((state) => (
            <div className={state === task.status ? 'state-node active' : 'state-node'} key={state}>
              <span>Task State</span>
              <strong>{statusLabel[state]}</strong>
              <code>{state}</code>
            </div>
          ))}
        </div>
        <div className="transition-list">
          {stateTransitions.map((transition) => {
            const isCurrent = transition.from === task.status;
            return (
              <button
                className={selectedTransition === transition ? 'transition-row active' : 'transition-row'}
                key={`${transition.from}-${transition.to}-${transition.label}`}
                onClick={() => setSelectedTransition(transition)}
                type="button"
              >
                <span className={isCurrent ? 'transition-current' : 'transition-idle'}>{transition.from}</span>
                <strong>{transition.label}</strong>
                <span>{transition.to}</span>
                <StatusBadge value={hasPermission(role, transition.permission) ? 'allow' : 'deny'} />
              </button>
            );
          })}
        </div>
      </section>

      <aside className="panel state-machine-side">
        <div className="section-title compact">
          <h2>迁移详情</h2>
          <Waypoints size={18} />
        </div>
        <dl className="inspector-list">
          <div>
            <dt>From</dt>
            <dd><StatusBadge value={selectedTransition.from} /></dd>
          </div>
          <div>
            <dt>To</dt>
            <dd><StatusBadge value={selectedTransition.to} /></dd>
          </div>
          <div>
            <dt>触发动作</dt>
            <dd>{selectedTransition.trigger}</dd>
          </div>
          <div>
            <dt>所需权限</dt>
            <dd>{selectedTransition.permission}</dd>
          </div>
          <div>
            <dt>写入 Audit</dt>
            <dd>{selectedTransition.audit ? '是' : '否'}</dd>
          </div>
          <div>
            <dt>可恢复</dt>
            <dd>{selectedTransition.recoverable ? '是' : '否'}</dd>
          </div>
          <div>
            <dt>UI 操作</dt>
            <dd>{selectedTransition.ui_action}</dd>
          </div>
        </dl>
        <div className="section-title compact state-active-title">
          <h2>当前可用迁移</h2>
          <Activity size={18} />
        </div>
        <div className="active-transition-stack">
          {activeTransitions.length === 0 ? (
            <div className="blocking-banner">当前状态没有可用迁移。</div>
          ) : (
            activeTransitions.map((transition) => (
              <button
                className="active-transition-card"
                key={`${transition.from}-${transition.to}`}
                onClick={() => setSelectedTransition(transition)}
                type="button"
              >
                <strong>{transition.label}</strong>
                <span>{transition.from} -&gt; {transition.to}</span>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
