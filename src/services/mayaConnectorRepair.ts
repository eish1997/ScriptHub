import type { RecoveryAction } from './runtimeController';

export type MayaConnectorErrorCode =
  | 'empty_selection'
  | 'fbx_plugin_unavailable'
  | 'invalid_output_path'
  | 'maya_command_failed'
  | 'maya_command_invalid_response'
  | 'maya_command_spawn_failed'
  | 'maya_command_timeout'
  | 'maya_python_unavailable'
  | 'output_exists';

export type MayaConnectorRepairSuggestion = {
  canRetry: boolean;
  hermesActions: string[];
  recommendedAction: string;
  recoveryAction: RecoveryAction;
  requiresUserInput: boolean;
  summary: string;
  userMessage: string;
};

const suggestions: Record<MayaConnectorErrorCode, MayaConnectorRepairSuggestion> = {
  empty_selection: {
    canRetry: false,
    hermesActions: [
      'Ask the user to select exportable mesh objects in Maya.',
      'Offer to auto-select meshes by name, namespace, or scene group if the user describes a rule.',
      'Retry selection after the user confirms the scene selection.',
    ],
    recommendedAction: 'select_objects',
    recoveryAction: 'review',
    requiresUserInput: true,
    summary: 'Maya has no exportable selection.',
    userMessage: '当前 Maya 没有可导出的选择对象。请先选择 mesh，或让 Hermes 按名称/层级规则帮你选择后重试。',
  },
  fbx_plugin_unavailable: {
    canRetry: true,
    hermesActions: [
      'Try loading the fbxmaya plugin again.',
      'Check whether the Maya installation includes FBX export support.',
      'Suggest switching to a Maya installation with a working fbxmaya plugin.',
    ],
    recommendedAction: 'repair_maya_plugin',
    recoveryAction: 'review',
    requiresUserInput: true,
    summary: 'Maya could not load the FBX export plugin.',
    userMessage: 'Maya 的 FBX 导出插件不可用。可以先检查 fbxmaya 插件是否安装/启用，再重试导出。',
  },
  invalid_output_path: {
    canRetry: false,
    hermesActions: [
      'Rewrite the output path so it ends with .fbx.',
      'Preserve the same output directory when only the extension is invalid.',
      'Ask for a target file path if the intended format is unclear.',
    ],
    recommendedAction: 'revise_output_path',
    recoveryAction: 'revise_path',
    requiresUserInput: false,
    summary: 'The output path is not an FBX file path.',
    userMessage: '输出路径必须是 .fbx 文件。Hermes 可以自动把路径修正为 FBX 后再次执行。',
  },
  maya_command_failed: {
    canRetry: true,
    hermesActions: [
      'Preserve the failed request and trace id.',
      'Inspect the connector error message and logs.',
      'Ask the user for missing context before retrying.',
    ],
    recommendedAction: 'inspect_connector_error',
    recoveryAction: 'review',
    requiresUserInput: false,
    summary: 'The Maya command failed.',
    userMessage: 'Maya 命令执行失败。Hermes 应保留现场，查看日志后再决定是否重试。',
  },
  maya_command_invalid_response: {
    canRetry: true,
    hermesActions: [
      'Inspect stderr and command bridge logs.',
      'Check whether Maya printed non-JSON text to stdout before the structured response.',
      'Retry once after isolating command output.',
    ],
    recommendedAction: 'inspect_command_output',
    recoveryAction: 'review',
    requiresUserInput: false,
    summary: 'The Maya command bridge did not return structured JSON.',
    userMessage: 'Maya 命令桥没有返回可解析结果。需要检查命令输出或 Maya 崩溃日志。',
  },
  maya_command_spawn_failed: {
    canRetry: false,
    hermesActions: [
      'Verify SCRIPTHUB_MAYA_PYTHON_COMMAND points to mayapy.exe or a Maya session command.',
      'Search common Autodesk Maya install paths for mayapy.exe.',
      'Ask the user to choose the correct Maya version if multiple installs exist.',
    ],
    recommendedAction: 'configure_mayapy',
    recoveryAction: 'review',
    requiresUserInput: true,
    summary: 'ScriptHub could not start the configured Maya Python command.',
    userMessage: '无法启动 Maya Python 命令。请检查 mayapy 路径是否正确，或让 Hermes 自动查找本机 Maya 安装。',
  },
  maya_command_timeout: {
    canRetry: true,
    hermesActions: [
      'Check whether Maya is busy or blocked by a modal dialog.',
      'Increase SCRIPTHUB_MAYA_COMMAND_TIMEOUT_MS for large scenes.',
      'Retry after confirming Maya is responsive.',
    ],
    recommendedAction: 'retry_after_maya_ready',
    recoveryAction: 'retry',
    requiresUserInput: true,
    summary: 'The Maya command took too long.',
    userMessage: 'Maya 命令执行超时。请确认 Maya 没有卡住或弹出阻塞窗口，也可以延长超时时间后重试。',
  },
  maya_python_unavailable: {
    canRetry: false,
    hermesActions: [
      'Switch SCRIPTHUB_MAYA_PYTHON_COMMAND from python to mayapy.exe.',
      'Run npm run maya-connector:real-smoke to verify the local Maya Python environment.',
      'If Maya is not installed, ask the user to install Maya or choose fixture mode.',
    ],
    recommendedAction: 'switch_to_mayapy',
    recoveryAction: 'review',
    requiresUserInput: true,
    summary: 'The command is not running in a Maya Python environment.',
    userMessage: '当前命令没有 Maya Python 环境。请把命令切到 mayapy.exe，或在 Maya 会话内执行命令桥。',
  },
  output_exists: {
    canRetry: false,
    hermesActions: [
      'Ask the user whether overwriting is allowed.',
      'Offer a versioned output filename such as _v002.fbx.',
      'Retry with overwrite=true only after explicit confirmation.',
    ],
    recommendedAction: 'confirm_overwrite_or_rename',
    recoveryAction: 'revise_path',
    requiresUserInput: true,
    summary: 'The target FBX already exists and overwrite is disabled.',
    userMessage: '目标 FBX 已存在，当前不允许覆盖。可以确认覆盖，或让 Hermes 自动改成新文件名。',
  },
};

const fallbackSuggestion: MayaConnectorRepairSuggestion = {
  canRetry: true,
  hermesActions: [
    'Preserve the failed request and trace id.',
    'Inspect the connector error message and logs.',
    'Ask the user for missing context before retrying.',
  ],
  recommendedAction: 'inspect_connector_error',
  recoveryAction: 'review',
  requiresUserInput: false,
  summary: 'The Maya Connector returned an unmapped error.',
  userMessage: 'Maya Connector 返回了未映射错误。Hermes 应保留现场，查看日志后再决定是否重试。',
};

export function getMayaConnectorRepairSuggestion(code: string): MayaConnectorRepairSuggestion {
  return suggestions[code as MayaConnectorErrorCode] ?? fallbackSuggestion;
}

