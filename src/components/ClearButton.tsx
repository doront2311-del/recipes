/** Small ✕ inside a text field (place the field in a `relative` wrapper). */
export default function ClearButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute inset-y-0 end-2 my-auto flex size-7 items-center justify-center rounded-full bg-line text-sm text-ink/70"
    >
      ✕
    </button>
  );
}
