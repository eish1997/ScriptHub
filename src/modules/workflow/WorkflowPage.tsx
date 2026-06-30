import { useState } from 'react';
import { ManifestBlock, RiskBadge, StatusBadge } from '../../components/common';
import {
  workflowEdges,
  workflowNodes,
  type Approval,
  type Connector,
  type RuntimeError,
  type Task,
  type WorkflowNode,
} from '../../services/mockRuntime';

type WorkflowNodeState = 'planned' | 'pending' | 'running' | 'failed' | 'succeeded' | 'blocked' | 'idle';

export function WorkflowPage({
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
  const [selectedNode, setSelectedNode] = useState<WorkflowNode>(workflowNodes[0]);
  const nodeStates = workflowNodes.reduce<Record<string, WorkflowNodeState>>((acc, node) => {
    acc[node.id] = getWorkflowNodeState(node, task, approval, connector, runtimeError);
    return acc;
  }, {});
  const failedNode = workflowNodes.find((node) => nodeStates[node.id] === 'failed');
  const recoveryEdges = workflowEdges.filter((edge) => edge.kind === 'recovery');

  return (
    <div className="workflow-layout">
      <section className="panel workflow-main">
        <div className="section-title">
          <div>
            <p className="eyebrow">Workflow Graph</p>
            <h2>MVP FBX 导出工作流</h2>
          </div>
          <StatusBadge value={task.status} />
        </div>
        {connector.status !== 'connected' && (
          <div className="blocking-banner">Connector 不可用，执行节点会保持 blocked。</div>
        )}
        <div className="workflow-graph" aria-label="FBX export workflow">
          {workflowNodes.map((node, index) => (
            <div className="workflow-step" key={node.id}>
              <button
                className={
                  selectedNode.id === node.id
                    ? `workflow-node ${nodeStates[node.id]} active`
                    : `workflow-node ${nodeStates[node.id]}`
                }
                onClick={() => setSelectedNode(node)}
                type="button"
              >
                <span className="node-kind">{node.kind}</span>
                <strong>{node.label}</strong>
                <StatusBadge value={nodeStates[node.id]} />
              </button>
              {index < workflowNodes.length - 1 && <span className="workflow-arrow">-&gt;</span>}
            </div>
          ))}
        </div>
        <div className="edge-list">
          {workflowEdges.map((edge) => (
            <div className={`edge-chip ${edge.kind}`} key={`${edge.from}-${edge.to}-${edge.label}`}>
              <span>{edge.from}</span>
              <strong>{edge.label}</strong>
              <span>{edge.to}</span>
            </div>
          ))}
        </div>
        {runtimeError && failedNode && (
          <div className="error-card">
            <div className="section-title compact">
              <div>
                <p className="eyebrow">Failure Path</p>
                <h2>{failedNode.label}</h2>
              </div>
              <StatusBadge value="failed" />
            </div>
            <p>{runtimeError.message}</p>
            <div className="edge-list">
              {recoveryEdges.map((edge) => (
                <div className="edge-chip recovery" key={`${edge.from}-${edge.to}-${edge.label}`}>
                  <span>{edge.from}</span>
                  <strong>{edge.label}</strong>
                  <span>{edge.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="panel workflow-detail">
        <div className="section-title compact">
          <h2>{selectedNode.label}</h2>
          <StatusBadge value={nodeStates[selectedNode.id]} />
        </div>
        <dl className="inspector-list">
          <div>
            <dt>类型</dt>
            <dd>{selectedNode.kind}</dd>
          </div>
          <div>
            <dt>能力</dt>
            <dd>{selectedNode.capability_id ?? 'runtime.control'}</dd>
          </div>
          <div>
            <dt>风险</dt>
            <dd>
              <RiskBadge value={selectedNode.risk_level} />
            </dd>
          </div>
          <div>
            <dt>审批</dt>
            <dd>{selectedNode.requires_confirmation ? '需要' : '不需要'}</dd>
          </div>
          <div>
            <dt>失败策略</dt>
            <dd>{selectedNode.failure_policy}</dd>
          </div>
        </dl>
        <ManifestBlock title="Inputs" values={selectedNode.inputs} />
        <ManifestBlock title="Outputs" values={selectedNode.outputs} />
      </aside>
    </div>
  );
}

function getWorkflowNodeState(
  node: WorkflowNode,
  task: Task,
  approval: Approval,
  connector: Connector,
  runtimeError?: RuntimeError,
): WorkflowNodeState {
  if (connector.status !== 'connected' && ['selection', 'export'].includes(node.id)) {
    return 'blocked';
  }
  if (runtimeError) {
    if (runtimeError.type === 'validation_error' && node.id === 'selection') return 'failed';
    if (runtimeError.type === 'conflict_error' && node.id === 'path_check') return 'failed';
    if (['timeout_error', 'incomplete_result'].includes(runtimeError.type) && node.id === 'export') return 'failed';
  }
  if (task.status === 'succeeded') {
    return 'succeeded';
  }
  if (task.status === 'canceled') {
    return node.id === 'approval' ? 'failed' : 'idle';
  }
  if (node.id === 'start') return 'succeeded';
  if (node.id === 'selection') return 'succeeded';
  if (node.id === 'path_check') return task.status === 'planned' ? 'running' : 'succeeded';
  if (node.id === 'approval') {
    if (approval.status === 'pending') return 'pending';
    if (approval.status === 'approved') return 'succeeded';
    if (approval.status === 'rejected') return 'failed';
  }
  if (node.id === 'export') {
    if (task.status === 'running') return 'running';
    if (task.status === 'failed') return 'failed';
    return approval.status === 'approved' ? 'planned' : 'idle';
  }
  if (node.id === 'asset') return task.status === 'running' ? 'planned' : 'idle';
  if (node.id === 'end') return 'idle';
  return 'idle';
}
