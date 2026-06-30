import { Timeline } from '../../../components/common';
import type { AssetRecord, RuntimeEvent, Task } from '../../../services/mockRuntime';
import { buildAssetProvenance } from '../../../services/provenance';

export function ProvenanceChain({
  asset,
  events,
  task,
}: {
  asset: AssetRecord;
  events: RuntimeEvent[];
  task: Task;
}) {
  const provenance = buildAssetProvenance({ asset, events, task });

  return (
    <div className="provenance-chain">
      {provenance.chain.map((item) => (
        <div className="provenance-item" key={item.id}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <span>{item.detail}</span>
        </div>
      ))}
      <div className="provenance-events">
        <strong>Related events</strong>
        <Timeline events={provenance.events} />
      </div>
    </div>
  );
}
