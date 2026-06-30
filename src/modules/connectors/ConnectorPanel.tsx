import { Activity, Clock3, RefreshCw, TerminalSquare } from 'lucide-react';
import { Metric, StatusBadge } from '../../components/common';
import { type Connector } from '../../services/mockRuntime';

export function ConnectorPanel({
  busy,
  connector,
  connectorError,
  onRefreshConnector,
  onToggleConnector,
}: {
  busy: boolean;
  connector: Connector;
  connectorError?: string;
  onRefreshConnector: () => void;
  onToggleConnector: (connected: boolean) => void;
}) {
  const isConnected = connector.status === 'connected';

  return (
    <section className="panel full-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">Connector</p>
          <h2>{connector.name}</h2>
        </div>
        <StatusBadge value={connector.status} />
      </div>
      <div className="connector-grid">
        <Metric
          icon={TerminalSquare}
          label="健康状态"
          value={connector.health.state}
          tone={isConnected ? 'success' : 'warn'}
        />
        <Metric icon={Clock3} label="延迟" value={`${connector.health.latency_ms ?? 0} ms`} tone="info" />
        <Metric icon={Activity} label="能力数量" value={String(connector.capabilities.length)} tone="info" />
      </div>
      {connector.health.last_error && (
        <div className="blocking-banner">{connector.health.last_error}</div>
      )}
      {connectorError && (
        <div className="blocking-banner">Connector 请求失败：{connectorError}</div>
      )}
      <div className="action-row connector-actions">
        <button
          className="secondary-button"
          disabled={busy}
          onClick={onRefreshConnector}
          type="button"
        >
          <RefreshCw size={17} />
          刷新健康状态
        </button>
        <button
          className="primary-button"
          disabled={busy || isConnected}
          onClick={() => onToggleConnector(true)}
          type="button"
        >
          重连
        </button>
        <button
          className="secondary-button"
          disabled={busy || !isConnected}
          onClick={() => onToggleConnector(false)}
          type="button"
        >
          模拟断开
        </button>
      </div>
      <div className="capability-list">
        {connector.capabilities.map((capability) => (
          <span key={capability}>{capability}</span>
        ))}
      </div>
    </section>
  );
}
