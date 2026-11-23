import Link from 'next/link';
import { CalendarClock, Car, KeyRound, MapPin, ShieldCheck, UserCheck } from 'lucide-react';

const STEPS = [
  { icon: Car, title: 'Add your car', body: 'Save the make, model, category and transmission of the car you want driven.' },
  { icon: UserCheck, title: 'Choose a driver', body: 'Compare verified drivers near you who can drive your type of car, with their hourly rates and ratings.' },
  { icon: KeyRound, title: 'Start and end with a code', body: 'Your trip starts and ends with a one-time code you give the driver in person. You pay for the time used.' },
];

const PRICING: [string, string][] = [
  ['Driver fare', "Driver's hourly rate × minutes driven"],
  ['Waiting', 'First 15 minutes free, then a one-time ₹50'],
  ['Customer no-show', '₹150 after 30 minutes of waiting'],
  ['Booking fee', '₹0'],
  ['Fuel, tolls and parking', 'Paid by you directly'],
];

const FAQ: [string, string][] = [
  ['Is Veyro a taxi or car rental service?', 'No. You use your own car. Veyro connects you with an independent professional driver who drives it for you.'],
  ['How is the fare calculated?', "You pay the driver's hourly rate for the minutes between the start and end of the trip. There is no minimum fare. Fuel, tolls and parking are not included."],
  ['What happens if I keep the driver waiting?', 'Waiting is free for the first 15 minutes after the driver arrives. After that a one-time ₹50 charge applies. If you have not started the trip after 30 minutes, the driver can record a no-show and a ₹150 fee applies instead.'],
  ['How far ahead can I book?', 'You can book from 4 hours to 30 days in advance. We offer your trip to suitable drivers from 12 hours before pickup and let you know if nobody has accepted 2 hours before.'],
  ['Can I cancel?', 'Instant bookings can be cancelled free of charge. Scheduled bookings are free to cancel until 5 minutes after a driver accepts. After that a ₹50 fee applies before the driver arrives and ₹100 after.'],
  ['How does the SOS button work?', 'SOS records an alert with your trip details and last known location for the Veyro team. In this version alerts are not yet sent to your emergency contacts. In an emergency, call 112.'],
];

