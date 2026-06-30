import {
  AlertTriangle,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  FileArchive,
  Filter,
  History,
  Layers3,
  Play,
  RefreshCw,
  ShieldCheck,
  Workflow,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { RiskBadge, StatusBadge } from '../../components/common';
import {
  getToolCategoryLabel,
  getToolMaturityLabel,
  getToolSourceLabel,
  ToolFloatingWindowContent,
} from '../tool-floating-window/ToolFloatingWindowContent';
import type { RecoveryAction } from '../../services/runtimeController';
import {
  buildSubmitTaskInputFromToolParameters,
  getDefaultToolParameterValues,
  type PersonalRuntimeView,
  type ToolCategory,
  type ToolMaturity,
  type ToolRuntime,
  type UserTool,
} from '../../services/personalRuntime';
import type { SubmitTaskInput } from '../../services/runtimeApi';
import { toolWindowBridge } from '../../services/toolWindowBridge';

type ToolCenterProps = {
  busy: boolean;
  onConfirmRun: () => void;
  onOpenAdvanced: () => void;
  onRepair: (action: RecoveryAction) => void;
  onRequestHermesRun: (input: SubmitTaskInput) => void;
  onRejectRun: () => void;
  view: PersonalRuntimeView;
};

export function ToolCenter({
  busy,
  onConfirmRun,
  onOpenAdvanced,
  onRepair,
  onRequestHermesRun,
  onRejectRun,
  view,
}: ToolCenterProps) {
  const waitingConfirmation = view.safetyPreview.confirmationStatus === 'pending';
  const [categoryFilter, setCategoryFilter] = useState<'all' | ToolCategory>('all');
  const [maturityFilter, setMaturityFilter] = useState<'all' | ToolMaturity>('all');
  const [runtimeFilter, setRuntimeFilter] = useState<'all' | Extract<ToolRuntime, 'maya' | 'blender' | 'unreal'>>('all');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>();
  const [selectedTool, setSelectedTool] = useState<UserTool | undefined>();
  const [toolParameterValues, setToolParameterValues] = useState<Record<string, unknown>>({});
  const [toolWindowError, setToolWindowError] = useState('');
  const [outputPath, setOutputPath] = useState(view.safetyPreview.writeScope);
  const [overwrite, setOverwrite] = useState(view.safetyPreview.overwriteLabel.includes('允许覆盖'));
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setOutputPath(view.safetyPreview.writeScope);
    setOverwrite(view.safetyPreview.overwriteLabel.includes('允许覆盖'));
    setFormError('');
  }, [view.safetyPreview.writeScope, view.safetyPreview.overwriteLabel]);

  function requestRun() {
    const trimmedPath = outputPath.trim();
    if (!trimmedPath) {
      setFormError('需要提供输出路径。');
      return;
    }
    if (!trimmedPath.endsWith('.fbx')) {
      setFormError('输出路径必须以 .fbx 结尾。');
      return;
    }
    setFormError('');
    onRequestHermesRun({
      capability_id: 'maya.export_fbx.v1',
      output_path: trimmedPath,
      overwrite,
    });
  }

  async function openToolFloatingWindow(tool: UserTool) {
    await toolWindowBridge.openToolWindow({
      tool_id: tool.id,
      always_on_top: true,
      focus: true,
    });
    setSelectedTool(tool);
    setToolParameterValues(getDefaultToolParameterValues(tool));
    setToolWindowError('');
  }

  async function closeToolFloatingWindow() {
    if (selectedTool) {
      await toolWindowBridge.closeToolWindow(selectedTool.id);
    }
    setSelectedTool(undefined);
    setToolParameterValues({});
    setToolWindowError('');
  }

  function updateToolParameter(key: string, value: unknown) {
    setToolParameterValues((current) => ({
      ...current,
      [key]: value,
    }));
    setToolWindowError('');
  }

  function executeSelectedTool() {
    if (!selectedTool) return;
    try {
      const input = buildSubmitTaskInputFromToolParameters(selectedTool, toolParameterValues);
      setToolWindowError('');
      onRequestHermesRun(input);
    } catch (error) {
      setToolWindowError(error instanceof Error ? error.message : '工具参数不完整。');
    }
  }

  function requestHermesRepairFromWindow() {
    const repairAction = getPreferredRepairAction(view.repairActions);
    if (!repairAction) {
      setToolWindowError('当前没有需要 Hermes 修复的失败状态。');
      return;
    }
    setToolWindowError('');
    onRepair(repairAction.id);
  }

  function replaySelectedHistoryRun() {
    if (!selectedHistoryDetail) return;
    onRequestHermesRun(selectedHistoryDetail.replayInput);
  }

  const visibleTools = view.tools.filter((tool) => {
    const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
    const matchesRuntime = runtimeFilter === 'all' || tool.runtime === runtimeFilter;
    const matchesMaturity = maturityFilter === 'all' || tool.maturity === maturityFilter;
    return matchesCategory && matchesRuntime && matchesMaturity;
  });
  const preferredRepairAction = getPreferredRepairAction(view.repairActions);
  const selectedHistoryDetail = selectedHistoryId ? view.historyDetails[selectedHistoryId] : undefined;

  return (
    <div className="personal-layout">
      <section className="panel personal-main">
        <div className="section-title">
          <div>
            <p className="eyebrow">Tool Center</p>
            <h2>工具中心</h2>
          </div>
          <button className="secondary-button" type="button" onClick={onOpenAdvanced}>
            <Bot size={17} />
            高级活动
          </button>
        </div>

        <div className="tool-center-filter" aria-label="工具筛选">
          <div className="tool-filter-group">
            <Filter size={17} />
            <span>能力分类</span>
            {[
              ['all', '全部分类'],
              ['dcc_operation', 'DCC 操作'],
              ['asset_processing', '资产处理'],
              ['project_automation', '项目自动化'],
              ['inspection_repair', '检查修复'],
              ['workflow_assistant', '流程助手'],
            ].map(([id, label]) => (
              <button
                className={categoryFilter === id ? 'filter-button active' : 'filter-button'}
                key={id}
                onClick={() => setCategoryFilter(id as typeof categoryFilter)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="tool-filter-group">
            <span>运行环境</span>
            {[
              ['all', '全部 DCC'],
              ['maya', 'Maya'],
              ['blender', 'Blender'],
              ['unreal', 'Unreal'],
            ].map(([id, label]) => (
              <button
                className={runtimeFilter === id ? 'filter-button active' : 'filter-button'}
                key={id}
                onClick={() => setRuntimeFilter(id as typeof runtimeFilter)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="tool-filter-group">
            <span>成熟度</span>
            {[
              ['all', '全部等级'],
              ['draft', '草稿'],
              ['usable', '可用'],
              ['stable', '稳定'],
              ['verified', '已验证'],
              ['team_recommended', '团队推荐'],
            ].map(([id, label]) => (
              <button
                className={maturityFilter === id ? 'filter-button active' : 'filter-button'}
                key={id}
                onClick={() => setMaturityFilter(id as typeof maturityFilter)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="tool-card-grid">
          {visibleTools.map((tool) => (
            <article className={`tool-card ${tool.source}`} key={tool.id}>
              <div className="tool-card-icon">
                <Layers3 size={20} />
              </div>
              <div>
                <div className="tool-card-head">
                  <strong>{tool.name}</strong>
                  <span className={`tool-source ${tool.source}`}>
                    {getToolSourceLabel(tool.source)}
                  </span>
                </div>
                <p>{tool.description}</p>
                <div className="tool-card-meta">
                  <span>{getToolCategoryLabel(tool.category)}</span>
                  <span className={`tool-maturity ${tool.maturity}`}>{getToolMaturityLabel(tool.maturity)}</span>
                  <span>{tool.runtime.toUpperCase()}</span>
                  <span>{tool.parameters.length} 个参数</span>
                  <span>{tool.runs.length} 次运行</span>
                </div>
                <button className="secondary-button" type="button" onClick={() => openToolFloatingWindow(tool)}>
                  打开工具小窗
                </button>
              </div>
            </article>
          ))}
          {visibleTools.length === 0 && (
            <div className="tool-empty-state">
              当前筛选下还没有工具。
            </div>
          )}
        </div>

        <div className="personal-section">
          <div className="section-title compact">
            <h2>运行历史</h2>
            <History size={20} />
          </div>

        <div className="operation-list">
          {view.history.map((item) => (
            <article className={`operation-card ${item.status}`} key={item.id}>
              <div className="operation-icon">
                <History size={20} />
              </div>
              <div>
                <div className="operation-head">
                  <strong>{item.title}</strong>
                  <StatusBadge value={item.status} />
                </div>
                <p>{item.summary}</p>
                <div className="operation-meta">
                  <span>{item.source}</span>
                  <code>{item.traceId}</code>
                </div>
                <button className="secondary-button compact-button" type="button" onClick={() => setSelectedHistoryId(item.id)}>
                  查看详情
                </button>
              </div>
            </article>
          ))}
        </div>
        </div>

        <div className="personal-section">
          <div className="section-title compact">
            <h2>Hermes 工具</h2>
            <RiskBadge value={view.hermesTool.riskLevel} />
          </div>
          <div className="hermes-tool-card">
            <div>
              <strong>{view.hermesTool.name}</strong>
              <p>{view.hermesTool.summary}</p>
              <div className="tool-trigger-list">
                {view.hermesTool.triggerExamples.map((example) => (
                  <span key={example}>{example}</span>
                ))}
              </div>
            </div>
            <button className="primary-button" type="button" disabled={busy} onClick={requestRun}>
              <Play size={17} />
              执行 Hermes 工具
            </button>
          </div>
        </div>

        <div className="personal-section">
          <div className="section-title compact">
            <h2>工具详情</h2>
            <BookOpenCheck size={20} />
          </div>
          <div className="tool-detail-card">
            <div className="tool-validation">
              <Workflow size={20} />
              <div>
                <strong>{view.toolDetail.title}</strong>
                <p>{view.toolDetail.validation.summary}</p>
              </div>
              <StatusBadge value={view.toolDetail.validation.status} />
            </div>

            <div className="tool-detail-grid">
              <div>
                <span>触发方式</span>
                <ul>
                  {view.toolDetail.triggerExamples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span>参数模板</span>
                <dl>
                  {view.toolDetail.parameterTemplate.map((parameter) => (
                    <div key={`${parameter.name}-${parameter.value}`}>
                      <dt>{parameter.name}</dt>
                      <dd>{parameter.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <span>工具链</span>
                <ul>
                  {view.toolDetail.toolChain.map((tool) => (
                    <li key={tool}>{tool}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span>失败处理</span>
                <ul>
                  {view.toolDetail.failureHandling.map((handling) => (
                    <li key={handling}>{handling}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {view.repairActions.length > 0 && (
          <div className="personal-section">
            <div className="section-title compact">
              <h2>错误修复</h2>
              <AlertTriangle size={20} />
            </div>
            <div className="repair-list">
              {view.repairActions.map((action) => (
                <button
                  className={action.recommended ? 'repair-action recommended' : 'repair-action'}
                  key={action.id}
                  type="button"
                  onClick={() => onRepair(action.id)}
                >
                  <Wrench size={17} />
                  <span>
                    <strong>{action.label}</strong>
                    <small>{action.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="personal-side">
        <section className="panel safety-panel">
          <div className="section-title compact">
            <h2>安全确认</h2>
            <ShieldCheck size={20} />
          </div>
          <div className="safety-grid">
            <div>
              <span>会读取</span>
              <strong>{view.safetyPreview.readScope}</strong>
            </div>
            <div>
              <span>会写入</span>
              <input
                aria-label="工具输出路径"
                value={outputPath}
                onChange={(event) => setOutputPath(event.target.value)}
              />
            </div>
            <div>
              <span>覆盖策略</span>
              <label className="safety-checkbox">
                <input
                  checked={overwrite}
                  onChange={(event) => setOverwrite(event.target.checked)}
                  type="checkbox"
                />
                <strong>{overwrite ? '允许覆盖同名文件' : '不会覆盖同名文件'}</strong>
              </label>
            </div>
            <div>
              <span>所需权限</span>
              <strong>{view.safetyPreview.permissionSummary}</strong>
            </div>
          </div>
          {view.safetyPreview.blockedReason && (
            <p className="safety-warning">{view.safetyPreview.blockedReason}</p>
          )}
          {formError && <p className="form-error">{formError}</p>}
          <div className="safety-actions">
            <button className="primary-button" type="button" disabled={busy || !waitingConfirmation} onClick={onConfirmRun}>
              <CheckCircle2 size={17} />
              确认执行
            </button>
            <button className="secondary-button" type="button" disabled={busy || !waitingConfirmation} onClick={onRejectRun}>
              拒绝
            </button>
          </div>
        </section>

        <section className="panel artifact-panel">
          <div className="section-title compact">
            <h2>最近产物</h2>
            <FileArchive size={20} />
          </div>
          <div className="artifact-summary-card">
            <strong>{view.artifact.name}</strong>
            <StatusBadge value={view.artifact.status} />
            <dl>
              <div>
                <dt>位置</dt>
                <dd>{view.artifact.storageUri}</dd>
              </div>
              <div>
                <dt>来源</dt>
                <dd>{view.artifact.sourceUri}</dd>
              </div>
              <div>
                <dt>Trace</dt>
                <dd>{view.artifact.traceId}</dd>
              </div>
            </dl>
          </div>
        </section>

        <button className="secondary-button full" type="button" onClick={requestRun} disabled={busy}>
          <RefreshCw size={17} />
          模拟 Hermes 完成一次工具运行
        </button>
      </aside>

      {selectedTool && (
        <div className="drawer-backdrop">
          <aside className="drawer tool-floating-window" aria-label={`${selectedTool.name} 工具小窗`}>
            <ToolFloatingWindowContent
              artifact={view.artifact}
              busy={busy}
              error={toolWindowError}
              onClose={closeToolFloatingWindow}
              onExecute={executeSelectedTool}
              onParameterChange={updateToolParameter}
              onRepair={requestHermesRepairFromWindow}
              parameterValues={toolParameterValues}
              repairAction={preferredRepairAction}
              repairSuggestion={view.repairSuggestion}
              safetyPreview={view.safetyPreview}
              tool={selectedTool}
            />
          </aside>
        </div>
      )}

      {selectedHistoryDetail && (
        <div className="drawer-backdrop">
          <aside className="drawer run-history-drawer" aria-label={`${selectedHistoryDetail.title} 运行详情`}>
            <div className="section-title">
              <div>
                <p className="eyebrow">Run History</p>
                <h2>{selectedHistoryDetail.title}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setSelectedHistoryId(undefined)}
                aria-label="关闭运行详情"
              >
                ×
              </button>
            </div>

            <div className="tool-window-summary">
              <StatusBadge value={selectedHistoryDetail.status} />
              <span>{selectedHistoryDetail.source}</span>
              <code>{selectedHistoryDetail.traceId}</code>
            </div>

            <div className="run-history-replay">
              <div>
                <strong>回放前确认</strong>
                <span>确认以下差异后，使用这条历史记录中的能力、输出路径和覆盖策略重新发起执行。</span>
              </div>
              <button className="primary-button" type="button" disabled={busy} onClick={replaySelectedHistoryRun}>
                <RefreshCw size={17} />
                确认并再次运行
              </button>
            </div>

            <div className="run-history-check-list">
              {selectedHistoryDetail.replayChecks.map((check) => (
                <article className={`run-history-check ${check.severity}`} key={check.id}>
                  <strong>{check.title}</strong>
                  <p>{check.detail}</p>
                </article>
              ))}
            </div>

            <section className="tool-window-section">
              <h3>读写范围</h3>
              <div className="safety-grid">
                <div>
                  <span>会读取</span>
                  <strong>{selectedHistoryDetail.readScope}</strong>
                </div>
                <div>
                  <span>会写入</span>
                  <strong>{selectedHistoryDetail.writeScope}</strong>
                </div>
                <div>
                  <span>覆盖策略</span>
                  <strong>{selectedHistoryDetail.overwriteLabel}</strong>
                </div>
                <div>
                  <span>确认状态</span>
                  <strong>{selectedHistoryDetail.confirmationStatus}</strong>
                </div>
              </div>
            </section>

            <section className="tool-window-section">
              <h3>参数</h3>
              <dl className="run-history-detail-list">
                {selectedHistoryDetail.parameters.map((parameter) => (
                  <div key={`${parameter.name}-${parameter.value}`}>
                    <dt>{parameter.name}</dt>
                    <dd>{parameter.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="tool-window-section">
              <h3>产物</h3>
              <div className="artifact-summary-card">
                <strong>{selectedHistoryDetail.artifact.name}</strong>
                <StatusBadge value={selectedHistoryDetail.artifact.status} />
                <dl>
                  <div>
                    <dt>位置</dt>
                    <dd>{selectedHistoryDetail.artifact.storageUri}</dd>
                  </div>
                  <div>
                    <dt>来源</dt>
                    <dd>{selectedHistoryDetail.artifact.sourceUri}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="tool-window-section">
              <h3>Hermes 修复</h3>
              {selectedHistoryDetail.repairSuggestion && (
                <div className="connector-repair-suggestion">
                  <strong>{selectedHistoryDetail.repairSuggestion.summary}</strong>
                  <p>{selectedHistoryDetail.repairSuggestion.userMessage}</p>
                  <div className="connector-repair-meta">
                    <span>{selectedHistoryDetail.repairSuggestion.requiresUserInput ? '需要用户确认' : 'Hermes 可先处理'}</span>
                    <span>{selectedHistoryDetail.repairSuggestion.canRetry ? '可重试' : '先修复再执行'}</span>
                    <code>{selectedHistoryDetail.repairSuggestion.recommendedAction}</code>
                  </div>
                  <ul className="connector-repair-steps">
                    {selectedHistoryDetail.repairSuggestion.hermesActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="repair-list">
                {selectedHistoryDetail.repairs.map((repair) => (
                  <div className="repair-action" key={repair.id}>
                    <Wrench size={17} />
                    <span>
                      <strong>{repair.title}</strong>
                      <small>{repair.detail}</small>
                    </span>
                    <StatusBadge value={repair.result} />
                  </div>
                ))}
              </div>
            </section>

            <section className="tool-window-section">
              <h3>时间线</h3>
              <div className="run-history-timeline">
                {selectedHistoryDetail.timeline.map((event) => (
                  <div key={`${event.label}-${event.time}`}>
                    <span>{formatHistoryTime(event.time)}</span>
                    <strong>{event.label}</strong>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function getPreferredRepairAction(actions: PersonalRuntimeView['repairActions']) {
  return actions.find((action) => action.recommended) ?? actions[0];
}

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}
