import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StatusBadge, Timeline } from '../../components/common';
import {
  type Connector,
  type FailureKind,
  type RuntimeError,
  type RuntimeEvent,
  type Task,
} from '../../services/mockRuntime';

type RecoveryAction = 'retry' | 'revise_path' | 'review' | 'cancel';

export function TaskDetail({
  connector,
  events: runtimeEvents,
  onComplete,
  onRecover,
  onSimulateFailure,
  runtimeError,
  task,
}: {
  connector: Connector;
  events: RuntimeEvent[];
  onComplete: () => void;
  onRecover: (action: RecoveryAction) => void;
  onSimulateFailure: (kind: FailureKind) => void;
  runtimeError?: RuntimeError;
  task: Task;
}) {
  return (
    <div className="detail-layout">
      <section className="panel main-column">
        <div className="section-title">
          <div>
            <p className="eyebrow">Task Detail</p>
            <h2>{task.goal}</h2>
          </div>
          <StatusBadge value={task.status} />
        </div>
        {connector.status !== 'connected' && (
          <div className="blocking-banner">
            Maya Connector 当前不可用。Runtime 会保留任务上下文，等待连接恢复后继续。
          </div>
        )}
        <div className="plan-list">
          {[
            '读取 Maya 当前选择',
            '校验 mesh 与命名',
            '确认输出路径和覆盖策略',
            '调用 Maya Connector 导出 FBX',
            '写入 Asset 与 Trace 记录',
          ].map((step, index) => (
            <div className="plan-step" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
        {runtimeError && <ErrorCard error={runtimeError} onRecover={onRecover} />}
        <div className="failure-lab">
          <div className="section-title compact">
            <h2>失败模拟</h2>
            <AlertTriangle size={18} />
          </div>
          <div className="failure-actions">
            <button className="secondary-button" onClick={() => onSimulateFailure('maya_timeout')} type="button">
              Maya 无响应
            </button>
            <button className="secondary-button" onClick={() => onSimulateFailure('output_conflict')} type="button">
              输出路径冲突
            </button>
            <button className="secondary-button" onClick={() => onSimulateFailure('empty_selection')} type="button">
              无选择对象
            </button>
            <button className="secondary-button" onClick={() => onSimulateFailure('uncertain_result')} type="button">
              结果不确定
            </button>
          </div>
        </div>
        {task.status === 'running' && (
          <button className="primary-button" onClick={onComplete} type="button">
            <CheckCircle2 size={17} />
            模拟执行完成
          </button>
        )}
      </section>
      <section className="panel">
        <div className="section-title compact">
          <h2>执行事件</h2>
          <Activity size={18} />
        </div>
        <Timeline events={runtimeEvents} />
      </section>
    </div>
  );
}

function ErrorCard({
  error,
  onRecover,
}: {
  error: RuntimeError;
  onRecover: (action: RecoveryAction) => void;
}) {
  return (
    <div className="error-card">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Runtime Error</p>
          <h2>{error.title}</h2>
        </div>
        <StatusBadge value="failed" />
      </div>
      <p>{error.message}</p>
      <dl className="error-grid">
        <div>
          <dt>错误类型</dt>
          <dd>{error.type}</dd>
        </div>
        <div>
          <dt>可恢复</dt>
          <dd>{error.recoverable ? '是' : '否'}</dd>
        </div>
        <div>
          <dt>可重试</dt>
          <dd>{error.retryable ? '是' : '否'}</dd>
        </div>
        <div>
          <dt>人工复核</dt>
          <dd>{error.requires_human_review ? '需要' : '不需要'}</dd>
        </div>
      </dl>
      <div className="blocking-banner">{error.suggested_action}</div>
      <div className="action-row recovery-actions">
        <button className="primary-button" disabled={!error.retryable} onClick={() => onRecover('retry')} type="button">
          重试
        </button>
        <button
          className="secondary-button"
          disabled={error.type !== 'conflict_error'}
          onClick={() => onRecover('revise_path')}
          type="button"
        >
          修改路径
        </button>
        <button
          className="secondary-button"
          disabled={!error.requires_human_review}
          onClick={() => onRecover('review')}
          type="button"
        >
          人工复核通过
        </button>
        <button className="secondary-button" onClick={() => onRecover('cancel')} type="button">
          取消任务
        </button>
      </div>
    </div>
  );
}
