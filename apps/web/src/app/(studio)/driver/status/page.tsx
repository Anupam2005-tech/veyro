'use client';

import { CheckCircle2, Clock, FileWarning, Ban, XCircle } from 'lucide-react';
import { Alert, Card, KeyValue, LinkButton, PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { dateTime, humanize } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { useRequireRole } from '@/lib/session';

interface ApplicationPayload {
  application: {
    id: string;
    status: string;
    reviewReason: string | null;
    requestedChanges: string[];
    submittedAt: string | null;
    reviewedAt: string | null;
    documents: { id: string; kind: string; filename: string; uploadedAt: string }[];
  } | null;
}

const COPY: Record<string, { icon: typeof Clock; title: string; body: string }> = {
  PENDING_REVIEW: { icon: Clock, title: 'Application under review', body: 'Our team is reviewing your documents. We will notify you when a decision has been made.' },
  NEEDS_CHANGES: { icon: FileWarning, title: 'Changes requested', body: 'Please make the changes below and submit your application again.' },
  REJECTED: { icon: XCircle, title: 'Application not approved', body: 'Your application was not approved. If you can address the reason below, you can update and resubmit it.' },
  APPROVED: { icon: CheckCircle2, title: 'You are approved', body: 'Go online from your dashboard to start receiving trip requests.' },
  DEACTIVATED: { icon: Ban, title: 'Account deactivated', body: 'Your driver account has been deactivated. Please contact support if you think this is a mistake.' },
};

export default function DriverStatusPage() {
  const me = useRequireRole('DRIVER');
  const { data, error } = useApi<ApplicationPayload>(me ? '/drivers/application' : null, 10000);

  if (!me || (!data && !error)) return <Spinner />;
  if (error) return <Alert tone="danger">{error}</Alert>;
  const app = data?.application;
  if (!app || app.status === 'DRAFT') {
    return (
      <div className="space-y-6">
        <PageHeader title="Driver application" />
        <Alert tone="info" title="Application not submitted" action={<LinkButton href="/onboarding/driver">Continue application</LinkButton>}>
          Finish your profile and upload your documents to apply.
        </Alert>
      </div>
    );
  }
  const c = COPY[app.status] ?? COPY.PENDING_REVIEW!;
  const Icon = c.icon;
  const canResubmit = app.status === 'NEEDS_CHANGES' || app.status === 'REJECTED';

  return (
    <div className="space-y-6">
      <PageHeader title="Driver application" action={<StatusBadge status={app.status} />} />
      <Card dark className="space-y-3">
        <Icon className="h-8 w-8 text-studio-brand" aria-hidden />
        <p className="text-2xl font-semibold tabular-nums">{c.title}</p>
        <p className="text-studio-ink">{c.body}</p>
        {app.reviewReason ? <p className="rounded-xl bg-studio-tint p-3 text-sm"><span className="font-semibold">Reason: </span>{app.reviewReason}</p> : null}
        {app.requestedChanges.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {app.requestedChanges.map((x) => <li key={x}>{x}</li>)}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-2">
          {canResubmit ? <LinkButton href="/onboarding/driver">Update application</LinkButton> : null}
          {app.status === 'APPROVED' ? <LinkButton href="/driver">Go to dashboard</LinkButton> : null}
        </div>
      </Card>
      <Card>
        <KeyValue items={[
          ['Submitted', dateTime(app.submittedAt)],
          ['Last reviewed', app.reviewedAt ? dateTime(app.reviewedAt) : 'Not yet'],
          ['Documents', app.documents.map((d) => humanize(d.kind)).join(', ') || 'None'],
        ]} />
      </Card>
      {me.driver?.isSuspended ? <Alert tone="danger" title="Suspended">{me.driver.suspensionReason}</Alert> : null}
    </div>
  );
}
