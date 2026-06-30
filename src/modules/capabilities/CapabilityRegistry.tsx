import { Activity, Database, Plus, TerminalSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ManifestBlock, Metric, RiskBadge, StatusBadge } from '../../components/common';
import { type CapabilityManifest, type Connector } from '../../services/mockRuntime';

export function CapabilityRegistry({
  busy,
  capabilities,
  capabilityError,
  connector,
  onCreateTask,
  onRefreshCapabilities,
}: {
  busy: boolean;
  capabilities: CapabilityManifest[];
  capabilityError?: string;
  connector: Connector;
  onCreateTask: () => void;
  onRefreshCapabilities: () => void;
}) {
  const [selectedCapability, setSelectedCapability] = useState<CapabilityManifest | undefined>(capabilities[0]);
  const skillCount = capabilities.filter((capability) => capability.type === 'skill').length;
  const toolCount = capabilities.filter((capability) => capability.type === 'tool').length;
  const unavailableCount = capabilities.filter((capability) => !isCapabilityAvailable(capability, connector)).length;

  useEffect(() => {
    setSelectedCapability((current) => {
      if (current && capabilities.some((capability) => capability.id === current.id)) {
        return current;
      }
      return capabilities[0];
    });
  }, [capabilities]);

  return (
    <div className="capability-layout">
      <section className="panel capability-main">
        <div className="section-title">
          <div>
            <p className="eyebrow">Tool Registry</p>
            <h2>能力库</h2>
          </div>
          <button className="primary-button" onClick={onCreateTask} type="button">
            <Plus size={17} />
            用能力创建任务
          </button>
          <button className="secondary-button" disabled={busy} onClick={onRefreshCapabilities} type="button">
            刷新能力
          </button>
        </div>
        <div className="capability-metrics">
          <Metric icon={Database} label="Skill" value={String(skillCount)} tone="info" />
          <Metric icon={TerminalSquare} label="Tool" value={String(toolCount)} tone="info" />
          <Metric icon={Activity} label="不可用" value={String(unavailableCount)} tone={unavailableCount > 0 ? 'warn' : 'success'} />
          <Metric
            icon={Activity}
            label="Connector"
            value={connector.status}
            tone={connector.status === 'connected' ? 'success' : 'warn'}
          />
        </div>
        {capabilityError && (
          <div className="blocking-banner">能力刷新失败：{capabilityError}</div>
        )}
        {capabilities.length === 0 && !capabilityError && (
          <div className="blocking-banner">Runtime 当前没有返回能力 manifest。请确认 Hermes capability discovery 已启用。</div>
        )}
        <div className="capability-table">
          {capabilities.map((capability) => {
            const available = isCapabilityAvailable(capability, connector);
            return (
              <button
                className={
                  selectedCapability?.id === capability.id
                    ? 'capability-row active'
                    : 'capability-row'
                }
                key={capability.id}
                onClick={() => setSelectedCapability(capability)}
                type="button"
              >
                <span className={`capability-kind ${capability.type}`}>{capability.type}</span>
                <div>
                  <strong>{capability.name}</strong>
                  <span>{capability.id}</span>
                </div>
                <RiskBadge value={capability.risk_level} />
                <StatusBadge value={available ? capability.status : 'disabled'} />
              </button>
            );
          })}
        </div>
      </section>

      <aside className="panel capability-detail">
        {selectedCapability ? (
          <>
            <div className="section-title compact">
              <h2>{selectedCapability.name}</h2>
              <StatusBadge
                value={isCapabilityAvailable(selectedCapability, connector) ? selectedCapability.status : 'disabled'}
              />
            </div>
            <p className="muted">{selectedCapability.description}</p>
            <dl className="inspector-list">
              <div>
                <dt>ID</dt>
                <dd>{selectedCapability.id}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{selectedCapability.version}</dd>
              </div>
              <div>
                <dt>Connector</dt>
                <dd>{selectedCapability.connector_target} / {selectedCapability.connector_capability}</dd>
              </div>
              <div>
                <dt>审批</dt>
                <dd>{selectedCapability.requires_confirmation ? '需要' : '不需要'}</dd>
              </div>
              <div>
                <dt>权限</dt>
                <dd>{selectedCapability.permissions.join(', ')}</dd>
              </div>
            </dl>
            <ManifestBlock title="Inputs" values={selectedCapability.inputs} />
            <ManifestBlock title="Outputs" values={selectedCapability.outputs} />
            <div className="capability-tags">
              {selectedCapability.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="blocking-banner">暂无能力 manifest。请刷新能力列表。</div>
        )}
      </aside>
    </div>
  );
}

export function isCapabilityAvailable(capability: CapabilityManifest, connector: Connector) {
  return (
    connector.status === 'connected' &&
    connector.capabilities.includes(capability.connector_capability) &&
    capability.status !== 'disabled'
  );
}
