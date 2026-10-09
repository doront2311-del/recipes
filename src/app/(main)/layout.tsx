import { setupProblem } from "@/lib/setup-check";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const problem = await setupProblem();
  if (!problem) return children;
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="text-4xl">🛠️</div>
      <h1 className="mt-3 text-2xl font-bold">{problem.title}</h1>
      <p className="mt-3 leading-relaxed" dir="auto">
        {problem.details}
      </p>
      <p className="mt-6 text-sm text-muted">אחרי התיקון, רענן את הדף.</p>
    </main>
  );
}
