"use client";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { openChat } from "@/actions/market-chat";
import { acceptMarketRules, applyVendor, getMarketRules, cancelMyDeal, confirmDeal, countView, createListing, rateSeller, removeMyListing, reportListing, requestDeal } from "@/actions/market";
import { PLATFORMS } from "@/lib/market";
import { CloseIcon, CopyIcon, ShareIcon, WhatsAppIcon } from "../Icons";
import { PhoneInput } from "../PhoneInput";
import { PhotoPicker } from "../PhotoPicker";
import { compressImage } from "@/lib/compress-image";
import { PlatformIcon } from "./PlatformIcon";

/** Bottom sheet on phones, centered dialog on larger screens. */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost min-h-9 px-2" aria-label="Close"><CloseIcon width={18} height={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** The Market rules: shown once; the person ticks the box to go on. */
export function RulesSheet({ open, onClose, onAccepted }: { open: boolean; onClose: () => void; onAccepted: () => void }) {
  const t = useTranslations("market");
  const locale = useLocale();
  const [ok, setOk] = useState(false);
  const [rules, setRules] = useState<string[] | null>(null);
  const [pending, start] = useTransition();
  // Staff can edit the rules, so they're loaded when the sheet opens.
  useEffect(() => {
    if (open && !rules) getMarketRules(locale).then(setRules).catch(() => setRules([]));
  }, [open, rules, locale]);
  return (
    <Sheet open={open} onClose={onClose} title={t("rulesTitle")}>
      {rules === null ? (
        <p className="py-6 text-center text-sm text-muted">…</p>
      ) : (
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {rules.map((r, i) => <li key={i} className="whitespace-pre-wrap">{r}</li>)}
        </ol>
      )}
      <label className="mt-4 flex items-start gap-2 text-sm font-medium">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 size-4" />
        {t("rulesAgree")}
      </label>
      <button
        type="button"
        className="btn-primary mt-4 w-full"
        disabled={!ok || pending || rules === null}
        onClick={() =>
          start(async () => {
            const r = await acceptMarketRules();
            if (r.ok) onAccepted();
          })
        }
      >
        {t("rulesContinue")}
      </button>
    </Sheet>
  );
}

export function RulesLink() {
  const t = useTranslations("market");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="text-sm font-semibold text-primary underline-offset-2 hover:underline" onClick={() => setOpen(true)}>{t("rulesLink")}</button>
      <RulesSheet open={open} onClose={() => setOpen(false)} onAccepted={() => setOpen(false)} />
    </>
  );
}

/** Share a listing: WhatsApp, copy the link, or the phone's own share menu. */
export function ShareButton({ url, text, compact, iconOnly }: { url: string; text: string; compact?: boolean; iconOnly?: boolean }) {
  const t = useTranslations("market");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => setNative(typeof navigator !== "undefined" && "share" in navigator), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={compact ? "btn-secondary min-h-9 px-3 text-xs" : "btn-secondary min-h-11"} aria-label={t("share")}>
        <ShareIcon width={16} height={16} /> {!iconOnly && t("share")}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("shareTitle")}>
        <div className="grid gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener" className="btn-secondary min-h-12 justify-start">
            <WhatsAppIcon width={20} height={20} className="text-[#1fa855]" /> WhatsApp
          </a>
          <button
            type="button"
            className="btn-secondary min-h-12 justify-start"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
          >
            <CopyIcon width={18} height={18} /> {copied ? t("copied") : t("copyLink")}
          </button>
          {native && (
            <button type="button" className="btn-secondary min-h-12 justify-start" onClick={() => navigator.share({ title: text, url }).catch(() => undefined)}>
              <ShareIcon width={18} height={18} /> {t("otherApps")}
            </button>
          )}
        </div>
      </Sheet>
    </>
  );
}

const errText = (t: ReturnType<typeof useTranslations<"market">>, e: string) => {
  const [code, ref] = e.split(":");
  const text = t.has(`err_${code}`) ? t(`err_${code}` as "err_error") : t("err_error");
  return ref ? `${text} (${ref})` : text;
};

