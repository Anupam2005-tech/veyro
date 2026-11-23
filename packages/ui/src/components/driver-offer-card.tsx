import type * as React from 'react';
import { Clock3, MapPin, Navigation, Route } from 'lucide-react';
import { VeyroButton } from './button';
import { StatusBadge } from './status-badge';
import { HolographicVehiclePass, type VehicleDetails } from './vehicle-pass';
import { cn } from '../lib/utils';

export interface DriverOfferCardProps {
  vehicle: VehicleDetails;
  pickup: string;
  destination: string;
  estimatedMinutes: number;
  estimatedKm: number;
  estimatedEarnings: string;
  responseDeadline: React.ReactNode;
  scheduled?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  className?: string;
}

export function DriverOfferCard({
  vehicle,
  pickup,
  destination,
  estimatedMinutes,
  estimatedKm,
  estimatedEarnings,
  responseDeadline,
  scheduled = false,
  onAccept,
  onDecline,
  className,
}: DriverOfferCardProps) {
  return (
    <article
      className={cn(
        'border border-theme-border border-l-[3px] border-l-[#B8F23A]/50 rounded-card bg-theme-surface p-5 sm:p-6',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status="pending" label={scheduled ? 'Scheduled offer' : 'Instant offer'} />
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-theme-muted">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
          {responseDeadline}
        </span>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
            <p className="text-sm text-theme-text">{pickup}</p>
          </div>
          <div className="flex items-start gap-3">
            <Navigation aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-theme-muted" />
            <p className="text-sm text-theme-text">{destination}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-theme-muted">
            <span className="inline-flex items-center gap-1.5">
              <Route aria-hidden="true" className="h-3.5 w-3.5" />
              {estimatedKm} km
            </span>
            <span>{estimatedMinutes} min</span>
          </div>
          <p className="font-display text-2xl font-bold text-[color:var(--theme-focus)]">
            {estimatedEarnings}
            <span className="ml-2 font-body text-xs font-normal text-theme-muted">
              estimated earnings
            </span>
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <VeyroButton size="sm" onClick={onAccept}>
              Accept offer
            </VeyroButton>
            <VeyroButton size="sm" variant="secondary" onClick={onDecline}>
              Decline
            </VeyroButton>
          </div>
        </div>
        <HolographicVehiclePass vehicle={vehicle} compact />
      </div>
    </article>
  );
}
