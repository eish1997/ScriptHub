import { Archive, FileText, GitBranch } from 'lucide-react';
import { StatusBadge } from '../../components/common';
import type { AssetRecord, RuntimeEvent, Task } from '../../services/mockRuntime';
import { ProvenanceChain } from './components/ProvenanceChain';
import { VersionList } from './components/VersionList';

export function AssetDetail({
  asset,
  events,
  task,
}: {
  asset: AssetRecord;
  events: RuntimeEvent[];
  task: Task;
}) {
  return (
    <div className="detail-layout">
      <section className="panel main-column">
        <div className="asset-preview">
          <FileText size={56} />
          <div>
            <p className="eyebrow">FBX Asset</p>
            <h2>{asset.name}</h2>
            <span>{asset.storage_uri}</span>
          </div>
        </div>
        <dl className="inspector-list">
          <div>
            <dt>Source task</dt>
            <dd>{task.goal}</dd>
          </div>
          <div>
            <dt>Asset status</dt>
            <dd>
              <StatusBadge value={asset.status} />
            </dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{asset.version}</dd>
          </div>
        </dl>
      </section>
      <section className="panel">
        <div className="section-title compact">
          <h2>Provenance</h2>
          <GitBranch size={18} />
        </div>
        <ProvenanceChain asset={asset} events={events} task={task} />
        <div className="section-title compact asset-version-title">
          <h2>Versions</h2>
          <Archive size={18} />
        </div>
        <VersionList />
      </section>
    </div>
  );
}