/** "Buy now (frozen payment)": reserves the account and opens WhatsApp with the agent. */
export function BuyButton({ listingId, locale, signedIn, rulesAccepted, disabledLabel, label }: { listingId: string; locale: string; signedIn: boolean; rulesAccepted: boolean; disabledLabel?: string; label?: string }) {
  const t = useTranslations("market");
  const router = useRouter();
  const [rules, setRules] = useState(false);
  const [accepted, setAccepted] = useState(rulesAccepted);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const buy = () =>
    start(async () => {
      setError("");
      const r = await requestDeal(listingId, locale);
      if (!r.ok) {
        if (r.error === "rules") setRules(true);
        else setError(errText(t, r.error));
        return;
      }
      router.refresh();
      if (r.whatsapp) window.location.href = r.whatsapp;
    });
  if (disabledLabel) return <button type="button" className="btn-primary min-h-12 w-full" disabled>{disabledLabel}</button>;
  if (!signedIn) return <Link href={`/auth/login?next=/market/${listingId}`} className="btn-primary min-h-12 w-full">{t("signInToBuy")}</Link>;
  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary min-h-12 w-full" disabled={pending} onClick={() => (accepted ? buy() : setRules(true))}>
        🔒 {pending ? t("opening") : (label ?? t("buyNow"))}
      </button>
      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <RulesSheet
        open={rules}
        onClose={() => setRules(false)}
        onAccepted={() => {
          setRules(false);
          setAccepted(true);
          buy();
        }}
      />
    </div>
  );
}

