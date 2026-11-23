'use client';

import { Card, PageHeader, Spinner } from '@/components/ui';
import { dateTime, humanize } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';

interface AuditRow {
  id: string;
  adminName: string;
  action: string;
  entityType: string;
  entityId: string;
  before: string | null;
  after: string | null;
  reason: string;
  createdAt: string;
}

export default function AdminAudit() {
  const me = useRequireRole('ADMIN');
  const { data } = useApi<AuditRow[]>(me ? '/admin/audit' : null, 15000);
  if (!me || !data) return <Spinner />;
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" subtitle="A record of account and review decisions, newest first." />
      <Card>
        {data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-medium text-studio-muted">
                <tr><th className="py-2 pr-3">When</th><th className="pr-3">Who</th><th className="pr-3">Action</th><th className="pr-3">Entity</th><th className="pr-3">Change</th><th>Reason</th></tr>
              </thead>
              <tbody className="divide-y divide-studio-border">
                {data.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="whitespace-nowrap py-2 pr-3">{dateTime(l.createdAt)}</td>
                    <td className="pr-3">{l.adminName}</td>
                    <td className="pr-3 font-medium">{humanize(l.action)}</td>
                    <td className="pr-3 font-mono text-xs">{l.entityType} · {l.entityId.slice(-8)}</td>
                    <td className="pr-3">{l.before || l.after ? `${humanize(l.before) || '—'} → ${humanize(l.after) || '—'}` : '—'}</td>
                    <td>{l.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-studio-muted">No entries yet.</p>
        )}
      </Card>
    </div>
  );
}
