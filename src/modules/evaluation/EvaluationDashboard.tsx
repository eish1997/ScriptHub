import { Activity, AlertTriangle, CheckCircle2, ListChecks, ShieldAlert, TerminalSquare } from 'lucide-react';
import { Metric, StatusBadge } from '../../components/common';
import {
  evaluationCases,
  qualityGates,
  type Approval,
  type Connector,
  type RuntimeError,
  type Task,
} from '../../services/mockRuntime';

export function EvaluationDashboard({
  approval,
  connector,
  runtimeError,
  task,
}: {
  approval: Approval;
  connector: Connector;
  runtimeError?: RuntimeError;
  task: Task;
}) {
  const total = evaluationCases.length;
  const passed = evaluationCases.filter((item) => item.status === 'passed').length;
  const failed = evaluationCases.filter((item) => item.status === 'failed').length;
  const needsReview = evaluationCases.filter((item) => item.status === 'needs_review').length;
  const blocked = evaluationCases.filter((item) => item.status === 'blocked').length;
  const successRate = Math.round((passed / total) * 100);
  const interventionRate = Math.round(((needsReview + blocked) / total) * 100);
  const regressionRate = Math.round(((passed + needsReview) / total) * 100);

  return (
    <div className="evaluation-layout">
      <section className="panel evaluation-main">
        <div className="section-title">
          <div>
            <p className="eyebrow">Evaluation</p>
            <h2>测试与验证</h2>
          </div>
          <StatusBadge value={qualityGates.every((gate) => gate.passed) ? 'passed' : 'failed'} />
        </div>
        <div className="evaluation-metrics">
          <Metric icon={CheckCircle2} label="成功率" value={`${successRate}%`} tone="success" />
          <Metric icon={AlertTriangle} label="失败率" value={`${Math.round((failed / total) * 100)}%`} tone="warn" />
          <Metric icon={ShieldAlert} label="人工介入率" value={`${interventionRate}%`} tone="warn" />
          <Metric
            icon={TerminalSquare}
            label="Connector"
            value={connector.health.state}
            tone={connector.status === 'connected' ? 'success' : 'warn'}
          />
          <Metric icon={ListChecks} label="回归通过率" value={`${regressionRate}%`} tone="info" />
        </div>
        <div className="case-list">
          {evaluationCases.map((testCase) => (
            <div className="case-row" key={testCase.id}>
              <div>
                <strong>{testCase.name}</strong>
                <span>{testCase.scenario}</span>
              </div>
              <EvaluationBadge value={testCase.status} />
              <span>{testCase.linked_capability}</span>
              <span>{testCase.observed}</span>
            </div>
          ))}
        </div>
      </section>

      <aside className="panel evaluation-side">
        <div className="section-title compact">
          <h2>质量门槛</h2>
          <ListChecks size={18} />
        </div>
        <div className="gate-list">
          {qualityGates.map((gate) => (
            <div className={gate.passed ? 'gate-row passed' : 'gate-row failed'} key={gate.id}>
              <StatusBadge value={gate.passed ? 'passed' : 'failed'} />
              <div>
                <strong>{gate.label}</strong>
                <span>{gate.evidence}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="section-title compact evaluation-current">
          <h2>当前运行态</h2>
          <Activity size={18} />
        </div>
        <dl className="inspector-list">
          <div>
            <dt>Task</dt>
            <dd><StatusBadge value={task.status} /></dd>
          </div>
          <div>
            <dt>Approval</dt>
            <dd><StatusBadge value={approval.status} /></dd>
          </div>
          <div>
            <dt>Connector</dt>
            <dd><StatusBadge value={connector.status} /></dd>
          </div>
          <div>
            <dt>Error</dt>
            <dd>{runtimeError?.code ?? 'none'}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function EvaluationBadge({ value }: { value: string }) {
  return <span className={`evaluation-badge ${value}`}>{value.replace('_', ' ')}</span>;
}
