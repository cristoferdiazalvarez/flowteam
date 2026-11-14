'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Let’s get you back in flow.</h1>
      <p>Something unexpected happened. Your saved work is safe.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
