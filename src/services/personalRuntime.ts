import type { Approval, AssetRecord, Connector, RuntimeError, Task } from './mockRuntime';
import type { HermesConversationState, SkillCandidate, ToolCallRecord } from './hermesConversation';
import { getMayaConnectorRepairSuggestion, type MayaConnectorRepairSuggestion } from './mayaConnectorRepair';
import type { RecoveryAction } from './runtimeController';
import type { SubmitTaskInput } from './runtimeApi';

export type OperationHistoryItem = {
  id: string;
  title: string;
  summary: string;
  status: 'waiting_confirmation' | 'running' | 'succeeded' | 'failed' | 'ready';
  source: string;
  traceId: string;
  updatedAt: string;
};

export type OperationHistoryDetail = {
  id: string;
  title: string;
  status: OperationHistoryItem['status'];
  source: string;
  traceId: string;
  readScope: string;
  writeScope: string;
  overwriteLabel: string;
  confirmationStatus: Approval['status'];
  parameters: Array<{
    name: string;
    value: string;
  }>;
  replayInput: SubmitTaskInput;
  replayChecks: Array<{
    id: string;
    severity: 'info' | 'warning';
    title: string;
    detail: string;
  }>;
  artifact: ArtifactSummary;
  repairs: Array<{
    id: string;
    title: string;
    detail: string;
    result: HermesRepair['result'] | 'not_needed';
  }>;
  repairSuggestion?: MayaConnectorRepairSuggestion;
  timeline: Array<{
    label: string;
    time: string;
  }>;
};

export type ToolSource = 'hermes_captured' | 'script' | 'dcc_plugin' | 'external_service' | 'composed_workflow';
export type ToolRuntime = 'maya' | 'blender' | 'unreal' | 'filesystem' | 'multi_app';
export type ToolCategory = 'dcc_operation' | 'asset_processing' | 'project_automation' | 'inspection_repair' | 'workflow_assistant';
export type ToolMaturity = 'draft' | 'usable' | 'stable' | 'verified' | 'team_recommended';

export type ToolParameter = {
  key: string;
  label: string;
  type: 'string' | 'boolean' | 'number' | 'enum' | 'path';
  defaultValue: unknown;
  required: boolean;
  safetyNote?: string;
};

export type ToolRun = {
  id: string;
  status: OperationHistoryItem['status'];
  parameters: Record<string, unknown>;
  artifactIds: string[];
  traceId: string;
  createdAt: string;
};

export type HermesRepair = {
  id: string;
  problem: string;
  hermesAction: string;
  result: 'fixed' | 'needs_user' | 'failed';
  toolChange?: string;
};

export type ToolVersion = {
  version: string;
  changes: string[];
  createdAt: string;
};

export type ScriptToolManifest = {
  id: string;
  runtime: Exclude<ToolRuntime, 'multi_app'>;
  entrypoint: string;
  language: 'python' | 'mel' | 'blueprint' | 'javascript' | 'shell';
  installScope: 'scriptHub' | 'dcc_plugin' | 'local_script';
  checksum: string;
};

export type UserTool = {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  maturity: ToolMaturity;
  source: ToolSource;
  runtime: ToolRuntime;
  status: 'draft' | 'usable' | 'improving' | 'verified' | 'archived';
  parameters: ToolParameter[];
  runs: ToolRun[];
  repairHistory: HermesRepair[];
  versions: ToolVersion[];
  manifest?: ScriptToolManifest;
};

export type HermesToolSummary = {
  id: string;
  name: string;
  summary: string;
  status: SkillCandidate['status'];
  riskLevel: SkillCandidate['risk_level'];
  triggerExamples: string[];
  lastRunStatus: OperationHistoryItem['status'];
  needsConfirmation: boolean;
};

export type UserToolDetail = {
  id: string;
  title: string;
  triggerExamples: string[];
  parameterTemplate: Array<{
    name: string;
    value: string;
  }>;
  toolChain: string[];
  failureHandling: string[];
  validation: {
    status: 'not_run' | 'waiting_confirmation' | 'passed' | 'failed';
    summary: string;
  };
};

export type SafetyPreview = {
  id: string;
  toolName: string;
  readScope: string;
  writeScope: string;
  overwriteLabel: string;
  riskLevel: Task['risk_level'];
  permissionSummary: string;
  confirmationStatus: Approval['status'];
  blockedReason?: string;
};

