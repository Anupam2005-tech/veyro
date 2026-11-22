import { KeyRound, ShieldCheck } from 'lucide-react';
import { HolographicVehiclePass } from '@veyro/ui';

const demoVehicle = {
  make: 'Honda',
  model: 'City',
  category: 'sedan',
  transmission: 'AUTOMATIC' as const,
  fuelType: 'petrol',
  registrationNumber: 'KA 01 AB 1234',
};

export function VehicleExplainer() {
  return (
    <section id="vehicle" className="border-b border-night-border py-20 sm:py-24">
      <div className="mx-auto grid max-w-content items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="order-2 lg:order-1">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-night-accent">
            Customer-owned vehicle
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold text-night-text sm:text-4xl">
            The car stays yours. Always.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-night-muted sm:text-base">
            Your vehicle pass carries the details a driver needs to know —
            category, transmission and fuel type. Matching uses category and
            transmission; fuel is informational only.
          </p>
          <ul className="mt-8 space-y-4">
            <li className="flex items-start gap-3 text-sm text-night-muted">
              <KeyRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-night-accent" />
              You keep the keys and stay the vehicle owner throughout the trip.
            </li>
            <li className="flex items-start gap-3 text-sm text-night-muted">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-night-accent" />
              Drivers are matched to your vehicle’s category and transmission.
            </li>
          </ul>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-night-muted">
            Illustrative pass · demo details
          </p>
        </div>
        <div className="order-1 lg:order-2">
          <HolographicVehiclePass vehicle={demoVehicle} className="veyro-float" />
        </div>
      </div>
    </section>
  );
}
