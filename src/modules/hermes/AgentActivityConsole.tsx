import { AlertTriangle, Bot, RadioTower, UserRound, Wrench } from 'lucide-react';
import type { HermesConversation, HermesMessage } from '../../services/hermesConversation';
import type { ExternalHttpToolBridgeSyncStatus } from '../../services/runtimeController';
import type { ToolBridgeFailureScenario } from '../../services/toolBridgeMock';

type AgentActivityConsoleProps = {
  conversation: HermesConversation;
  externalHttpToolBridgeSync: ExternalHttpToolBridgeSyncStatus;
  messages: HermesMessage[];
  onSimulateExternalApprovalDecision: (decision: 'approved' | 'rejected') => void;
  onSimulateExternalToolBridge: () => void;
  onSimulateExternalToolBridgeFailure?: (scenario: ToolBridgeFailureScenario) => void;
};

export function AgentActivityConsole({
  conversation,
  externalHttpToolBridgeSync,
  messages,
  onSimulateExternalApprovalDecision,
  onSimulateExternalToolBridge,
  onSimulateExternalToolBridgeFailure,
}: AgentActivityConsoleProps) {
  return (
    <section className="panel hermes-console">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Agent Activity</p>
          <h2>{conversation.title}</h2>
        </div>
        <span className={`status-badge ${conversation.status}`}>{conversation.status}</span>
      </div>

      <div className="activity-notice">
        <RadioTower size={18} />
        <span>ScriptHub 正在镜像外部 Hermes 活动。正式对话和确认发生在 Hermes 中，这里只显示工具调用、状态和沉淀结果。</span>
      </div>

      <div className="activity-notice bridge-sync-notice">
        <RadioTower size={18} />
        <div>
          <strong>本地 HTTP Tool Bridge：{getSyncStateLabel(externalHttpToolBridgeSync.state)}</strong>
          <span>
            已同步 {externalHttpToolBridgeSync.syncedToolCallCount} 次调用
            {externalHttpToolBridgeSync.lastSyncedAt ? `，最后同步 ${formatSyncTime(externalHttpToolBridgeSync.lastSyncedAt)}` : ''}
            {externalHttpToolBridgeSync.lastCheckedAt ? `，最后检查 ${formatSyncTime(externalHttpToolBridgeSync.lastCheckedAt)}` : ''}
          </span>
          {externalHttpToolBridgeSync.lastError && <span>{externalHttpToolBridgeSync.lastError}</span>}
        </div>
        <span className={`status-badge ${getSyncBadgeStatus(externalHttpToolBridgeSync.state)}`}>
          {getSyncStateLabel(externalHttpToolBridgeSync.state)}
        </span>
      </div>

      <div className="conversation-list">
        {messages.map((message) => {
          const Icon = getMessageIcon(message.role);
          return (
            <div className={`message-row ${message.role}`} key={message.id}>
              <div className="message-avatar">
                <Icon size={16} />
              </div>
              <div>
                <strong>{getRoleLabel(message.role)}</strong>
                <p>{message.content}</p>
                {message.tool_call_id && <span>关联工具调用：{message.tool_call_id}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="debug-control">
        <div>
          <strong>开发态 Tool Bridge mock</strong>
          <span>模拟外部 Hermes 调用 ScriptHub 工具，便于验证控制台状态。</span>
        </div>
        <button className="secondary-button" onClick={onSimulateExternalToolBridge} type="button">
          <Wrench size={16} />
          模拟调用
        </button>
        <button className="secondary-button" onClick={() => onSimulateExternalApprovalDecision('approved')} type="button">
          模拟批准
        </button>
        <button className="secondary-button" onClick={() => onSimulateExternalApprovalDecision('rejected')} type="button">
          模拟拒绝
        </button>
        <button
          className="secondary-button"
          disabled={!onSimulateExternalToolBridgeFailure}
          onClick={() => onSimulateExternalToolBridgeFailure?.('connector_unavailable')}
          type="button"
        >
          <AlertTriangle size={16} />
          Connector unavailable
        </button>
        <button
          className="secondary-button"
          disabled={!onSimulateExternalToolBridgeFailure}
          onClick={() => onSimulateExternalToolBridgeFailure?.('task_create_failed')}
          type="button"
        >
          task.create failed
        </button>
        <button
          className="secondary-button"
          disabled={!onSimulateExternalToolBridgeFailure}
          onClick={() => onSimulateExternalToolBridgeFailure?.('approval_decide_failed')}
          type="button"
        >
          approval.decide failed
        </button>
      </div>
    </section>
  );
}

function getRoleLabel(role: HermesMessage['role']) {
  if (role === 'user') return '用户在 Hermes 中';
  if (role === 'hermes') return '外部 Hermes';
  if (role === 'tool') return 'ScriptHub Tool Bridge';
  return 'System';
}

function getMessageIcon(role: HermesMessage['role']) {
  if (role === 'user') return UserRound;
  if (role === 'tool') return Wrench;
  return Bot;
}

function getSyncStateLabel(state: ExternalHttpToolBridgeSyncStatus['state']) {
  if (state === 'connected') return '已连接';
  if (state === 'offline') return '未连接';
  return '检查中';
}

function getSyncBadgeStatus(state: ExternalHttpToolBridgeSyncStatus['state']) {
  if (state === 'connected') return 'connected';
  if (state === 'offline') return 'idle';
  return 'running';
}

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}
