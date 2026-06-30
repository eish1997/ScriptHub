import { CheckCircle2, ClipboardCheck, History, Plus, RotateCcw, Wrench, X, XCircle } from 'lucide-react';
import type { DevToolsScenarioHistoryEntry } from '../../services/devToolsScenarioHistory';
import type { ExternalMayaConnectorSyncStatus } from '../../services/mayaConnectorHttpActivity';
import type { ExternalHttpToolBridgeSyncStatus } from '../../services/runtimeController';
import type { ToolBridgeFailureScenario } from '../../services/toolBridgeMock';

type DevToolsPanelProps = {
  approvalStatus: string;
  busy: boolean;
  connectorStatus: string;
  conversationStatus: string;
  externalMayaConnectorSync: ExternalMayaConnectorSyncStatus;
  externalHttpToolBridgeSync: ExternalHttpToolBridgeSyncStatus;
  history: DevToolsScenarioHistoryEntry[];
  providerMode: string;
  onClose: () => void;
  onOpenReview: () => void;
  onReplayScenario: (entryId: string) => void;
  onSimulateApprovalDecision: (decision: 'approved' | 'rejected') => void;
  onSimulateToolBridge: () => void;
  onSimulateToolBridgeFailure: (scenario: ToolBridgeFailureScenario) => void;
  onSimulateToolBridgeValidationFailure: () => void;
  onSubmitDebugTask: () => void;
  taskStatus: string;
};

