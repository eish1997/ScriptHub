import type { LucideIcon } from 'lucide-react';
import type { RuntimeEvent } from '../services/mockRuntime';

export const statusLabel: Record<string, string> = {
  planned: '已计划',
  waiting_approval: '待审批',
  queued: '已排队',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  connected: '已连接',
  disconnected: '已断开',
  degraded: '不稳定',
  pending: '待处理',
  approved: '已批准',
  rejected: '已拒绝',
  canceled: '已取消',
  created: '已生成',
  active: '活动中',
  ready: '可运行',
  waiting_confirmation: '待确认',
  not_run: '未验证',
  usable: '可用',
  improving: '改进中',
  verified: '已验证',
  restored: '已恢复',
  reset: '已重置',
  available: '可用',
  validated: '已验证',
  disabled: '不可用',
  deprecated: '已废弃',
  published: '已发布',
  archived: '已归档',
  passed: '通过',
  allow: '允许',
  deny: '拒绝',
  require_approval: '需审批',
  audit: '审计',
};

export function Metric({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: 'info' | 'success' | 'warn';
  value: string;
}) {
  return (
    <div className={`metric ${tone}`}>
      <Icon size={20} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${value}`}>{statusLabel[value] ?? value}</span>;
}

export function RiskBadge({ value }: { value: string }) {
  return <span className={`risk-badge ${value}`}>{value === 'high' ? '高风险' : value}</span>;
}

export function Timeline({ events }: { events: RuntimeEvent[] }) {
  return (
    <div className="timeline">
      {events.map((eventItem) => (
        <div className="timeline-row" key={eventItem.id}>
          <span className={`timeline-dot ${eventItem.level}`} />
          <div>
            <strong>{eventItem.event_type}</strong>
            <p>{eventItem.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ManifestBlock({ title, values }: { title: string; values: Record<string, string> }) {
  const entries = Object.entries(values);
  return (
    <div className="manifest-block">
      <strong>{title}</strong>
      {entries.length === 0 ? (
        <span className="muted">无参数</span>
      ) : (
        entries.map(([key, value]) => (
          <div key={key}>
            <code>{key}</code>
            <span>{value}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function EventLevelBadge({ level }: { level: RuntimeEvent['level'] }) {
  return <span className={`event-level ${level}`}>{level}</span>;
}