/** "Ekri machann nan": opens the chat with the seller about this account. */
export function ChatButton({ listingId, signedIn }: { listingId: string; signedIn: boolean }) {
  const t = useTranslations("chat");
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!signedIn) return <Link href={`/auth/login?next=/market/${listingId}`} className="btn-secondary min-h-11">💬 {t("writeSeller")}</Link>;
  return (
    <span className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className="btn-secondary min-h-11 w-full"
        onClick={() =>
          start(async () => {
            const r = await openChat(listingId);
            if (r.ok) router.push(`/account/messages/${r.id}`);
            else setError(t.has(`err_${r.error}`) ? t(`err_${r.error}` as "err_error") : t("err_error"));
          })
        }
      >
        💬 {t("writeSeller")}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

export function ViewCounter({ id }: { id: string }) {
  useEffect(() => {
    const k = `mv:${id}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {}
    countView(id);
  }, [id]);
  return null;
}

export function ReportButton({ listingId, signedIn }: { listingId: string; signedIn: boolean }) {
  const t = useTranslations("market");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  if (!signedIn) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-muted underline-offset-2 hover:text-danger hover:underline">⚑ {t("report")}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("reportTitle")}>
        {msg ? (
          <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">{msg}</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await reportListing(listingId, reason);
                setMsg(r.ok ? t("reportSent") : errText(t, r.error));
              });
            }}
          >
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} minLength={5} maxLength={500} required placeholder={t("reportPlaceholder")} className="input py-2" />
            <button className="btn-danger w-full" disabled={pending}>{t("reportSend")}</button>
          </form>
        )}
      </Sheet>
    </>
  );
}

/** Suggested detail names per platform (the seller can change them). */
const DETAIL_HINTS: Record<string, string[]> = {
  freefire: ["Level", "Rank", "Region", "Diamonds", "Skins", "Linked to"],
  pubg: ["Level", "Tier", "Region", "UC", "Skins", "Linked to"],
  codm: ["Level", "Rank", "Region", "CP", "Weapons", "Linked to"],
  efootball: ["Team strength", "Coins", "GP", "Epic players", "Platform", "Linked to"],
  tiktok: ["Followers", "Likes", "Niche", "Country", "Monetized", "Created"],
  instagram: ["Followers", "Posts", "Niche", "Country", "Engagement", "Created"],
  facebook: ["Followers", "Type", "Niche", "Country", "Monetized", "Created"],
  youtube: ["Subscribers", "Views", "Niche", "Country", "Monetized", "Created"],
  other: ["Level", "Region", "Linked to", "", "", ""],
};

export function SellForm({ commissionPct, rulesAccepted }: { commissionPct: number; rulesAccepted: boolean }) {
  const t = useTranslations("market");
  const router = useRouter();
  const [platform, setPlatform] = useState<string>("freefire");
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [rules, setRules] = useState(!rulesAccepted);
  const [pending, start] = useTransition();
  const hints = DETAIL_HINTS[platform] ?? DETAIL_HINTS.other;
  return (
    <form
      className="card space-y-5 p-5"
      action={(fd) =>
        start(async () => {
          setError("");
          const r = await createListing(fd);
          if (r.ok) router.push("/account/market?posted=1");
          else if (r.error === "rules") setRules(true);
          else setError(errText(t, r.error));
        })
      }
    >
      <fieldset>
        <legend className="label">{t("platform")}</legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <label key={p.key} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium ${platform === p.key ? "border-primary bg-primary text-white" : "border-border hover:bg-surface-2"}`}>
              <input type="radio" name="platform" value={p.key} checked={platform === p.key} onChange={() => setPlatform(p.key)} className="sr-only" />
              <PlatformIcon platform={p.key} size={20} className="-ml-1 inline-block align-[-5px]" /> {p.key === "other" ? t("otherPlatform") : p.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">{t("titleLabel")}</span>
        <input name="title" required minLength={3} maxLength={80} placeholder={t("titlePlaceholder")} className="input" />
      </label>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="block">
          <span className="label">{t("priceLabel")}</span>
          <input name="price" required inputMode="decimal" placeholder="5000" className="input" />
        </label>
        <label className="block">
          <span className="label">{t("currency")}</span>
          <select name="currency" className="input" defaultValue="HTG">
            <option value="HTG">HTG</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>
      <p className="-mt-3 text-xs text-muted">{t("commissionHint", { pct: commissionPct })}</p>
      <fieldset>
        <legend className="label">{t("detailsLabel")}</legend>
        <div className="grid gap-2">
          {hints.map((h, i) => (
            <div key={`${platform}-${i}`} className="grid grid-cols-[2fr_3fr] gap-2">
              <input name={`dl${i}`} defaultValue={h} maxLength={30} placeholder={t("detailName")} className="input" aria-label={t("detailName")} />
              <input name={`dv${i}`} maxLength={60} placeholder={t("detailValue")} className="input" aria-label={t("detailValue")} />
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">{t("detailsHint")}</p>
      </fieldset>
      <label className="block">
        <span className="label">{t("notesLabel")}</span>
        <textarea name="description" rows={4} maxLength={1500} placeholder={t("notesPlaceholder")} className="input py-2" />
      </label>
      <fieldset className="space-y-3 rounded-2xl border-2 border-amber-400/60 bg-amber-400/10 p-4">
        <legend className="px-1 text-sm font-bold">🔐 {t("credTitle")}</legend>
        <p className="text-xs text-muted">{t("credHint")}</p>
        <label className="block"><span className="label">{t("credLogin")}</span><input name="credLogin" required maxLength={120} autoComplete="off" autoCapitalize="none" spellCheck={false} className="input" /></label>
        <label className="block"><span className="label">{t("credPassword")}</span><input name="credPassword" type="password" required maxLength={120} autoComplete="new-password" className="input" /></label>
        <label className="block">
          <span className="label">{t("credLinked")}</span>
          <select name="credLinked" className="input" defaultValue="">
            <option value="">{t("credLinkedNone")}</option>
            {["Facebook", "Google", "VK", "X / Twitter", "Apple", "Email", "Huawei"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="block"><span className="label">{t("credNote")}</span><input name="credNote" maxLength={300} placeholder={t("credNotePh")} className="input" /></label>
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="withEmail" className="size-4" /> {t("withEmail")}</label>
      <div>
        <span className="label">{t("photos")}</span>
        <input
          type="file"
          name="images"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:font-semibold"
          onChange={async (e) => {
            const input = e.currentTarget;
            const picked = Array.from(input.files ?? []).slice(0, 5);
            previews.forEach((u) => URL.revokeObjectURL(u));
            // Phone photos are shrunk before sending (big iPhone pictures would be refused).
            const small = await Promise.all(picked.map((f) => compressImage(f).catch(() => f)));
            const dt = new DataTransfer();
            small.forEach((f) => dt.items.add(f));
            input.files = dt.files;
            setPreviews(small.map((f) => URL.createObjectURL(f)));
          }}
        />
        <p className="mt-1 text-xs text-muted">{t("photosHint")}</p>
        {previews.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {previews.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
            ))}
          </div>
        )}
      </div>
      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <button className="btn-primary min-h-12 w-full" disabled={pending}>{pending ? t("sending") : t("submitListing")}</button>
      <p className="text-xs text-muted">{t("reviewHint")}</p>
      <RulesSheet open={rules} onClose={() => router.push("/market")} onAccepted={() => setRules(false)} />
    </form>
  );
}

/** Buttons on "My Market": remove a listing, cancel / confirm a purchase, rate the seller. */
export function MarketAction({ kind, id }: { kind: "remove" | "cancel" | "confirm"; id: string }) {
  const t = useTranslations("market");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = { remove: removeMyListing, cancel: cancelMyDeal, confirm: confirmDeal }[kind];
  const label = { remove: t("remove"), cancel: t("cancelDeal"), confirm: t("confirmReceived") }[kind];
  const ask = { remove: t("removeConfirm"), cancel: t("cancelConfirm"), confirm: t("confirmConfirm") }[kind];
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className={kind === "confirm" ? "btn-primary min-h-9 px-3 text-xs" : "btn-secondary min-h-9 px-3 text-xs"}
        onClick={() => {
          if (!window.confirm(ask)) return;
          start(async () => {
            const r = await run(id);
            if (r.ok) router.refresh();
            else setError(errText(t, r.error));
          });
        }}
      >
        {label}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

export function RateSeller({ dealId }: { dealId: string }) {
  const t = useTranslations("market");
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2 rounded-xl bg-surface-2 p-3">
      <p className="text-sm font-semibold">{t("rateTitle")}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={t("rateTitle")}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" role="radio" aria-checked={stars === s} aria-label={`${s}`} onClick={() => setStars(s)} className={`text-2xl ${s <= stars ? "text-amber-400" : "text-border"}`}>★</button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("rateNote")} className="input" />
      <button
        type="button"
        disabled={!stars || pending}
        className="btn-primary min-h-9 px-3 text-xs"
        onClick={() =>
          start(async () => {
            const r = await rateSeller(dealId, stars, note);
            if (r.ok) router.refresh();
          })
        }
      >
        {t("rateSend")}
      </button>
    </div>
  );
}

/** Vendor enrollment: staff contacts the applicant on WhatsApp, then approves or rejects. */
export function VendorForm({ rulesAccepted, again, idRequired = true }: { rulesAccepted: boolean; again?: boolean; idRequired?: boolean }) {
  const t = useTranslations("market");
  const router = useRouter();
  const [error, setError] = useState("");
  const [rules, setRules] = useState(!rulesAccepted);
  const [pending, start] = useTransition();
  return (
    <form
      className="card space-y-4 p-5"
      action={(fd) =>
        start(async () => {
          setError("");
          const r = await applyVendor(fd);
          if (r.ok) router.refresh();
          else if (r.error === "rules") setRules(true);
          else setError(errText(t, r.error));
        })
      }
    >
      <h2 className="text-lg font-bold">{again ? t("vendorAgain") : t("vendorTitle")}</h2>
      <p className="text-sm text-muted">{t("vendorIntro")}</p>
      <label className="block"><span className="label">{t("shopName")}</span><input name="shopName" required minLength={3} maxLength={40} placeholder={t("shopNamePh")} className="input" /></label>
      <label className="block"><span className="label">{t("legalName")}</span><input name="legalName" required minLength={3} maxLength={80} autoComplete="name" className="input" /><span className="mt-1 block text-xs text-muted">{t("legalNameHint")}</span></label>
      <div><label htmlFor="vendor-phone" className="label">{t("vendorWhatsapp")}</label><PhoneInput id="vendor-phone" name="whatsapp" required /></div>
      <label className="block"><span className="label">{t("city")}</span><input name="city" required maxLength={60} autoComplete="address-level2" className="input" /></label>
      <fieldset>
        <legend className="label">{t("vendorPlatforms")}</legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <label key={p.key} className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white">
              <input type="checkbox" name="platforms" value={p.key} className="sr-only" />
              <PlatformIcon platform={p.key} size={20} className="-ml-1 inline-block align-[-5px]" /> {p.key === "other" ? t("otherPlatform") : p.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">{t("volume")}</span>
        <select name="volume" required defaultValue="" className="input">
          <option value="" disabled>{t("choose")}</option>
          <option value="1-2">{t("volume1")}</option>
          <option value="3-10">{t("volume2")}</option>
          <option value="10+">{t("volume3")}</option>
        </select>
      </label>
      <label className="block"><span className="label">{t("about")}</span><textarea name="about" rows={3} maxLength={1000} placeholder={t("aboutPh")} className="input py-2" /></label>
      <div>
        <span className="label">{t("idPhoto")}{idRequired ? "" : ` (${t("optional")})`}</span>
        <PhotoPicker name="idPhoto" label={t("idPhoto")} hint={t("idPhotoHint")} />
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="agree" required className="mt-0.5 size-4" /> {t("vendorAgree")}</label>
      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <button className="btn-primary min-h-12 w-full" disabled={pending}>{pending ? t("sending") : t("vendorSubmit")}</button>
      <RulesSheet open={rules} onClose={() => router.push("/market")} onAccepted={() => setRules(false)} />
    </form>
  );
}
