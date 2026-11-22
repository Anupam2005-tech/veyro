export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-sm opacity-70">
        Application queue, reports, and safety controls. All actions require an
        audit reason and append to the Admin audit log.
      </p>
    </main>
  );
}
