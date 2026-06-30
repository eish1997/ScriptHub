import { Settings } from 'lucide-react';
import { StatusBadge } from '../../components/common';
import { policyRules, type Permission, type RuntimeRole } from '../../services/mockRuntime';
import { hasPermission } from '../../services/permissions';

export function PolicySettings({
  onRoleChange,
  role,
}: {
  onRoleChange: (role: RuntimeRole) => void;
  role: RuntimeRole;
}) {
  const roles: RuntimeRole[] = ['operator', 'approver', 'admin', 'observer'];
  const permissions: Permission[] = ['task.create', 'approval.decide', 'session.reset', 'asset.publish', 'runtime.read'];

  return (
    <div className="policy-layout">
      <section className="panel policy-main">
        <div className="section-title">
          <div>
            <p className="eyebrow">Policy & Permissions</p>
            <h2>设置与权限</h2>
          </div>
          <select className="role-select" value={role} onChange={(event) => onRoleChange(event.target.value as RuntimeRole)}>
            {roles.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="permission-matrix">
          <div className="permission-row permission-head">
            <span>Role</span>
            {permissions.map((permission) => <span key={permission}>{permission}</span>)}
          </div>
          {roles.map((item) => (
            <div className={item === role ? 'permission-row active' : 'permission-row'} key={item}>
              <strong>{item}</strong>
              {permissions.map((permission) => (
                <span className={hasPermission(item, permission) ? 'perm yes' : 'perm no'} key={permission}>
                  {hasPermission(item, permission) ? 'yes' : 'no'}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <aside className="panel policy-side">
        <div className="section-title compact">
          <h2>策略规则</h2>
          <Settings size={18} />
        </div>
        <div className="policy-list">
          {policyRules.map((policy) => (
            <div className="policy-card" key={policy.id}>
              <div>
                <code>{policy.id}</code>
                <StatusBadge value={policy.effect} />
              </div>
              <strong>{policy.name}</strong>
              <span>{policy.description}</span>
              <small>{policy.evidence}</small>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