export function DevToolsPanel({
  approvalStatus,
  busy,
  connectorStatus,
  conversationStatus,
  externalMayaConnectorSync,
  externalHttpToolBridgeSync,
  history,
  providerMode,
  onClose,
  onOpenReview,
  onReplayScenario,
  onSimulateApprovalDecision,
  onSimulateToolBridge,
  onSimulateToolBridgeFailure,
  onSimulateToolBridgeValidationFailure,
  onSubmitDebugTask,
  taskStatus,
}: DevToolsPanelProps) {
  return (
    <div className="drawer-backdrop devtools-backdrop" role="presentation">
      <aside className="drawer devtools-panel" aria-label="开发工具" role="dialog" aria-modal="true">
        <div className="devtools-header">
          <div>
            <p className="eyebrow">DevTools</p>
            <h2>开发工具</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="关闭开发工具" title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="devtools-status-grid" aria-label="当前运行状态">
          <div>
            <span>任务</span>
            <strong>{taskStatus}</strong>
          </div>
          <div>
            <span>审批</span>
            <strong>{approvalStatus}</strong>
          </div>
          <div>
            <span>Hermes</span>
            <strong>{conversationStatus}</strong>
          </div>
          <div>
            <span>连接器</span>
            <strong>{connectorStatus}</strong>
          </div>
          <div>
            <span>Provider</span>
            <strong>{providerMode}</strong>
          </div>
          <div>
            <span>HTTP Bridge</span>
            <strong>{getSyncStateLabel(externalHttpToolBridgeSync.state)}</strong>
          </div>
          <div>
            <span>Maya HTTP</span>
            <strong>{getConnectorSyncStateLabel(externalMayaConnectorSync.state)}</strong>
          </div>
          <div>
            <span>Maya Mode</span>
            <strong>{externalMayaConnectorSync.mode ?? '未知'}</strong>
          </div>
          <div>
            <span>Selection</span>
            <strong>{externalMayaConnectorSync.selectionCount ?? '暂无'}</strong>
          </div>
          <div>
            <span>已同步调用</span>
            <strong>{externalHttpToolBridgeSync.syncedToolCallCount}</strong>
          </div>
          <div>
            <span>最后同步</span>
            <strong>{externalHttpToolBridgeSync.lastSyncedAt ? formatTime(externalHttpToolBridgeSync.lastSyncedAt) : '暂无'}</strong>
          </div>
          <div>
            <span>最后检查</span>
            <strong>{externalHttpToolBridgeSync.lastCheckedAt ? formatTime(externalHttpToolBridgeSync.lastCheckedAt) : '暂无'}</strong>
          </div>
        </div>

        {externalHttpToolBridgeSync.lastError && (
          <div className="devtools-sync-error">
            本地 HTTP Tool Bridge：{externalHttpToolBridgeSync.lastError}
          </div>
        )}

        {externalMayaConnectorSync.lastError && (
          <div className="devtools-sync-error">
            本地 Maya Connector：{externalMayaConnectorSync.lastError}
            {externalMayaConnectorSync.lastRepairSuggestion
              ? `；建议：${externalMayaConnectorSync.lastRepairSuggestion.recommendedAction}`
              : ''}
          </div>
        )}

        <section className="devtools-section">
          <div>
            <h3>任务调试</h3>
            <p>打开任务表单，使用当前运行时动作创建一条调试任务。</p>
          </div>
          <button className="primary-button full" onClick={onSubmitDebugTask} type="button">
            <Plus size={17} />
            调试任务
          </button>
        </section>

        <section className="devtools-section">
          <div>
            <h3>场景历史</h3>
            <p>保留最近 8 次模拟动作，便于快速回放 Tool Bridge 链路和失败路径。</p>
          </div>
          {history.length === 0 ? (
            <div className="devtools-empty-history">
              <History size={17} />
              <span>暂无历史</span>
            </div>
          ) : (
            <div className="devtools-history-list">
              {history.map((entry) => (
                <article className={`devtools-history-item ${entry.status}`} key={entry.id}>
                  <div>
                    <span>{formatTime(entry.created_at)}</span>
                    <strong>{entry.title}</strong>
                    <p>{entry.detail}</p>
                  </div>
                  <button
                    className="icon-button"
                    disabled={busy}
                    onClick={() => onReplayScenario(entry.id)}
                    type="button"
                    aria-label={`回放${entry.title}`}
                    title="回放"
                  >
                    <RotateCcw size={16} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="devtools-section">
          <div>
            <h3>Hermes 模拟</h3>
            <p>触发外部 Tool Bridge 调用，或模拟审批系统返回结果。</p>
          </div>
          <div className="stacked-actions">
            <button className="secondary-button full" disabled={busy} onClick={onSimulateToolBridge} type="button">
              <Wrench size={17} />
              模拟调用
            </button>
            <button
              className="secondary-button full"
              disabled={busy}
              onClick={() => onSimulateApprovalDecision('approved')}
              type="button"
            >
              <CheckCircle2 size={17} />
              模拟批准
            </button>
            <button
              className="secondary-button full"
              disabled={busy}
              onClick={() => onSimulateApprovalDecision('rejected')}
              type="button"
            >
              <XCircle size={17} />
              模拟拒绝
            </button>
          </div>
        </section>

        <section className="devtools-section">
          <div>
            <h3>失败路径</h3>
            <p>模拟外部 Hermes 调用 ScriptHub Tool Bridge 时出现的典型错误。</p>
          </div>
          <div className="stacked-actions">
            <button
              className="secondary-button full"
              disabled={busy}
              onClick={() => onSimulateToolBridgeFailure('connector_unavailable')}
              type="button"
            >
              Connector 不可用
            </button>
            <button
              className="secondary-button full"
              disabled={busy}
              onClick={() => onSimulateToolBridgeFailure('task_create_failed')}
              type="button"
            >
              task.create 失败
            </button>
            <button
              className="secondary-button full"
              disabled={busy}
              onClick={() => onSimulateToolBridgeFailure('approval_decide_failed')}
              type="button"
            >
              approval.decide 失败
            </button>
            <button
              className="secondary-button full"
              disabled={busy}
              onClick={onSimulateToolBridgeValidationFailure}
              type="button"
            >
              入参校验失败
            </button>
          </div>
        </section>

        <section className="devtools-section">
          <div>
            <h3>只读观察</h3>
            <p>跳转到审批页检查当前审批上下文，不直接修改运行状态。</p>
          </div>
          <button className="secondary-button full" onClick={onOpenReview} type="button">
            <ClipboardCheck size={17} />
            查看审批
          </button>
        </section>

        <button className="secondary-button full devtools-close" onClick={onClose} type="button">
          关闭
        </button>
      </aside>
    </div>
  );
}

function getConnectorSyncStateLabel(state: ExternalMayaConnectorSyncStatus['state']) {
  if (state === 'connected') return '已连接';
  if (state === 'failed') return '有错误';
  if (state === 'offline') return '未连接';
  return '检查中';
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function getSyncStateLabel(state: ExternalHttpToolBridgeSyncStatus['state']) {
  if (state === 'connected') return '已连接';
  if (state === 'offline') return '未连接';
  return '检查中';
}
