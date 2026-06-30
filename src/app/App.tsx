import {
  Archive,
  Activity,
  ClipboardList,
  Database,
  FileText,
  GitBranch,
  Home,
  ListChecks,
  RefreshCw,
  Settings,
  ShieldAlert,
  TerminalSquare,
  Waypoints,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { SessionStrip } from '../components/SessionStrip';
import { type RuntimeRole } from '../services/mockRuntime';
import { ReviewApproval } from '../modules/approvals/ReviewApproval';
import { AuditPage } from '../modules/audit/AuditPage';
import { AssetDetail } from '../modules/assets/AssetDetail';
import { AssetRegistry } from '../modules/assets/AssetRegistry';
import { CapabilityRegistry } from '../modules/capabilities/CapabilityRegistry';
import { ConnectorPanel } from '../modules/connectors/ConnectorPanel';
import { Dashboard } from '../modules/dashboard/Dashboard';
import { DevToolsPanel } from '../modules/devtools/DevToolsPanel';
import { EvaluationDashboard } from '../modules/evaluation/EvaluationDashboard';
import { HermesWorkspace } from '../modules/hermes/HermesWorkspace';
import { PolicySettings } from '../modules/policy/PolicySettings';
import { StateMachinePage } from '../modules/stateMachine/StateMachinePage';
import { CreateTaskPanel } from '../modules/tasks/CreateTaskPanel';
import { TaskDetail } from '../modules/tasks/TaskDetail';
import { TaskList } from '../modules/tasks/TaskList';
import { ToolCenter } from '../modules/tool-center/ToolCenter';
import { WorkflowPage } from '../modules/workflow/WorkflowPage';
import { useRuntimeController } from '../services/runtimeController';
import { buildPersonalRuntimeView } from '../services/personalRuntime';
import { currentToolBridgeProviderMode } from '../services/toolBridgeProviderFactory';

type RouteKey =
  | 'personal'
  | 'hermes'
  | 'dashboard'
  | 'tasks'
  | 'taskDetail'
  | 'review'
  | 'asset'
  | 'assets'
  | 'connectors'
  | 'audit'
  | 'capabilities'
  | 'workflow'
  | 'evaluation'
  | 'settings'
  | 'stateMachine';

const navItems: Array<{ id: RouteKey; label: string; icon: typeof Home }> = [
  { id: 'personal', label: '工具中心', icon: Home },
  { id: 'hermes', label: 'Agent 活动', icon: Activity },
  { id: 'dashboard', label: '工作台', icon: Home },
  { id: 'tasks', label: '任务中心', icon: FileText },
  { id: 'taskDetail', label: '任务详情', icon: GitBranch },
  { id: 'workflow', label: '工作流', icon: GitBranch },
  { id: 'review', label: '审查审批', icon: ShieldAlert },
  { id: 'assets', label: '资产库', icon: Archive },
  { id: 'asset', label: '资产详情', icon: Archive },
  { id: 'connectors', label: '连接器', icon: TerminalSquare },
  { id: 'audit', label: '事件审计', icon: ClipboardList },
  { id: 'capabilities', label: '能力库', icon: Database },
  { id: 'evaluation', label: '评估验证', icon: ListChecks },
  { id: 'settings', label: '设置权限', icon: Settings },
  { id: 'stateMachine', label: '状态机', icon: Waypoints },
];

export function App() {
  const [route, setRoute] = useState<RouteKey>('personal');
  const [role, setRole] = useState<RuntimeRole>('admin');
  const [isTaskFormOpen, setTaskFormOpen] = useState(false);
  const [isDevToolsOpen, setDevToolsOpen] = useState(false);
  const runtime = useRuntimeController(role);
  const {
    approval,
    approvalError,
    capabilities,
    capabilityError,
    connector,
    connectorError,
    currentAsset,
    currentEvents,
    devToolsScenarioHistory,
    externalMayaConnectorSync,
    externalHttpToolBridgeSync,
    hermesConversation,
    isBusy,
    runtimeError,
    session,
    task,
    taskError,
    toast,
    actions,
  } = runtime;
  const personalView = useMemo(
    () =>
      buildPersonalRuntimeView({
        approval,
        asset: currentAsset,
        connector,
        connectorRepairSuggestion: externalMayaConnectorSync.lastRepairSuggestion,
        hermesConversation,
        runtimeError,
        task,
      }),
    [approval, connector, currentAsset, externalMayaConnectorSync.lastRepairSuggestion, hermesConversation, runtimeError, task],
  );

  async function createTask(input: Parameters<typeof actions.createTask>[0]) {
    const created = await actions.createTask(input);
    if (!created) return;
    setRoute('review');
    setTaskFormOpen(false);
  }

  function resetDemoSession() {
    if (actions.resetDemoSession()) {
      setRoute('personal');
    }
  }

  const pageTitle = route === 'personal' ? '跨 DCC 工具中心' : 'Agent 活动控制台';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CP</div>
          <div>
            <strong>Creative Runtime</strong>
            <span>Production Console</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={route === item.id ? 'nav-item active' : 'nav-item'}
                key={item.id}
                onClick={() => setRoute(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">MVP Tooling</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="刷新状态" title="刷新状态">
              <RefreshCw size={18} />
            </button>
            <button className="secondary-button" type="button" onClick={resetDemoSession}>
              重置会话
            </button>
            <button className="secondary-button" type="button" onClick={() => setDevToolsOpen(true)}>
              <TerminalSquare size={17} />
              开发工具
            </button>
          </div>
        </header>
        <div className="runtime-toast" role="status">
          {isBusy ? 'Runtime 正在处理请求...' : toast}
        </div>
        <SessionStrip session={session} task={task} connector={connector} runtimeError={runtimeError} />

        {route === 'personal' && (
          <ToolCenter
            busy={isBusy}
            onConfirmRun={() => actions.simulateExternalApprovalDecision('approved')}
            onOpenAdvanced={() => setRoute('hermes')}
            onRepair={actions.recoverTask}
            onRequestHermesRun={actions.simulateExternalToolBridgeWithInput}
            onRejectRun={() => actions.simulateExternalApprovalDecision('rejected')}
            view={personalView}
          />
        )}
        {route === 'hermes' && (
          <HermesWorkspace
            conversation={hermesConversation.conversation}
            externalHttpToolBridgeSync={externalHttpToolBridgeSync}
            messages={hermesConversation.messages}
            onSimulateExternalApprovalDecision={actions.simulateExternalApprovalDecision}
            onSimulateExternalToolBridge={actions.simulateExternalToolBridge}
            onSimulateExternalToolBridgeFailure={actions.simulateExternalToolBridgeFailure}
            onTransitionSkillCandidate={actions.transitionCurrentSkillCandidate}
            onTransitionSkillCandidateViaToolBridge={actions.transitionCurrentSkillCandidateViaToolBridge}
            skillCandidate={hermesConversation.skillCandidate}
            toolCalls={hermesConversation.toolCalls}
          />
        )}
        {route === 'dashboard' && (
          <Dashboard
            approval={approval}
            connectorState={connector.status}
            onOpenReview={() => setRoute('review')}
            onSubmitTask={() => setTaskFormOpen(true)}
            task={task}
          />
        )}
        {route === 'tasks' && <TaskList onOpenTask={() => setRoute('taskDetail')} task={task} />}
        {route === 'taskDetail' && (
          <TaskDetail
            connector={connector}
            events={currentEvents}
            onComplete={actions.completeRun}
            onRecover={actions.recoverTask}
            onSimulateFailure={actions.simulateFailure}
            runtimeError={runtimeError}
            task={task}
          />
        )}
        {route === 'workflow' && (
          <WorkflowPage
            approval={approval}
            connector={connector}
            runtimeError={runtimeError}
            task={task}
          />
        )}
        {route === 'review' && (
          <ReviewApproval
            approval={approval}
            approvalError={approvalError}
            connector={connector}
            events={currentEvents}
            onDecision={actions.decideApproval}
            role={role}
            task={task}
          />
        )}
        {route === 'asset' && <AssetDetail asset={currentAsset} events={currentEvents} task={task} />}
        {route === 'assets' && (
          <AssetRegistry
            asset={currentAsset}
            events={currentEvents}
            onSelectAsset={() => setRoute('asset')}
            onUpdateAsset={actions.setCurrentAsset}
            role={role}
            setToast={actions.setToast}
            task={task}
          />
        )}
        {route === 'connectors' && (
          <ConnectorPanel
            busy={isBusy}
            connector={connector}
            connectorError={connectorError}
            onRefreshConnector={actions.refreshConnectorHealth}
            onToggleConnector={actions.toggleConnector}
          />
        )}
        {route === 'audit' && (
          <AuditPage
            conversation={hermesConversation.conversation}
            events={currentEvents}
            messages={hermesConversation.messages}
            toolCalls={hermesConversation.toolCalls}
          />
        )}
        {route === 'capabilities' && (
          <CapabilityRegistry
            busy={isBusy}
            capabilities={capabilities}
            capabilityError={capabilityError}
            connector={connector}
            onCreateTask={() => setTaskFormOpen(true)}
            onRefreshCapabilities={actions.refreshCapabilities}
          />
        )}
        {route === 'evaluation' && (
          <EvaluationDashboard approval={approval} connector={connector} runtimeError={runtimeError} task={task} />
        )}
        {route === 'settings' && <PolicySettings role={role} onRoleChange={setRole} />}
        {route === 'stateMachine' && <StateMachinePage role={role} task={task} />}
        {isTaskFormOpen && (
          <CreateTaskPanel
            busy={isBusy}
            capabilities={capabilities}
            capabilityError={capabilityError}
            connector={connector}
            onClose={() => setTaskFormOpen(false)}
            onSubmit={createTask}
            taskError={taskError}
          />
        )}
        {isDevToolsOpen && (
          <DevToolsPanel
            approvalStatus={approval.status}
            busy={isBusy}
            connectorStatus={connector.status}
            conversationStatus={hermesConversation.conversation.status}
            externalMayaConnectorSync={externalMayaConnectorSync}
            externalHttpToolBridgeSync={externalHttpToolBridgeSync}
            history={devToolsScenarioHistory}
            onClose={() => setDevToolsOpen(false)}
            onOpenReview={() => {
              setRoute('review');
              setDevToolsOpen(false);
            }}
            onReplayScenario={actions.replayDevToolsScenario}
            onSimulateApprovalDecision={actions.simulateExternalApprovalDecision}
            onSimulateToolBridgeFailure={actions.simulateExternalToolBridgeFailure}
            onSimulateToolBridgeValidationFailure={actions.simulateExternalToolBridgeValidationFailure}
            onSimulateToolBridge={actions.simulateExternalToolBridge}
            providerMode={currentToolBridgeProviderMode}
            onSubmitDebugTask={() => {
              setTaskFormOpen(true);
              setDevToolsOpen(false);
            }}
            taskStatus={task.status}
          />
        )}
      </main>
    </div>
  );
}
