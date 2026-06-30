import { StatusBadge } from '../../../components/common';
import { assetVersions } from '../../../services/mockRuntime';

export function VersionList() {
  return (
    <div className="version-list">
      {assetVersions.map((version) => (
        <div className="version-row" key={version.version}>
          <div>
            <strong>{version.version}</strong>
            <span>{version.note}</span>
          </div>
          <StatusBadge value={version.status} />
        </div>
      ))}
    </div>
  );
}
