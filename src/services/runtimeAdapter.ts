import {
  approveRequest,
  capabilities,
  connector as initialConnector,
  disconnectConnector,
  reconnectConnector,
  rejectRequest,
  submitExportTask,
  type Approval,
  type CapabilityManifest,
  type Connector,
  type Task,
} from './mockRuntime';
import { createHermesAdapter } from './hermesAdapter';

export type SubmitTaskInput = {
  capability_id: string;
  output_path: string;
  overwrite: boolean;
};

export type SubmitTaskResult = {
  approval: Approval;
  task: Task;
};

export type ApprovalDecision = 'approved' | 'rejected';

export type ConnectorHealthResult = Connector;

export type RuntimeAdapter = {
  decideApproval: (approval: Approval, decision: ApprovalDecision) => Promise<Approval>;
  getConnectorHealth: () => Promise<ConnectorHealthResult>;
  listCapabilities: () => Promise<CapabilityManifest[]>;
  setConnectorConnected: (connector: Connector, connected: boolean) => Promise<Connector>;
  submitTask: (input: SubmitTaskInput) => Promise<SubmitTaskResult>;
};

export const mockRuntimeAdapter: RuntimeAdapter = {
  async decideApproval(approval, decision) {
    await delay(160);
    return decision === 'approved' ? approveRequest(approval) : rejectRequest(approval);
  },
  async getConnectorHealth() {
    await delay(120);
    return initialConnector;
  },
  async listCapabilities() {
    await delay(120);
    return capabilities;
  },
  async setConnectorConnected(connector, connected) {
    await delay(180);
    return connected ? reconnectConnector(connector) : disconnectConnector(connector);
  },
  async submitTask(input) {
    await delay(220);
    return submitExportTask(input);
  },
};

const hermesBaseUrl = import.meta.env.VITE_HERMES_BASE_URL as string | undefined;

export const runtimeAdapter = hermesBaseUrl
  ? createHermesAdapter({ baseUrl: hermesBaseUrl })
  : mockRuntimeAdapter;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