export type ArtifactSummary = {
  id: string;
  name: string;
  storageUri: string;
  sourceUri: string;
  status: AssetRecord['status'];
  traceId: string;
};

export type RepairAction = {
  id: RecoveryAction;
  label: string;
  detail: string;
  recommended: boolean;
};

export type PersonalRuntimeView = {
  history: OperationHistoryItem[];
  historyDetails: Record<string, OperationHistoryDetail>;
  hermesTool: HermesToolSummary;
  tools: UserTool[];
  toolDetail: UserToolDetail;
  safetyPreview: SafetyPreview;
  artifact: ArtifactSummary;
  repairActions: RepairAction[];
  repairSuggestion?: MayaConnectorRepairSuggestion;
};

export function getDefaultToolParameterValues(tool: UserTool): Record<string, unknown> {
  return Object.fromEntries(tool.parameters.map((parameter) => [parameter.key, parameter.defaultValue]));
}

export function buildSubmitTaskInputFromToolParameters(
  tool: UserTool,
  values: Record<string, unknown>,
): SubmitTaskInput {
  const overwrite = getBooleanValue(values.overwrite, false);
  const outputPath = tool.source === 'script' || tool.source === 'dcc_plugin'
    ? buildScriptOutputPath(values)
    : getStringValue(values.output_path, '输出路径');

  if (!outputPath.endsWith('.fbx')) {
    throw new Error('输出路径必须以 .fbx 结尾。');
  }

  return {
    capability_id: getToolCapabilityId(tool),
    output_path: outputPath,
    overwrite,
  };
}

export function buildPersonalRuntimeView(input: {
  approval: Approval;
  asset: AssetRecord;
  connector: Connector;
  connectorRepairSuggestion?: MayaConnectorRepairSuggestion;
  hermesConversation: HermesConversationState;
  runtimeError?: RuntimeError;
  task: Task;
}): PersonalRuntimeView {
  const { approval, asset, connector, connectorRepairSuggestion, hermesConversation, runtimeError, task } = input;
  const latestToolCall = hermesConversation.toolCalls.at(-1);
  const historyStatus = getHistoryStatus(task, approval, runtimeError, latestToolCall);
  const history = buildOperationHistory({
    approval,
    conversationTitle: hermesConversation.conversation.title,
    currentStatus: historyStatus,
    runtimeError,
    task,
    toolCalls: hermesConversation.toolCalls,
  });
  const artifactSummary: ArtifactSummary = {
    id: asset.id,
    name: asset.name,
    storageUri: asset.storage_uri,
    sourceUri: asset.source_uri,
    status: asset.status,
    traceId: asset.trace_id,
  };
  const safetyPreview: SafetyPreview = {
    id: approval.id,
    toolName: hermesConversation.skillCandidate.name,
    readScope: 'Maya 当前选择对象',
    writeScope: task.metadata.output_path,
    overwriteLabel: task.metadata.overwrite ? '允许覆盖同名文件' : '不会覆盖同名文件',
    riskLevel: task.risk_level,
    permissionSummary: '读取 Maya 选择；写入项目 exports 目录',
    confirmationStatus: approval.status,
    blockedReason: connector.status !== 'connected' ? 'Maya Connector 未连接，确认后也不会立即执行。' : undefined,
  };
  const repairActions = runtimeError ? buildRepairActions(runtimeError) : [];
  const repairSuggestion = runtimeError ? getRuntimeErrorRepairSuggestion(runtimeError) : connectorRepairSuggestion;
  const historyDetails = buildOperationHistoryDetails({
    approval,
    artifact: artifactSummary,
    history,
    repairActions,
    repairSuggestion,
    runtimeError,
    safetyPreview,
    task,
    toolCalls: hermesConversation.toolCalls,
  });

  return {
    history,
    historyDetails,
    hermesTool: {
      id: hermesConversation.skillCandidate.id,
      name: hermesConversation.skillCandidate.name,
      summary: hermesConversation.skillCandidate.summary,
      status: hermesConversation.skillCandidate.status,
      riskLevel: hermesConversation.skillCandidate.risk_level,
      triggerExamples: hermesConversation.skillCandidate.trigger_examples.slice(0, 3),
      lastRunStatus: historyStatus,
      needsConfirmation: approval.status === 'pending' || task.risk_level === 'high',
    },
    tools: buildUserTools({
      artifact: asset,
      history,
      historyStatus,
      runtimeError,
      skillCandidate: hermesConversation.skillCandidate,
      task,
    }),
    toolDetail: buildUserToolDetail({
      approval,
      historyStatus,
      runtimeError,
      skillCandidate: hermesConversation.skillCandidate,
      task,
    }),
    safetyPreview,
    artifact: artifactSummary,
    repairActions,
    repairSuggestion,
  };
}

