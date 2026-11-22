import { CarFront, Fuel, Gauge, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface VehicleDetails {
  make: string;
  model: string;
  category: string;
  transmission: 'MANUAL' | 'AUTOMATIC';
  fuelType: string;
  registrationNumber?: string;
}

export interface HolographicVehiclePassProps {
  vehicle: VehicleDetails;
  ownerLabel?: string;
  compact?: boolean;
  className?: string;
}

export function HolographicVehiclePass({
  vehicle,
  ownerLabel = 'Customer-owned vehicle',
  compact = false,
  className,
}: HolographicVehiclePassProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card border border-white/15 bg-studio-obsidian p-5 text-white transition-colors duration-150 before:absolute before:inset-x-5 before:top-0 before:h-0.5 before:bg-[#B8F23A]/60 before:content-[\'\']',
        compact ? 'max-w-sm' : 'w-full',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(circle at 85% 10%, rgba(184,242,58,0.22), transparent 42%), radial-gradient(circle at 10% 90%, rgba(170,176,196,0.18), transparent 45%), radial-gradient(circle at 50% 0%, rgba(125,211,252,0.12), transparent 50%)',
        }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
            {ownerLabel}
          </p>
          <p className="mt-2 font-display text-2xl font-bold leading-tight">
            {vehicle.make} {vehicle.model}
          </p>
          {vehicle.registrationNumber ? (
            <p className="mt-1 font-mono text-xs tracking-widest text-white/70">
              {vehicle.registrationNumber}
            </p>
          ) : null}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-white/20 bg-white/10">
          <CarFront aria-hidden="true" className="h-5 w-5 text-[#B8F23A]" />
        </div>
      </div>
      <dl className="relative mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-4 text-xs">
        <div>
          <dt className="flex items-center gap-1 text-white/50">
            <Gauge aria-hidden="true" className="h-3 w-3" /> Category
          </dt>
          <dd className="mt-1 font-semibold capitalize">{vehicle.category}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-white/50">
            <Settings2 aria-hidden="true" className="h-3 w-3" /> Drive
          </dt>
          <dd className="mt-1 font-semibold capitalize">
            {vehicle.transmission.toLowerCase()}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-white/50">
            <Fuel aria-hidden="true" className="h-3 w-3" /> Fuel
          </dt>
          <dd className="mt-1 font-semibold capitalize">{vehicle.fuelType}</dd>
        </div>
      </dl>
    </div>
  );
}
