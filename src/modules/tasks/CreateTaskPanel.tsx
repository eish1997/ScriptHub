import { FormEvent, useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/common';
import { isCapabilityAvailable } from '../capabilities/CapabilityRegistry';
import { type CapabilityManifest, type Connector } from '../../services/mockRuntime';
import { type SubmitTaskInput } from '../../services/runtimeApi';

export function CreateTaskPanel({
  busy,
  capabilities,
  capabilityError,
  connector,
  onClose,
  onSubmit,
  taskError,
}: {
  busy: boolean;
  capabilities: CapabilityManifest[];
  capabilityError?: string;
  connector: Connector;
  onClose: () => void;
  onSubmit: (input: SubmitTaskInput) => void;
  taskError?: string;
}) {
  const availableTaskCapabilities = useMemo(
    () => capabilities.filter((capability) => capability.type === 'skill'),
    [capabilities],
  );
  const [capabilityId, setCapabilityId] = useState(availableTaskCapabilities[0]?.id ?? 'maya.export_fbx.v1');
  const [outputPath, setOutputPath] = useState('project://exports/selected_asset.fbx');
  const [overwrite, setOverwrite] = useState(false);
  const [error, setError] = useState('');
  const selectedCapability = capabilities.find((capability) => capability.id === capabilityId);
  const capabilityAvailable = selectedCapability
    ? isCapabilityAvailable(selectedCapability, connector)
    : false;

  useEffect(() => {
    if (!selectedCapability && availableTaskCapabilities[0]) {
      setCapabilityId(availableTaskCapabilities[0].id);
    }
  }, [availableTaskCapabilities, selectedCapability]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCapability) {
      setError('暂无可用能力，请先刷新能力列表');
      return;
    }
    if (!outputPath.trim()) {
      setError('需要提供输出路径');
      return;
    }
    if (!outputPath.endsWith('.fbx')) {
      setError('输出路径必须以 .fbx 结尾');
      return;
    }
    if (!capabilityAvailable) {
      setError('当前能力不可用，请恢复 Connector 后再提交');
      return;
    }
    setError('');
    onSubmit({ capability_id: capabilityId, output_path: outputPath.trim(), overwrite });
  }

  return (
    <div className="drawer-backdrop">
      <aside className="drawer" aria-label="新建导出任务">
        <div className="section-title">
          <div>
            <p className="eyebrow">Submit Task</p>
            <h2>新建 Maya 导出任务</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            <span>能力</span>
            <select
              disabled={availableTaskCapabilities.length === 0}
              value={capabilityId}
              onChange={(event) => setCapabilityId(event.target.value)}
            >
              {availableTaskCapabilities.map((capability) => (
                <option key={capability.id} value={capability.id}>
                  {capability.name} / {capability.id}
                </option>
              ))}
            </select>
          </label>
          {selectedCapability && (
            <div className="manifest-inline">
              <StatusBadge value={capabilityAvailable ? 'available' : 'disabled'} />
              <span>{selectedCapability.description}</span>
            </div>
          )}
          {capabilityError && <p className="form-error">能力刷新失败：{capabilityError}</p>}
          {availableTaskCapabilities.length === 0 && !capabilityError && (
            <p className="form-error">暂无可用于创建任务的 skill 能力，请刷新能力列表。</p>
          )}
          <label>
            <span>输出路径</span>
            <input
              value={outputPath}
              onChange={(event) => setOutputPath(event.target.value)}
              placeholder="project://exports/selected_asset.fbx"
            />
          </label>
          <label className="checkbox-line">
            <input
              checked={overwrite}
              onChange={(event) => setOverwrite(event.target.checked)}
              type="checkbox"
            />
            <span>允许覆盖同名文件</span>
          </label>
          <div className="approval-box">
            <strong>Runtime 将生成可审查计划</strong>
            <p>提交后不会直接执行。系统会先进入审批队列，再等待人工批准。</p>
          </div>
          {taskError && <p className="form-error">任务提交失败：{taskError}</p>}
          {error && <p className="form-error">{error}</p>}
          <div className="action-row">
            <button className="primary-button" disabled={busy} type="submit">
              提交给 Runtime
            </button>
            <button className="secondary-button" disabled={busy} type="button" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