function buildUserTools(input: {
  artifact: AssetRecord;
  history: OperationHistoryItem[];
  historyStatus: OperationHistoryItem['status'];
  runtimeError?: RuntimeError;
  skillCandidate: SkillCandidate;
  task: Task;
}): UserTool[] {
  const sharedRun: ToolRun = {
    id: input.history[0]?.id ?? input.task.id,
    status: input.historyStatus,
    parameters: {
      output_path: input.task.metadata.output_path,
      overwrite: input.task.metadata.overwrite,
      selection: 'maya.current_selection',
    },
    artifactIds: [input.artifact.id],
    traceId: input.task.trace_id,
    createdAt: input.task.updated_at,
  };

  const hermesRepair: HermesRepair = input.runtimeError
    ? {
        id: `repair_${input.runtimeError.code.toLowerCase()}`,
        problem: input.runtimeError.title,
        hermesAction: input.runtimeError.suggested_action,
        result: input.runtimeError.recoverable ? 'needs_user' : 'failed',
      }
    : {
        id: 'repair_default_path_conflict',
        problem: '目标路径可能冲突',
        hermesAction: '检测输出路径和覆盖策略，必要时提示用户修改路径。',
        result: 'fixed',
        toolChange: '已将覆盖策略加入运行前确认。',
      };

  const hermesTool: UserTool = {
    id: `tool_${input.skillCandidate.id}`,
    name: input.skillCandidate.name,
    description: input.skillCandidate.summary,
    category: 'dcc_operation',
    maturity: input.historyStatus === 'failed' ? 'usable' : 'stable',
    source: 'hermes_captured',
    runtime: 'maya',
    status: input.historyStatus === 'failed' ? 'improving' : 'usable',
    parameters: [
      {
        key: 'selection',
        label: '导出对象',
        type: 'string',
        defaultValue: 'Maya 当前选择',
        required: true,
      },
      {
        key: 'output_path',
        label: '输出路径',
        type: 'path',
        defaultValue: input.task.metadata.output_path,
        required: true,
        safetyNote: '会写入该 FBX 路径。',
      },
      {
        key: 'overwrite',
        label: '允许覆盖',
        type: 'boolean',
        defaultValue: input.task.metadata.overwrite,
        required: true,
        safetyNote: '开启后可能覆盖同名文件。',
      },
    ],
    runs: [sharedRun],
    repairHistory: [hermesRepair],
    versions: [
      {
        version: '0.1.0',
        changes: ['由 Hermes 首次跑通后生成', '记录输出路径和覆盖策略'],
        createdAt: input.skillCandidate.created_at,
      },
    ],
  };

  const mayaPluginTool: UserTool = {
    id: 'tool_script_maya_fbx_batch_export',
    name: 'Maya 批量 FBX 导出脚本',
    description: '稳定的 Maya Python 脚本工具，用于按命名规则批量导出选中资产。',
    category: 'dcc_operation',
    maturity: 'verified',
    source: 'dcc_plugin',
    runtime: 'maya',
    status: 'verified',
    parameters: [
      {
        key: 'output_dir',
        label: '输出目录',
        type: 'path',
        defaultValue: 'project://exports/batch',
        required: true,
        safetyNote: '会在该目录写入多个 FBX 文件。',
      },
      {
        key: 'name_rule',
        label: '命名规则',
        type: 'string',
        defaultValue: '{{scene}}_{{object}}.fbx',
        required: true,
      },
      {
        key: 'overwrite',
        label: '允许覆盖',
        type: 'boolean',
        defaultValue: false,
        required: true,
      },
    ],
    runs: [
      {
        id: 'run_script_maya_fbx_batch_export_001',
        status: 'succeeded',
        parameters: {
          output_dir: 'project://exports/batch',
          name_rule: '{{scene}}_{{object}}.fbx',
          overwrite: false,
        },
        artifactIds: [input.artifact.id],
        traceId: input.task.trace_id,
        createdAt: input.task.updated_at,
      },
    ],
    repairHistory: [
      {
        id: 'repair_script_manifest_001',
        problem: '早期脚本缺少输出目录校验',
        hermesAction: '补充目录存在性检查，并在执行前生成安全确认。',
        result: 'fixed',
        toolChange: 'v1.0.1 增加 output_dir 校验。',
      },
    ],
    versions: [
      {
        version: '1.0.1',
        changes: ['增加输出目录校验', '接入 ScriptHub 安全确认'],
        createdAt: input.task.updated_at,
      },
    ],
    manifest: {
      id: 'manifest_maya_fbx_batch_export',
      runtime: 'maya',
      entrypoint: 'scripts/maya/batch_export_fbx.py',
      language: 'python',
      installScope: 'scriptHub',
      checksum: 'sha256:demo',
    },
  };

  const blenderPluginTool: UserTool = {
    id: 'tool_script_blender_collection_fbx_export',
    name: 'Blender 集合导出 FBX 脚本',
    description: '稳定的 Blender Python 脚本工具，用于将指定集合导出为 FBX。',
    category: 'asset_processing',
    maturity: 'verified',
    source: 'script',
    runtime: 'blender',
    status: 'verified',
    parameters: [
      {
        key: 'collection',
        label: '集合名称',
        type: 'string',
        defaultValue: 'HeroAssets',
        required: true,
      },
      {
        key: 'output_dir',
        label: '输出目录',
        type: 'path',
        defaultValue: 'project://exports/blender',
        required: true,
        safetyNote: '会在该目录写入 Blender 导出的 FBX 文件。',
      },
      {
        key: 'name_rule',
        label: '命名规则',
        type: 'string',
        defaultValue: '{{scene}}_{{object}}.fbx',
        required: true,
      },
      {
        key: 'overwrite',
        label: '允许覆盖',
        type: 'boolean',
        defaultValue: false,
        required: true,
      },
    ],
    runs: [
      {
        id: 'run_script_blender_collection_export_001',
        status: 'succeeded',
        parameters: {
          collection: 'HeroAssets',
          output_dir: 'project://exports/blender',
          name_rule: '{{scene}}_{{object}}.fbx',
          overwrite: false,
        },
        artifactIds: [input.artifact.id],
        traceId: input.task.trace_id,
        createdAt: input.task.updated_at,
      },
    ],
    repairHistory: [
      {
        id: 'repair_blender_selection_001',
        problem: '集合为空时没有清晰提示',
        hermesAction: '补充集合检查，并提示用户更换集合或让 Hermes 重新选择对象。',
        result: 'fixed',
        toolChange: 'v0.2.0 增加 collection 校验。',
      },
    ],
    versions: [
      {
        version: '0.2.0',
        changes: ['增加集合校验', '接入工具中心参数窗口'],
        createdAt: input.task.updated_at,
      },
    ],
    manifest: {
      id: 'manifest_blender_collection_fbx_export',
      runtime: 'blender',
      entrypoint: 'scripts/blender/export_collection_fbx.py',
      language: 'python',
      installScope: 'scriptHub',
      checksum: 'sha256:demo-blender',
    },
  };

  const unrealHermesTool: UserTool = {
    id: 'tool_hermes_unreal_selected_assets_export',
    name: 'Unreal 选中资产导出 FBX',
    description: '由 Hermes 跑通后沉淀的 Unreal 工具，用于导出内容浏览器中的当前选择。',
    category: 'dcc_operation',
    maturity: 'usable',
    source: 'hermes_captured',
    runtime: 'unreal',
    status: 'improving',
    parameters: [
      {
        key: 'selection',
        label: '导出资产',
        type: 'string',
        defaultValue: 'Unreal 当前选择',
        required: true,
      },
      {
        key: 'output_path',
        label: '输出路径',
        type: 'path',
        defaultValue: 'project://exports/unreal/selected_assets.fbx',
        required: true,
        safetyNote: '会写入该 FBX 路径。',
      },
      {
        key: 'overwrite',
        label: '允许覆盖',
        type: 'boolean',
        defaultValue: false,
        required: true,
      },
    ],
    runs: [
      {
        id: 'run_hermes_unreal_selected_assets_001',
        status: 'ready',
        parameters: {
          selection: 'Unreal 当前选择',
          output_path: 'project://exports/unreal/selected_assets.fbx',
          overwrite: false,
        },
        artifactIds: [],
        traceId: input.task.trace_id,
        createdAt: input.task.updated_at,
      },
    ],
    repairHistory: [
      {
        id: 'repair_unreal_export_options_001',
        problem: '导出选项依赖项目插件状态',
        hermesAction: '记录插件检查步骤，失败时提示用户启用导出插件。',
        result: 'needs_user',
      },
    ],
    versions: [
      {
        version: '0.1.0',
        changes: ['由 Hermes 首次跑通后生成', '等待真实 Unreal Connector 验证'],
        createdAt: input.skillCandidate.created_at,
      },
    ],
  };

  return [mayaPluginTool, blenderPluginTool, hermesTool, unrealHermesTool];
}

