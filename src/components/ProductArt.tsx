import Image from "next/image";

/** Original artwork: an accent-colored tile with the product's initials, so no third-party imagery is needed. */
export function ProductArt({ name, accent, image, size = "md", priority = false }: { name: string; accent?: string | null; image?: string | null; size?: "md" | "lg"; priority?: boolean }) {
  if (image) {
    return (
      <div className={`relative aspect-[4/3] overflow-hidden bg-surface-2 ${size === "lg" ? "rounded-3xl" : "rounded-xl"}`}>
        <Image
          src={image}
          alt={name}
          fill
          priority={priority}
          sizes={size === "lg" ? "(min-width: 1024px) 45vw, 100vw" : "(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw"}
          className="object-cover"
        />
      </div>
    );
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const color = accent ?? "#1467F5";
  return (
    <div
      className={`relative grid place-items-center overflow-hidden ${size === "lg" ? "aspect-[4/3] rounded-3xl" : "aspect-[4/3] rounded-xl"}`}
      style={{ background: `linear-gradient(135deg, ${color} 0%, #0D1B35 100%)` }}
      aria-hidden
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/5" />
      <span className={`font-black tracking-tight text-white drop-shadow ${size === "lg" ? "text-6xl" : "text-3xl"}`}>{initials}</span>
    </div>
  );
}
