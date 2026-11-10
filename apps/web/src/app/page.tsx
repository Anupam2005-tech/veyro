export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="inline-block px-3 py-1 text-xs font-mono uppercase tracking-wider rounded-full bg-night-surface border border-night-border text-night-muted">
          Veyro Release 1 • Scaffold M0
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-night-text">
          VEYRO
        </h1>
        <p className="text-lg text-night-muted">
          Your keys. Our pro. Zero traffic stress.
        </p>
        <p className="text-sm font-mono text-night-muted/80">
          Next.js App Router scaffold initialized.
        </p>
      </div>
    </main>
  );
}

