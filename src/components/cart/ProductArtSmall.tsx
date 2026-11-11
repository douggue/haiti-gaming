import Image from "next/image";

export function ProductArtSmall({ name, accent, image, size = "md" }: { name: string; accent?: string | null; image?: string | null; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-12 w-12" : "h-16 w-16 sm:h-20 sm:w-20";
  if (image)
    return (
      <div className={`relative ${box} shrink-0 overflow-hidden rounded-xl bg-surface-2`}>
        <Image src={image} alt="" fill sizes="80px" className="object-cover" />
      </div>
    );
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div
      className={`grid ${box} shrink-0 place-items-center rounded-xl text-lg font-black text-white`}
      style={{ background: `linear-gradient(135deg, ${accent ?? "#1467F5"} 0%, #0D1B35 100%)` }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
