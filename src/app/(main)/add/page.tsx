import Header from "@/components/Header";
import { getCategories } from "@/lib/supabase";
import AddFlow from "./AddFlow";

export const dynamic = "force-dynamic";

export default async function AddPage({ searchParams }: { searchParams: Promise<{ url?: string; text?: string }> }) {
  const [{ url, text }, categories] = await Promise.all([searchParams, getCategories()]);
  // The iOS share sheet sometimes sends "caption text https://..." instead of a bare link.
  const raw = `${url ?? ""} ${text ?? ""}`;
  const found = raw.match(/https?:\/\/\S+/)?.[0] ?? "";
  return (
    <>
      <Header title="מתכון חדש" back="/" />
      <main className="mx-auto max-w-2xl px-4 pt-4">
        <AddFlow initialUrl={found} categories={categories} />
      </main>
    </>
  );
}
