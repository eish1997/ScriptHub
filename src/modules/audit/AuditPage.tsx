import { AlertTriangle, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { EventLevelBadge, Metric } from '../../components/common';
import {
  buildUnifiedAuditEvents,
  filterAuditEvents,
  getRelatedAuditRecords,
  getToolBridgeContractRecord,
  type AuditSourceFilter,
  type UnifiedAuditEvent,
} from '../../services/auditEvents';
import type { HermesConversation, HermesMessage, ToolCallRecord } from '../../services/hermesConversation';
import { type RuntimeEvent } from '../../services/mockRuntime';

type EventFilter = 'all' | RuntimeEvent['level'];

export function AuditPage({
  conversation,
  events: runtimeEvents,
  messages = [],
  toolCalls = [],
}: {
  conversation?: HermesConversation;
  events: RuntimeEvent[];
  messages?: HermesMessage[];
  toolCalls?: ToolCallRecord[];
}) {
  const [filter, setFilter] = useState<EventFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<AuditSourceFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<UnifiedAuditEvent | undefined>();
  const unifiedEvents = buildUnifiedAuditEvents({
    conversation,
    messages,
    runtimeEvents,
    toolCalls,
  });
  const filters: Array<{ label: string; value: EventFilter }> = [
    { label: '全部', value: 'all' },
    { label: 'Info', value: 'info' },
    { label: 'Audit', value: 'audit' },
    { label: 'Warning', value: 'warning' },
    { label: 'Error', value: 'error' },
  ];
  const sourceFilters: Array<{ label: string; value: AuditSourceFilter }> = [
    { label: '全部来源', value: 'all' },
    { label: 'Runtime', value: 'runtime' },
    { label: 'External Hermes', value: 'hermes' },
    { label: 'Tool Bridge', value: 'tool_bridge' },
  ];
  const filteredEvents = filterAuditEvents(unifiedEvents, { level: filter, source: sourceFilter, keyword });
  const auditEvents = unifiedEvents.filter((eventItem) =>
    ['audit', 'warning', 'error'].includes(eventItem.level),
  );
  const toolBridgeEvents = unifiedEvents.filter((eventItem) => eventItem.audit_source === 'tool_bridge');

  return (
    <div className="audit-layout">
      <section className="panel audit-main">
        <div className="section-title">
          <div>
            <p className="eyebrow">Event Center</p>
            <h2>事件与审计</h2>
          </div>
          <div className="filter-pills">
            {sourceFilters.map((item) => (
              <button
                className={sourceFilter === item.value ? 'filter-button active' : 'filter-button'}
                key={item.value}
                onClick={() => setSourceFilter(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="filter-pills">
            {filters.map((item) => (
              <button
                className={filter === item.value ? 'filter-button active' : 'filter-button'}
                key={item.value}
                onClick={() => setFilter(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <form className="task-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            Trace / Conversation / Tool Call
            <input
              aria-label="Filter audit events by conversation_id, trace_id, or tool_call_id"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="conversation_id / trace_id / tool_call_id"
              type="text"
              value={keyword}
            />
          </label>
        </form>
        <div className="event-table" role="table" aria-label="Audit events">
          <div className="event-row event-head" role="row">
            <span>Level</span>
            <span>Event</span>
            <span>Source</span>
            <span>Message</span>
          </div>
          {filteredEvents.map((eventItem) => (
            <button
              className="event-row"
              key={eventItem.id}
              onClick={() => setSelectedEvent(eventItem)}
              role="row"
              type="button"
            >
              <span>
                <EventLevelBadge level={eventItem.level} />
              </span>
              <strong>{eventItem.event_type}</strong>
              <span>{eventItem.source}</span>
              <span>{eventItem.message}</span>
            </button>
          ))}
        </div>
      </section>

      <aside className="panel audit-side">
        <div className="section-title compact">
          <h2>审计摘要</h2>
          <ClipboardList size={18} />
        </div>
        <div className="audit-summary">
          <Metric icon={ClipboardList} label="审计事件" value={String(auditEvents.length)} tone="warn" />
          <Metric icon={ClipboardList} label="ToolCall" value={String(toolBridgeEvents.length)} tone="info" />
          <Metric
            icon={AlertTriangle}
            label="错误事件"
            value={String(unifiedEvents.filter((eventItem) => eventItem.level === 'error').length)}
            tone="warn"
          />
        </div>
        <div className="audit-stack">
          {auditEvents.map((eventItem) => (
            <button className="audit-card" key={eventItem.id} onClick={() => setSelectedEvent(eventItem)} type="button">
              <EventLevelBadge level={eventItem.level} />
              <strong>{eventItem.event_type}</strong>
              <span>{eventItem.message}</span>
            </button>
          ))}
        </div>
      </aside>

      {selectedEvent && (
        <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(undefined)} />
      )}
    </div>
  );
}

function EventDrawer({ event, onClose }: { event: UnifiedAuditEvent; onClose: () => void }) {
  const relatedRecords = getRelatedAuditRecords(event.detail);
  const toolBridgeContract = getToolBridgeContractRecord(event.detail);

  return (
    <div className="drawer-backdrop">
      <aside className="drawer" aria-label="事件详情">
        <div className="section-title">
          <div>
            <p className="eyebrow">Event Detail</p>
            <h2>{event.event_type}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            x
          </button>
        </div>
        <dl className="inspector-list">
          <div>
            <dt>Level</dt>
            <dd>
              <EventLevelBadge level={event.level} />
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{event.source} / {event.audit_source}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{event.target_type} / {event.target_id}</dd>
          </div>
          <div>
            <dt>Trace</dt>
            <dd>{event.trace_id}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{event.occurred_at}</dd>
          </div>
          <div>
            <dt>Message</dt>
            <dd>{event.message}</dd>
          </div>
        </dl>
        {relatedRecords.map((record) => (
          <dl className="inspector-list" key={record.type}>
            <div>
              <dt>{record.type}</dt>
              <dd>{record.fields.map((field) => `${field.label}: ${field.value}`).join(' / ')}</dd>
            </div>
          </dl>
        ))}
        {toolBridgeContract && <ToolContractSummary fields={toolBridgeContract.fields} />}
        {event.detail && <JsonBlock title="Detail" value={event.detail} />}
      </aside>
    </div>
  );
}

function ToolContractSummary({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <section className="tool-contract-summary" aria-label="Tool Contract">
      <div className="tool-contract-title">
        <span>Tool Contract</span>
      </div>
      <dl className="tool-contract-grid">
        {fields.map((field) => (
          <div className={field.label === 'Validation errors' ? 'wide' : undefined} key={field.label}>
            <dt>{field.label}</dt>
            <dd className={getToolContractValueClass(field)}>{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function getToolContractValueClass(field: { label: string; value: string }) {
  if (field.label === 'Risk') return `risk-badge ${field.value}`;
  if (field.label === 'Validation') return field.value === 'passed' ? 'contract-pass' : 'contract-fail';
  if (field.label === 'Approval') return field.value === 'true' ? 'contract-warn' : 'contract-pass';
  return undefined;
}

function JsonBlock({ title, value }: { title: string; value: Record<string, unknown> }) {
  return (
    <div className="tool-json-block">
      <strong>{title}</strong>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
