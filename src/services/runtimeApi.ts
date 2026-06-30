import { runtimeAdapter, type SubmitTaskInput } from './runtimeAdapter';
import { type Approval, type Connector } from './mockRuntime';

export type { SubmitTaskInput } from './runtimeAdapter';

export async function submitTask(input: SubmitTaskInput) {
  return runtimeAdapter.submitTask(input);
}

export async function decideApproval(approval: Approval, decision: 'approved' | 'rejected') {
  return runtimeAdapter.decideApproval(approval, decision);
}

export async function getConnectorHealth() {
  return runtimeAdapter.getConnectorHealth();
}

export async function listCapabilities() {
  return runtimeAdapter.listCapabilities();
}

export async function setConnectorConnected(connector: Connector, connected: boolean) {
  return runtimeAdapter.setConnectorConnected(connector, connected);
}