function buildScriptOutputPath(values: Record<string, unknown>) {
  const outputDir = getStringValue(values.output_dir, '输出目录').replace(/\/+$/, '');
  const nameRule = getStringValue(values.name_rule, '命名规则');
  const fileName = nameRule
    .replaceAll('{{scene}}', 'current_scene')
    .replaceAll('{{object}}', 'selected_asset');
  return `${outputDir}/${fileName}`;
}

function getStringValue(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`需要提供${label}。`);
  }
  return value.trim();
}

function getBooleanValue(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function getToolCapabilityId(tool: UserTool) {
  if (tool.runtime === 'blender') return 'blender.export_fbx.v1';
  if (tool.runtime === 'unreal') return 'unreal.export_fbx.v1';
  return 'maya.export_fbx.v1';
}

function buildUserToolDetail(input: {
  approval: Approval;
  historyStatus: OperationHistoryItem['status'];
  runtimeError?: RuntimeError;
  skillCandidate: SkillCandidate;
  task: Task;
}): UserToolDetail {
  const { approval, historyStatus, runtimeError, skillCandidate, task } = input;
  const parameterTemplate = [
    {
      name: '输入对象',
      value: 'Maya 当前选择',
    },
    {
      name: '输出路径',
      value: task.metadata.output_path,
    },
    {
      name: '覆盖策略',
      value: task.metadata.overwrite ? '允许覆盖同名文件' : '不覆盖同名文件',
    },
  ];
  const stepTemplates = skillCandidate.steps.flatMap((step) => Object.entries(step.input_template ?? {}));
  const extraParameters = stepTemplates
    .filter(([key]) => !parameterTemplate.some((item) => item.name === key))
    .map(([key, value]) => ({
      name: key,
      value: formatTemplateValue(value),
    }));
  const failureHandling = skillCandidate.steps
    .map((step) => step.failure_handling)
    .filter((value): value is string => Boolean(value));

  return {
    id: skillCandidate.id,
    title: `${skillCandidate.name} 工具详情`,
    triggerExamples: skillCandidate.trigger_examples.slice(0, 3),
    parameterTemplate: [...parameterTemplate, ...extraParameters].slice(0, 6),
    toolChain: skillCandidate.required_tools,
    failureHandling: failureHandling.length > 0 ? failureHandling : ['失败时保留历史和 trace，并提示用户选择重试、修改路径或人工处理。'],
    validation: {
      status: getToolValidationStatus(historyStatus),
      summary: getToolValidationSummary({ approval, historyStatus, runtimeError }),
    },
  };
}

function formatTemplateValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (value === null) return 'null';
  return JSON.stringify(value);
}

