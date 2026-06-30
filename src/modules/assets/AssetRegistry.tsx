import { FileText, GitBranch } from 'lucide-react';
import { StatusBadge } from '../../components/common';
import { hasPermission } from '../../services/permissions';
import type { AssetRecord, RuntimeEvent, RuntimeRole, Task } from '../../services/mockRuntime';
import { buildAssetProvenanceSummary } from '../../services/provenance';
import { ProvenanceChain } from './components/ProvenanceChain';

export function AssetRegistry({
  asset,
  events,
  onSelectAsset,
  onUpdateAsset,
  role,
  setToast,
  task,
}: {
  asset: AssetRecord;
  events: RuntimeEvent[];
  onSelectAsset: () => void;
  onUpdateAsset: (asset: AssetRecord) => void;
  role: RuntimeRole;
  setToast: (message: string) => void;
  task: Task;
}) {
  function updateStatus(status: AssetRecord['status']) {
    if (!hasPermission(role, 'asset.publish')) {
      setToast('当前角色没有资产发布/撤回权限');
      return;
    }
    onUpdateAsset({
      ...asset,
      status,
      updated_at: new Date().toISOString(),
    });
  }

  const provenanceSummary = buildAssetProvenanceSummary({ asset, events, task });

  return (
    <div className="asset-registry-layout">
      <section className="panel asset-registry-main">
        <div className="section-title">
          <div>
            <p className="eyebrow">Asset Registry</p>
            <h2>资产库</h2>
          </div>
          <StatusBadge value={asset.status} />
        </div>
        <button className="asset-row" onClick={onSelectAsset} type="button">
          <FileText size={28} />
          <div>
            <strong>{asset.name}</strong>
            <span>{asset.storage_uri}</span>
          </div>
          <span>{asset.asset_type.toUpperCase()}</span>
          <StatusBadge value={asset.status} />
          <span>{asset.version}</span>
        </button>
        <dl className="asset-provenance-summary" aria-label="Asset provenance summary">
          {provenanceSummary.map((item) => (
            <div key={item.id}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="action-row asset-actions">
          <button
            className="primary-button"
            disabled={asset.status === 'published'}
            onClick={() => updateStatus('published')}
            type="button"
          >
            发布
          </button>
          <button
            className="secondary-button"
            disabled={asset.status !== 'published'}
            onClick={() => updateStatus('archived')}
            type="button"
          >
            撤回
          </button>
          <button className="secondary-button" onClick={onSelectAsset} type="button">
            查看详情
          </button>
        </div>
      </section>

      <aside className="panel asset-registry-side">
        <div className="section-title compact">
          <h2>来源链</h2>
          <GitBranch size={18} />
        </div>
        <ProvenanceChain asset={asset} events={events} task={task} />
      </aside>
    </div>
  );
}
