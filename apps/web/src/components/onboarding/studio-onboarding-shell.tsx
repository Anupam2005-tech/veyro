import type * as React from 'react';
import { AppShell } from '@veyro/ui';
import { OnboardingHeader } from './onboarding-header';

export interface StudioOnboardingShellProps {
  title: string;
  subtitle: string;
  stepLabel?: string;
  children: React.ReactNode;
}

export function StudioOnboardingShell({
  title,
  subtitle,
  stepLabel,
  children,
}: StudioOnboardingShellProps) {
  return (
    <AppShell theme="studio">
      <OnboardingHeader title={title} subtitle={subtitle} stepLabel={stepLabel} />
      <div className="bg-studio-bg">{children}</div>
    </AppShell>
  );
}