function getToolValidationStatus(status: OperationHistoryItem['status']): UserToolDetail['validation']['status'] {
  if (status === 'succeeded' || status === 'ready') return 'passed';
  if (status === 'failed') return 'failed';
  if (status === 'waiting_confirmation') return 'waiting_confirmation';
  return 'not_run';
}

function getToolValidationSummary(input: {
  approval: Approval;
  historyStatus: OperationHistoryItem['status'];
  runtimeError?: RuntimeError;
}) {
  if (input.runtimeError) return input.runtimeError.message;
  if (input.historyStatus === 'succeeded') return '最近一次运行已生成产物，可作为可回放流程继续验证。';
  if (input.historyStatus === 'ready') return '最近一次 Tool Bridge 调用已记录，等待执行确认或产物登记。';
  if (input.historyStatus === 'waiting_confirmation') return `等待确认：${input.approval.reason}`;
  return '尚未完成可验证运行。';
}

function buildOperationHistory(input: {
  approval: Approval;
  conversationTitle: string;
  currentStatus: OperationHistoryItem['status'];
  runtimeError?: RuntimeError;
  task: Task;
  toolCalls: ToolCallRecord[];
}): OperationHistoryItem[] {
  const taskCreateCalls = input.toolCalls.filter((toolCall) => isTaskCreateToolCall(toolCall));

  if (taskCreateCalls.length === 0) {
    return [
      {
        id: input.task.id,
        title: input.conversationTitle,
        summary: getHistorySummary(input.task, input.approval, input.runtimeError, undefined),
        status: input.currentStatus,
        source: 'Hermes',
        traceId: input.task.trace_id,
        updatedAt: input.task.updated_at,
      },
    ];
  }

  return taskCreateCalls
    .map((toolCall, index) => {
      const isLatest = index === taskCreateCalls.length - 1;
      const outputPath = getStringInput(toolCall, 'output_path') ?? input.task.metadata.output_path;
      const overwrite = getBooleanInput(toolCall, 'overwrite') ?? input.task.metadata.overwrite;
      return {
        id: toolCall.id,
        title: isLatest ? input.conversationTitle : `工具运行 ${index + 1}`,
        summary: isLatest
          ? getHistorySummary(input.task, input.approval, input.runtimeError, toolCall)
          : `请求写入 ${outputPath}；${overwrite ? '允许覆盖' : '不覆盖同名文件'}`,
        status: isLatest ? input.currentStatus : getHistoryStatusFromToolCall(toolCall),
        source: 'Hermes',
        traceId: toolCall.trace_id,
        updatedAt: toolCall.finished_at ?? toolCall.started_at,
      } satisfies OperationHistoryItem;
    })
    .reverse();
}