function TripPreview() {
  return (
    <div className="rounded-2xl border border-studio-border bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.06)]" aria-hidden>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Trip estimate</p>
        <span className="rounded-full bg-studio-brand-soft px-2.5 py-0.5 text-xs font-medium text-studio-brand">Instant</span>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-studio-brand text-xs font-semibold text-white">A</span>
          <div>
            <p className="text-sm font-medium">Park Street</p>
            <p className="text-xs text-studio-muted">Pickup</p>
          </div>
        </div>
        <div className="ml-3 h-4 border-l border-dashed border-studio-input-border" />
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-studio-ink text-xs font-semibold text-white">B</span>
          <div>
            <p className="text-sm font-medium">Salt Lake Sector V</p>
            <p className="text-xs text-studio-muted">Destination</p>
          </div>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-studio-border pt-4 text-sm">
        <div>
          <dt className="text-xs text-studio-muted">Distance</dt>
          <dd className="font-semibold">12 km</dd>
        </div>
        <div>
          <dt className="text-xs text-studio-muted">Time</dt>
          <dd className="font-semibold">26 min</dd>
        </div>
        <div>
          <dt className="text-xs text-studio-muted">Estimate</dt>
          <dd className="font-semibold">₹78 to ₹95</dd>
        </div>
      </dl>
      <div className="mt-5 flex items-center justify-between rounded-xl bg-studio-tint p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-studio-brand-soft text-sm font-semibold text-studio-brand">A</span>
          <div>
            <p className="text-sm font-medium">Arjun D.</p>
            <p className="text-xs text-studio-muted">4.8 rating · 9 years driving</p>
          </div>
        </div>
        <p className="text-sm font-semibold">₹220/hr</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-studio-ink">
      <header className="sticky top-0 z-30 border-b border-studio-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <img src="/icons/veyro-light-64.png" alt="" className="h-7 w-7" /> Veyro
          </Link>
          <nav aria-label="Sections" className="hidden gap-6 text-sm text-studio-muted md:flex">
            <a href="#how" className="hover:text-studio-ink">How it works</a>
            <a href="#pricing" className="hover:text-studio-ink">Pricing</a>
            <a href="#safety" className="hover:text-studio-ink">Safety</a>
            <a href="#drivers" className="hover:text-studio-ink">For drivers</a>
            <a href="#faq" className="hover:text-studio-ink">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/auth" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-studio-tint">Sign in</Link>
            <Link href="/auth?role=customer" className="hidden rounded-lg bg-studio-brand px-4 py-2 text-sm font-semibold text-white hover:bg-studio-brand-hover sm:inline-block">
              Book a driver
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-studio-border bg-studio-bg">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.1fr,1fr] lg:py-24">
            <div>
              <p className="text-sm font-medium text-studio-brand">Now available in Kolkata</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">A professional driver for your own car</h1>
              <p className="mt-5 max-w-xl text-lg text-studio-muted">
                Book a verified driver by the hour, for a trip right now or one planned weeks ahead. You keep your car. We find the driver.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/auth?role=customer" className="rounded-lg bg-studio-brand px-5 py-3 text-sm font-semibold text-white hover:bg-studio-brand-hover">
                  Book a driver
                </Link>
                <Link href="/auth?role=driver" className="rounded-lg border border-studio-input-border bg-white px-5 py-3 text-sm font-semibold hover:bg-studio-tint">
                  Become a driver
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-studio-muted">
                <li>No minimum fare</li>
                <li>No booking fee</li>
                <li>Every driver checked by our team</li>
              </ul>
            </div>
            <TripPreview />
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-2 max-w-2xl text-studio-muted">Three steps from booking to drop-off.</p>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-studio-brand-soft text-studio-brand">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold">{i + 1}. {title}</h3>
                <p className="mt-2 text-sm leading-6 text-studio-muted">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-studio-border p-6">
              <MapPin className="h-5 w-5 text-studio-brand" aria-hidden />
              <h3 className="mt-3 font-semibold">Book now</h3>
              <p className="mt-2 text-sm leading-6 text-studio-muted">
                See available drivers within 15 km and send a request to the one you prefer. They have five minutes to respond. If they cannot take it, you choose another driver.
              </p>
            </div>
            <div className="rounded-xl border border-studio-border p-6">
              <CalendarClock className="h-5 w-5 text-studio-brand" aria-hidden />
              <h3 className="mt-3 font-semibold">Schedule ahead</h3>
              <p className="mt-2 text-sm leading-6 text-studio-muted">
                Book from 4 hours to 30 days in advance. Your trip is offered to suitable drivers ahead of time, and we confirm as soon as one accepts.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-studio-border bg-studio-bg">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Simple, hourly pricing</h2>
              <p className="mt-4 leading-7 text-studio-muted">
                Each driver sets their own hourly rate, shown before you book. You pay that rate for the time between the start and end of your trip, calculated to the minute. Veyro does not add a booking fee.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-studio-border bg-white">
              <table className="w-full text-sm">
                <caption className="sr-only">Pricing</caption>
                <tbody className="divide-y divide-studio-border">
                  {PRICING.map(([k, v]) => (
                    <tr key={k}>
                      <th scope="row" className="px-5 py-3.5 text-left font-medium">{k}</th>
                      <td className="px-5 py-3.5 text-right text-studio-muted">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="safety" className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Safety</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div>
              <UserCheck className="h-5 w-5 text-studio-brand" aria-hidden />
              <h3 className="mt-3 font-semibold">Verified drivers</h3>
              <p className="mt-2 text-sm leading-6 text-studio-muted">Our team reviews every driver&apos;s licence, government ID and photo before they can accept trips.</p>
            </div>
            <div>
              <MapPin className="h-5 w-5 text-studio-brand" aria-hidden />
              <h3 className="mt-3 font-semibold">Live trip sharing</h3>
              <p className="mt-2 text-sm leading-6 text-studio-muted">Follow your driver on the map and share your trip with family. You can turn sharing off at any time.</p>
            </div>
            <div>
              <ShieldCheck className="h-5 w-5 text-studio-brand" aria-hidden />
              <h3 className="mt-3 font-semibold">SOS during trips</h3>
              <p className="mt-2 text-sm leading-6 text-studio-muted">One tap records an alert with your location for the Veyro team. In an emergency, always call 112.</p>
            </div>
          </div>
        </section>

        <section id="drivers" className="border-y border-studio-border bg-studio-bg">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Drive with Veyro</h2>
              <p className="mt-2 max-w-xl text-studio-muted">Set your own hourly rate and service area, and keep 100% of your fares. Apply online in a few minutes.</p>
            </div>
            <Link href="/auth?role=driver" className="rounded-lg bg-studio-ink px-5 py-3 text-sm font-semibold text-white hover:bg-black">Apply to drive</Link>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-studio-border border-y border-studio-border">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {q}
                    <span className="text-studio-muted transition group-open:rotate-45" aria-hidden>+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-studio-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-studio-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-studio-muted">
          <p>© 2026 Veyro. Payments currently run in test mode.</p>
          <nav aria-label="Footer" className="flex gap-5">
            <a href="#faq" className="hover:text-studio-ink">Terms</a>
            <a href="#faq" className="hover:text-studio-ink">Privacy</a>
            <Link href="/auth" className="hover:text-studio-ink">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
