import type { HermesConversationState } from './hermesConversation';
import type { Approval, AssetRecord, Connector, Task } from './mockRuntime';
import type { SubmitTaskInput } from './runtimeApi';

export type RuntimeToolBridgeResult = {
  approval?: Approval;
  asset?: AssetRecord;
  assetError?: string;
  connector?: Connector;
  connectorError?: string;
  task?: Task;
  taskCreateInput?: SubmitTaskInput;
  taskError?: string;
};

export type ApprovalToolBridgeResult = {
  approval?: Approval;
  decision: 'approved' | 'rejected';
  error?: string;
  task?: Task;
};

export type ToolBridgeFailureScenario = 'connector_unavailable' | 'task_create_failed' | 'approval_decide_failed';

export interface ToolBridgeProvider {
  readonly taskCreateInput: SubmitTaskInput;
  appendRuntimeResult(state: HermesConversationState, result: RuntimeToolBridgeResult): HermesConversationState;
  appendApprovalResult(state: HermesConversationState, result: ApprovalToolBridgeResult): HermesConversationState;
  appendFailureScenario(state: HermesConversationState, scenario: ToolBridgeFailureScenario): HermesConversationState;
  appendValidationFailureScenario(state: HermesConversationState): HermesConversationState;
  simulateExternalHermes(state: HermesConversationState): HermesConversationState;
}