function buildOperationHistoryDetails(input: {
  approval: Approval;
  artifact: ArtifactSummary;
  history: OperationHistoryItem[];
  repairActions: RepairAction[];
  repairSuggestion?: MayaConnectorRepairSuggestion;
  runtimeError?: RuntimeError;
  safetyPreview: SafetyPreview;
  task: Task;
  toolCalls: ToolCallRecord[];
}): Record<string, OperationHistoryDetail> {
  return Object.fromEntries(
    input.history.map((item) => {
      const toolCall = input.toolCalls.find((call) => call.id === item.id);
      const outputPath = toolCall
        ? getStringInput(toolCall, 'output_path') ?? input.task.metadata.output_path
        : input.task.metadata.output_path;
      const overwrite = toolCall
        ? getBooleanInput(toolCall, 'overwrite') ?? input.task.metadata.overwrite
        : input.task.metadata.overwrite;
      const capabilityId = toolCall
        ? getStringInput(toolCall, 'capability_id') ?? input.task.metadata.capability_id
        : input.task.metadata.capability_id;
      const confirmationStatus = toolCall?.status === 'needs_approval' ? 'pending' : input.approval.status;

      return [
        item.id,
        {
          id: item.id,
          title: item.title,
          status: item.status,
          source: item.source,
          traceId: item.traceId,
          readScope: getReadScopeFromCapability(capabilityId),
          writeScope: outputPath,
          overwriteLabel: overwrite ? '允许覆盖同名文件' : '不会覆盖同名文件',
          confirmationStatus,
          parameters: buildHistoryParameters({
            capabilityId,
            outputPath,
            overwrite,
            toolCall,
          }),
          replayInput: {
            capability_id: capabilityId,
            output_path: outputPath,
            overwrite,
          },
          replayChecks: buildReplayChecks({
            artifact: input.artifact,
            currentTask: input.task,
            outputPath,
            overwrite,
            readScope: getReadScopeFromCapability(capabilityId),
            safetyPreview: input.safetyPreview,
          }),
          artifact: input.artifact,
          repairs: buildHistoryRepairDetails({
            isLatest: item.id === input.history[0]?.id,
            repairActions: input.repairActions,
            runtimeError: input.runtimeError,
          }),
          repairSuggestion: item.id === input.history[0]?.id ? input.repairSuggestion : undefined,
          timeline: buildHistoryTimeline({ approval: input.approval, item, task: input.task, toolCall }),
        } satisfies OperationHistoryDetail,
      ];
    }),
  );
}

