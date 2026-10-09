import Link from "next/link";

export default function Header({ title, back }: { title?: string; back?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
        {back ? (
          <Link href={back} className="-ms-2 rounded-full p-2 text-xl" aria-label="חזרה">
            →
          </Link>
        ) : null}
        <Link href="/" className="truncate text-lg font-bold">
          {title ?? "המתכונים שלי"}
        </Link>
        <div className="ms-auto flex items-center gap-1">
          <Link href="/settings" className="rounded-full p-2 text-xl" aria-label="הגדרות">
            ⚙️
          </Link>
          <Link href="/add" className="btn-primary px-3 py-1.5 text-sm">
            + מתכון
          </Link>
        </div>
      </div>
    </header>
  );
}
