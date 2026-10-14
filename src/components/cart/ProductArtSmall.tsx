export function ProductArtSmall({ name, accent }: { name: string; accent?: string | null }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div
      className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-lg font-black text-white sm:h-20 sm:w-20"
      style={{ background: `linear-gradient(135deg, ${accent ?? "#1467F5"} 0%, #0D1B35 100%)` }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
