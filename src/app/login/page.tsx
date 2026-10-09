import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="text-5xl">🍲</div>
        <h1 className="mt-3 text-2xl font-bold">המתכונים שלי</h1>
      </div>
      <LoginForm next={safeNext} />
    </main>
  );
}
