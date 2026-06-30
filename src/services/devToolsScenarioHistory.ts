import type { ToolBridgeFailureScenario } from './toolBridgeProvider';

export type DevToolsScenarioKind =
  | 'tool_bridge_success'
  | 'approval_decision'
  | 'failure_scenario'
  | 'validation_failure';

export type DevToolsScenarioStatus = 'succeeded' | 'failed' | 'blocked';

export type DevToolsScenarioHistoryEntry = {
  created_at: string;
  detail: string;
  id: string;
  kind: DevToolsScenarioKind;
  payload?: {
    decision?: 'approved' | 'rejected';
    scenario?: ToolBridgeFailureScenario;
  };
  status: DevToolsScenarioStatus;
  title: string;
};

export const devToolsScenarioHistoryLimit = 8;

export function createDevToolsScenarioHistoryEntry(input: {
  detail: string;
  kind: DevToolsScenarioKind;
  payload?: DevToolsScenarioHistoryEntry['payload'];
  status: DevToolsScenarioStatus;
  title: string;
}, now = new Date()): DevToolsScenarioHistoryEntry {
  const createdAt = now.toISOString();
  return {
    ...input,
    created_at: createdAt,
    id: `devtools_scenario_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

export function prependDevToolsScenarioHistory(
  history: DevToolsScenarioHistoryEntry[],
  entry: DevToolsScenarioHistoryEntry,
) {
  return [entry, ...history].slice(0, devToolsScenarioHistoryLimit);
}
