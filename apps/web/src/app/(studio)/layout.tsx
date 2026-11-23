import { AppShell } from '@/components/AppShell';

/** Veyro Studio Light — every signed-in customer, driver and Admin screen. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