function buildHistoryParameters(input: {
  capabilityId: string;
  outputPath: string;
  overwrite: boolean;
  toolCall?: ToolCallRecord;
}) {
  const parameters = [
    { name: '能力', value: input.capabilityId },
    { name: '输出路径', value: input.outputPath },
    { name: '覆盖策略', value: input.overwrite ? '允许覆盖' : '不覆盖' },
  ];
  const extraParameters = Object.entries(input.toolCall?.input ?? {})
    .filter(([key]) => !['capability_id', 'output_path', 'overwrite'].includes(key))
    .map(([key, value]) => ({ name: key, value: formatTemplateValue(value) }));
  return [...parameters, ...extraParameters].slice(0, 8);
}

function buildReplayChecks(input: {
  artifact: ArtifactSummary;
  currentTask: Task;
  outputPath: string;
  overwrite: boolean;
  readScope: string;
  safetyPreview: SafetyPreview;
}): OperationHistoryDetail['replayChecks'] {
  const checks: OperationHistoryDetail['replayChecks'] = [];

  if (input.artifact.storageUri === input.outputPath) {
    checks.push({
      id: 'output_path_matches_existing_artifact',
      severity: input.overwrite ? 'warning' : 'info',
      title: '输出路径已有产物记录',
      detail: input.overwrite
        ? '本次回放允许覆盖，可能写入同一个产物位置。'
        : '本次回放不允许覆盖；如果目标已存在，Hermes 需要介入改名或换路径。',
    });
  }

  if (input.outputPath !== input.currentTask.metadata.output_path) {
    checks.push({
      id: 'output_path_changed',
      severity: 'warning',
      title: '输出路径不同于当前任务',
      detail: `历史路径为 ${input.outputPath}；当前任务路径为 ${input.currentTask.metadata.output_path}。`,
    });
  }

  if (input.overwrite !== input.currentTask.metadata.overwrite) {
    checks.push({
      id: 'overwrite_changed',
      severity: 'warning',
      title: '覆盖策略不同于当前任务',
      detail: `历史记录为${input.overwrite ? '允许覆盖' : '不覆盖'}；当前任务为${input.currentTask.metadata.overwrite ? '允许覆盖' : '不覆盖'}。`,
    });
  }

  if (input.readScope !== input.safetyPreview.readScope) {
    checks.push({
      id: 'read_scope_changed',
      severity: 'warning',
      title: '读取范围可能变化',
      detail: `历史读取 ${input.readScope}；当前安全确认读取 ${input.safetyPreview.readScope}。`,
    });
  }

  checks.push({
    id: 'dcc_selection_runtime_check',
    severity: 'info',
    title: '当前 DCC 选择需在执行时确认',
    detail: '回放会复用历史参数，但真实选择对象仍以执行时 DCC 当前状态为准。',
  });

  return checks;
}

function buildHistoryRepairDetails(input: {
  isLatest: boolean;
  repairActions: RepairAction[];
  runtimeError?: RuntimeError;
}): OperationHistoryDetail['repairs'] {
  if (input.isLatest && input.runtimeError) {
    return input.repairActions.map((action) => ({
      id: action.id,
      title: action.label,
      detail: action.detail,
      result: action.recommended ? 'needs_user' : 'not_needed',
    }));
  }

  return [
    {
      id: 'repair_not_needed',
      title: '本次未触发 Hermes 修复',
      detail: '运行记录没有失败状态；如果后续执行失败，Hermes 会把修复动作写回这里。',
      result: 'not_needed',
    },
  ];
}

