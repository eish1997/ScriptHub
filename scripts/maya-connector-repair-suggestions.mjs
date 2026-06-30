const suggestions = {
  empty_selection: {
    can_retry: false,
    hermes_actions: [
      'Ask the user to select exportable mesh objects in Maya.',
      'Offer to auto-select meshes by name, namespace, or scene group if the user describes a rule.',
      'Retry selection after the user confirms the scene selection.',
    ],
    recommended_action: 'select_objects',
    requires_user_input: true,
    summary: 'Maya has no exportable selection.',
    user_message: '当前 Maya 没有可导出的选择对象。请先选择 mesh，或让 Hermes 按名称/层级规则帮你选择后重试。',
  },
  fbx_plugin_unavailable: {
    can_retry: true,
    hermes_actions: [
      'Try loading the fbxmaya plugin again.',
      'Check whether the Maya installation includes FBX export support.',
      'Suggest switching to a Maya installation with a working fbxmaya plugin.',
    ],
    recommended_action: 'repair_maya_plugin',
    requires_user_input: true,
    summary: 'Maya could not load the FBX export plugin.',
    user_message: 'Maya 的 FBX 导出插件不可用。可以先检查 fbxmaya 插件是否安装/启用，再重试导出。',
  },
  invalid_output_path: {
    can_retry: false,
    hermes_actions: [
      'Rewrite the output path so it ends with .fbx.',
      'Preserve the same output directory when only the extension is invalid.',
      'Ask for a target file path if the intended format is unclear.',
    ],
    recommended_action: 'revise_output_path',
    requires_user_input: false,
    summary: 'The output path is not an FBX file path.',
    user_message: '输出路径必须是 .fbx 文件。Hermes 可以自动把路径修正为 FBX 后再次执行。',
  },
  maya_command_invalid_response: {
    can_retry: true,
    hermes_actions: [
      'Inspect stderr and command bridge logs.',
      'Check whether Maya printed non-JSON text to stdout before the structured response.',
      'Retry once after isolating command output.',
    ],
    recommended_action: 'inspect_command_output',
    requires_user_input: false,
    summary: 'The Maya command bridge did not return structured JSON.',
    user_message: 'Maya 命令桥没有返回可解析结果。需要检查命令输出或 Maya 崩溃日志。',
  },
  maya_command_spawn_failed: {
    can_retry: false,
    hermes_actions: [
      'Verify SCRIPTHUB_MAYA_PYTHON_COMMAND points to mayapy.exe or a Maya session command.',
      'Search common Autodesk Maya install paths for mayapy.exe.',
      'Ask the user to choose the correct Maya version if multiple installs exist.',
    ],
    recommended_action: 'configure_mayapy',
    requires_user_input: true,
    summary: 'ScriptHub could not start the configured Maya Python command.',
    user_message: '无法启动 Maya Python 命令。请检查 mayapy 路径是否正确，或让 Hermes 自动查找本机 Maya 安装。',
  },
  maya_command_timeout: {
    can_retry: true,
    hermes_actions: [
      'Check whether Maya is busy or blocked by a modal dialog.',
      'Increase SCRIPTHUB_MAYA_COMMAND_TIMEOUT_MS for large scenes.',
      'Retry after confirming Maya is responsive.',
    ],
    recommended_action: 'retry_after_maya_ready',
    requires_user_input: true,
    summary: 'The Maya command took too long.',
    user_message: 'Maya 命令执行超时。请确认 Maya 没有卡住或弹出阻塞窗口，也可以延长超时时间后重试。',
  },
  maya_python_unavailable: {
    can_retry: false,
    hermes_actions: [
      'Switch SCRIPTHUB_MAYA_PYTHON_COMMAND from python to mayapy.exe.',
      'Run npm run maya-connector:real-smoke to verify the local Maya Python environment.',
      'If Maya is not installed, ask the user to install Maya or choose fixture mode.',
    ],
    recommended_action: 'switch_to_mayapy',
    requires_user_input: true,
    summary: 'The command is not running in a Maya Python environment.',
    user_message: '当前命令没有 Maya Python 环境。请把命令切到 mayapy.exe，或在 Maya 会话内执行命令桥。',
  },
  output_exists: {
    can_retry: false,
    hermes_actions: [
      'Ask the user whether overwriting is allowed.',
      'Offer a versioned output filename such as _v002.fbx.',
      'Retry with overwrite=true only after explicit confirmation.',
    ],
    recommended_action: 'confirm_overwrite_or_rename',
    requires_user_input: true,
    summary: 'The target FBX already exists and overwrite is disabled.',
    user_message: '目标 FBX 已存在，当前不允许覆盖。可以确认覆盖，或让 Hermes 自动改成新文件名。',
  },
};

const fallbackSuggestion = {
  can_retry: true,
  hermes_actions: [
    'Preserve the failed request and trace id.',
    'Inspect the connector error message and logs.',
    'Ask the user for missing context before retrying.',
  ],
  recommended_action: 'inspect_connector_error',
  requires_user_input: false,
  summary: 'The Maya Connector returned an unmapped error.',
  user_message: 'Maya Connector 返回了未映射错误。Hermes 应保留现场，查看日志后再决定是否重试。',
};

export function getMayaConnectorRepairSuggestion(code) {
  return suggestions[code] ?? fallbackSuggestion;
}

export function enrichMayaConnectorError(error) {
  if (!error || typeof error !== 'object') return error;
  return {
    ...error,
    repair_suggestion: getMayaConnectorRepairSuggestion(error.code),
  };
}
