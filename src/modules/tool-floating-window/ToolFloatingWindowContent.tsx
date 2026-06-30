import { Play, Wrench, X } from 'lucide-react';
import { StatusBadge } from '../../components/common';
import {
  buildSubmitTaskInputFromToolParameters,
  type ArtifactSummary,
  type RepairAction,
  type SafetyPreview,
  type ToolCategory,
  type ToolMaturity,
  type UserTool,
} from '../../services/personalRuntime';
import type { MayaConnectorRepairSuggestion } from '../../services/mayaConnectorRepair';

type ToolFloatingWindowContentProps = {
  artifact: ArtifactSummary;
  busy: boolean;
  error: string;
  onClose: () => void;
  onExecute: () => void;
  onParameterChange: (key: string, value: unknown) => void;
  onRepair: () => void;
  parameterValues: Record<string, unknown>;
  repairAction?: RepairAction;
  repairSuggestion?: MayaConnectorRepairSuggestion;
  safetyPreview: SafetyPreview;
  tool: UserTool;
};

export function ToolFloatingWindowContent({
  artifact,
  busy,
  error,
  onClose,
  onExecute,
  onParameterChange,
  onRepair,
  parameterValues,
  repairAction,
  repairSuggestion,
  safetyPreview,
  tool,
}: ToolFloatingWindowContentProps) {
  return (
    <>
      <div className="section-title">
        <div>
          <p className="eyebrow">Floating Tool Window · Web Preview</p>
          <h2>{tool.name}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="关闭工具小窗"
        >
          <X size={18} />
        </button>
      </div>

      <div className="tool-window-summary">
        <span className={`tool-source ${tool.source}`}>
          {getToolSourceLabel(tool.source)}
        </span>
        <span className={`tool-maturity ${tool.maturity}`}>
          {getToolMaturityLabel(tool.maturity)}
        </span>
        <StatusBadge value={tool.status} />
        <span>{tool.runtime.toUpperCase()}</span>
      </div>

      <p className="muted">{tool.description}</p>

      <section className="tool-window-section">
        <h3>参数</h3>
        <div className="tool-parameter-list">
          {tool.parameters.map((parameter) => (
            <label key={parameter.key}>
              <span>
                {parameter.label}
                {parameter.required ? ' *' : ''}
              </span>
              {parameter.type === 'boolean' ? (
                <input
                  checked={Boolean(parameterValues[parameter.key])}
                  onChange={(event) => onParameterChange(parameter.key, event.target.checked)}
                  type="checkbox"
                />
              ) : (
                <input
                  onChange={(event) => onParameterChange(parameter.key, event.target.value)}
                  value={String(parameterValues[parameter.key] ?? '')}
                />
              )}
              {parameter.safetyNote && <small>{parameter.safetyNote}</small>}
            </label>
          ))}
        </div>
      </section>

      <section className="tool-window-section">
        <h3>安全确认</h3>
        <div className="safety-grid">
          <div>
            <span>会读取</span>
            <strong>{safetyPreview.readScope}</strong>
          </div>
          <div>
            <span>会写入</span>
            <strong>{getToolWindowWriteScope(tool, parameterValues, safetyPreview.writeScope)}</strong>
          </div>
          <div>
            <span>覆盖策略</span>
            <strong>{safetyPreview.overwriteLabel}</strong>
          </div>
          <div>
            <span>所需权限</span>
            <strong>{safetyPreview.permissionSummary}</strong>
          </div>
        </div>
      </section>

      <section className="tool-window-section">
        <h3>最近产物</h3>
        <div className="artifact-summary-card">
          <strong>{artifact.name}</strong>
          <StatusBadge value={artifact.status} />
          <span className="trace-id">{artifact.storageUri}</span>
        </div>
      </section>

      <section className="tool-window-section">
        <h3>Hermes 修复</h3>
        {repairSuggestion && (
          <div className="connector-repair-suggestion">
            <strong>{repairSuggestion.summary}</strong>
            <p>{repairSuggestion.userMessage}</p>
            <div className="connector-repair-meta">
              <span>{repairSuggestion.requiresUserInput ? '需要用户确认' : 'Hermes 可先处理'}</span>
              <span>{repairSuggestion.canRetry ? '可重试' : '先修复再执行'}</span>
              <code>{repairSuggestion.recommendedAction}</code>
            </div>
          </div>
        )}
        <div className="repair-list">
          {tool.repairHistory.map((repair) => (
            <div className="repair-action" key={repair.id}>
              <Wrench size={17} />
              <span>
                <strong>{repair.problem}</strong>
                <small>{repair.hermesAction}</small>
              </span>
            </div>
          ))}
        </div>
      </section>
      {error && <p className="form-error">{error}</p>}

      <div className="action-row tool-window-actions">
        <button className="primary-button" type="button" disabled={busy} onClick={onExecute}>
          <Play size={17} />
          执行工具
        </button>
        <button className="secondary-button" type="button" disabled={busy || !repairAction} onClick={onRepair}>
          让 Hermes 修复
        </button>
      </div>
    </>
  );
}

function getToolWindowWriteScope(tool: UserTool, values: Record<string, unknown>, fallback: string) {
  try {
    return buildSubmitTaskInputFromToolParameters(tool, values).output_path;
  } catch {
    const pathParameter = tool.parameters.find((parameter) => parameter.type === 'path');
    return String(values[pathParameter?.key ?? ''] ?? fallback);
  }
}

export function getToolSourceLabel(source: UserTool['source']) {
  const labels: Record<UserTool['source'], string> = {
    hermes_captured: 'Hermes 沉淀',
    script: '脚本',
    dcc_plugin: 'DCC 插件',
    external_service: '外部服务',
    composed_workflow: '组合流程',
  };
  return labels[source];
}

export function getToolCategoryLabel(category: ToolCategory) {
  const labels: Record<ToolCategory, string> = {
    dcc_operation: 'DCC 操作',
    asset_processing: '资产处理',
    project_automation: '项目自动化',
    inspection_repair: '检查修复',
    workflow_assistant: '流程助手',
  };
  return labels[category];
}

export function getToolMaturityLabel(maturity: ToolMaturity) {
  const labels: Record<ToolMaturity, string> = {
    draft: '草稿',
    usable: '可用',
    stable: '稳定',
    verified: '已验证',
    team_recommended: '团队推荐',
  };
  return labels[maturity];
}
