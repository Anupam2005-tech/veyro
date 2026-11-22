export default function AuthPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="text-sm opacity-70">
        Passwordless only: email link, phone OTP, or Google. No passwords.
      </p>
      <div className="space-y-2">
        <button type="button" className="w-full rounded border px-4 py-2">Continue with email link</button>
        <button type="button" className="w-full rounded border px-4 py-2">Continue with phone OTP</button>
        <button type="button" className="w-full rounded border px-4 py-2">Continue with Google</button>
      </div>
    </main>
  );
}
