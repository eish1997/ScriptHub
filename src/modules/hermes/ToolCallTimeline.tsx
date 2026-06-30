import { CheckCircle2, Clock3, ShieldAlert, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { ToolCallRecord, ToolCallStatus } from '../../services/hermesConversation';

type ToolCallTimelineProps = {
  toolCalls: ToolCallRecord[];
};

const statusIcon: Record<ToolCallStatus, typeof Clock3> = {
  failed: XCircle,
  needs_approval: ShieldAlert,
  pending: Clock3,
  running: Clock3,
  succeeded: CheckCircle2,
};

export function ToolCallTimeline({ toolCalls }: ToolCallTimelineProps) {
  const [selectedToolCall, setSelectedToolCall] = useState<ToolCallRecord | undefined>();

  return (
    <section className="panel">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Tool Calls</p>
          <h2>平台工具调用</h2>
        </div>
      </div>

      <div className="tool-call-list">
        {toolCalls.map((toolCall) => {
          const Icon = statusIcon[toolCall.status];
          return (
            <button
              className={`tool-call-card ${toolCall.status}`}
              key={toolCall.id}
              onClick={() => setSelectedToolCall(toolCall)}
              type="button"
            >
              <div className="tool-call-icon">
                <Icon size={18} />
              </div>
              <div>
                <div className="tool-call-head">
                  <strong>{toolCall.title}</strong>
                  <span className={`status-badge ${toolCall.status}`}>{toolCall.status}</span>
                </div>
                <code>{toolCall.tool_name}</code>
                <p>{summarizeToolCall(toolCall)}</p>
              </div>
            </button>
          );
        })}
      </div>
      {selectedToolCall && (
        <ToolCallDetailDrawer toolCall={selectedToolCall} onClose={() => setSelectedToolCall(undefined)} />
      )}
    </section>
  );
}

function summarizeToolCall(toolCall: ToolCallRecord) {
  if (toolCall.error) return toolCall.error;
  if (toolCall.status === 'needs_approval') return '该调用已经创建执行对象，但需要人工确认后继续。';
  if (toolCall.output) return `输出：${Object.keys(toolCall.output).join(', ')}`;
  return `输入：${Object.keys(toolCall.input).join(', ')}`;
}

function ToolCallDetailDrawer({
  onClose,
  toolCall,
}: {
  onClose: () => void;
  toolCall: ToolCallRecord;
}) {
  return (
    <div className="drawer-backdrop" role="presentation">
      <aside className="drawer tool-call-detail" aria-label="ToolCall 详情">
        <div className="section-title compact">
          <div>
            <p className="eyebrow">ToolCall Detail</p>
            <h2>{toolCall.title}</h2>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            关闭
          </button>
        </div>
        <dl className="inspector-list">
          <div>
            <dt>Tool</dt>
            <dd>{toolCall.tool_name}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`status-badge ${toolCall.status}`}>{toolCall.status}</span>
            </dd>
          </div>
          <div>
            <dt>Trace</dt>
            <dd>{toolCall.trace_id}</dd>
          </div>
          <div>
            <dt>Conversation</dt>
            <dd>{toolCall.conversation_id}</dd>
          </div>
          <div>
            <dt>Risk</dt>
            <dd>{toolCall.risk_level}</dd>
          </div>
        </dl>
        {toolCall.error && <div className="blocking-banner">调用失败：{toolCall.error}</div>}
        <JsonBlock title="Input" value={toolCall.input} />
        <JsonBlock title="Output" value={toolCall.output ?? {}} />
      </aside>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: Record<string, unknown> }) {
  return (
    <div className="tool-json-block">
      <strong>{title}</strong>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
