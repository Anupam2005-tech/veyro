import { CarFront, KeyRound, Route } from 'lucide-react';

const steps = [
  {
    icon: KeyRound,
    number: '01',
    title: 'Your car. Your keys.',
    copy: 'Add your vehicle once. Make, model, category and transmission are used to match you with a driver who can operate it.',
  },
  {
    icon: Route,
    number: '02',
    title: 'Set the route.',
    copy: 'Choose pickup, destination and up to three stops. Preview the road route, distance and estimated duration before you confirm.',
  },
  {
    icon: CarFront,
    number: '03',
    title: 'Our chauffeur drives.',
    copy: 'Pick a driver, share the OTP at arrival and go. The driver provides the service — the vehicle stays yours.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-night-border py-16 sm:py-24">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-night-accent">
          How it works
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold text-night-text sm:text-4xl">
          Your Car. Your Keys. Our Chauffeur.
        </h2>
        <p className="mt-4 max-w-2xl text-night-muted">
          Veyro is not a taxi fleet or a rental service. We connect a vehicle
          owner with an independent professional driver.
        </p>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-card border border-night-border bg-night-border md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.number} className="bg-night-surface p-6 sm:p-8">
                <div className="flex items-center justify-between border-b border-night-border pb-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-control bg-night-canvas text-night-accent">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-night-muted">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-bold text-night-text">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-night-muted">
                  {step.copy}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
