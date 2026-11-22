'use client';

import * as React from 'react';
import { SafetyActionButton } from '@veyro/ui';

export function DemoSosAction() {
  const [recorded, setRecorded] = React.useState(false);

  return (
    <div>
      <SafetyActionButton
        demoMode
        onClick={() => setRecorded(true)}
        label="Demo SOS"
      />
      {recorded ? (
        <p role="status" className="mt-2 text-xs text-night-muted">
          Demo event recorded in this session — no external message sent.
        </p>
      ) : null}
    </div>
  );
}
