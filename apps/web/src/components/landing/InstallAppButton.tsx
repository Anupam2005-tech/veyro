'use client';

import * as React from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppButton() {
  const [installEvent, setInstallEvent] =
    React.useState<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  return (
    <button
      type="button"
      aria-label="Install Veyro app"
      onClick={async () => {
        await installEvent.prompt();
        await installEvent.userChoice;
        setInstallEvent(null);
      }}
      className="inline-flex h-10 items-center gap-2 rounded-control border border-night-border px-4 text-xs font-semibold text-night-text hover:bg-night-surface"
    >
      <Download aria-hidden="true" className="h-3.5 w-3.5" />
      Install app
    </button>
  );
}