function buildHistoryTimeline(input: {
  approval: Approval;
  item: OperationHistoryItem;
  task: Task;
  toolCall?: ToolCallRecord;
}): OperationHistoryDetail['timeline'] {
  const timeline = [
    {
      label: 'Hermes 发起工具调用',
      time: input.toolCall?.started_at ?? input.task.created_at,
    },
    {
      label: input.approval.status === 'pending' ? '等待安全确认' : '安全确认已处理',
      time: input.approval.updated_at,
    },
  ];

  if (input.toolCall?.finished_at) {
    timeline.push({
      label: 'Tool Bridge 返回结果',
      time: input.toolCall.finished_at,
    });
  }

  timeline.push({
    label: '运行历史已记录',
    time: input.item.updatedAt,
  });

  return timeline;
}

function getReadScopeFromCapability(capabilityId: string) {
  if (capabilityId.startsWith('blender.')) return 'Blender 当前集合或选择对象';
  if (capabilityId.startsWith('unreal.')) return 'Unreal 内容浏览器当前选择';
  return 'Maya 当前选择对象';
}

function isTaskCreateToolCall(toolCall: ToolCallRecord) {
  return toolCall.tool_name === 'task.create' || toolCall.tool_name === 'scriptHub.task.create';
}

function getStringInput(toolCall: ToolCallRecord, key: string) {
  const value = toolCall.input[key];
  return typeof value === 'string' ? value : undefined;
}

function getBooleanInput(toolCall: ToolCallRecord, key: string) {
  const value = toolCall.input[key];
  return typeof value === 'boolean' ? value : undefined;
}

function getHistoryStatusFromToolCall(toolCall: ToolCallRecord): OperationHistoryItem['status'] {
  if (toolCall.status === 'failed') return 'failed';
  if (toolCall.status === 'running' || toolCall.status === 'pending') return 'running';
  if (toolCall.status === 'succeeded') return 'ready';
  return 'waiting_confirmation';
}

function getHistoryStatus(
  task: Task,
  approval: Approval,
  runtimeError: RuntimeError | undefined,
  latestToolCall: ToolCallRecord | undefined,
): OperationHistoryItem['status'] {
  if (runtimeError || task.status === 'failed' || latestToolCall?.status === 'failed') return 'failed';
  if (task.status === 'succeeded') return 'succeeded';
  if (task.status === 'running') return 'running';
  if (approval.status === 'pending' || latestToolCall?.status === 'needs_approval') return 'waiting_confirmation';
  return 'ready';
}

function getHistorySummary(
  task: Task,
  approval: Approval,
  runtimeError: RuntimeError | undefined,
  latestToolCall: ToolCallRecord | undefined,
) {
  if (runtimeError) return runtimeError.message;
  if (task.status === 'succeeded') return `已生成 ${task.artifact_ids.length || 1} 个产物，可再次运行。`;
  if (approval.status === 'pending' || latestToolCall?.status === 'needs_approval') {
    return `等待确认写入 ${task.metadata.output_path}`;
  }
  return task.description;
}

function buildRepairActions(runtimeError: RuntimeError): RepairAction[] {
  const actions: RepairAction[] = [];

  if (runtimeError.retryable) {
    actions.push({
      id: 'retry',
      label: '重试',
      detail: '保持当前参数，再执行一次。',
      recommended: runtimeError.type === 'timeout_error',
    });
  }

  actions.push({
    id: 'revise_path',
    label: '修改路径',
    detail: '换一个输出位置，避免覆盖或权限问题。',
    recommended: runtimeError.type === 'conflict_error',
  });

  actions.push({
    id: 'review',
    label: '人工处理',
    detail: runtimeError.suggested_action,
    recommended: runtimeError.requires_human_review,
  });

  actions.push({
    id: 'cancel',
    label: '取消本次运行',
    detail: '保留历史和错误原因，不继续执行。',
    recommended: false,
  });

  return actions;
}

function getRuntimeErrorRepairSuggestion(runtimeError: RuntimeError) {
  const connectorErrorCodeByRuntimeCode: Record<string, string> = {
    EMPTY_SELECTION: 'empty_selection',
    MAYA_TIMEOUT: 'maya_command_timeout',
    OUTPUT_CONFLICT: 'output_exists',
    RESULT_UNCERTAIN: 'maya_command_failed',
  };

  return getMayaConnectorRepairSuggestion(
    connectorErrorCodeByRuntimeCode[runtimeError.code] ?? runtimeError.code.toLowerCase(),
  );
}
