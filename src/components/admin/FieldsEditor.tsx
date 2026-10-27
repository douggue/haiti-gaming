"use client";
import { useState } from "react";

type L = Record<string, string>;
type Field = { key: string; label: L; type: "text" | "email" | "number" | "tel" | "select"; required: boolean; placeholder?: string; options?: { value: string; label?: L }[] };

const all = (s: string): L => ({ ht: s, fr: s, en: s, es: s });
const PRESETS: { name: string; fields: Field[] }[] = [
  { name: "Player ID", fields: [{ key: "playerId", label: { ht: "ID jwè", fr: "ID joueur", en: "Player ID", es: "ID de jugador" }, type: "number", required: true, placeholder: "123456789" }] },
  {
    name: "Player ID + server",
    fields: [
      { key: "playerId", label: { ht: "ID jwè", fr: "ID joueur", en: "Player ID", es: "ID de jugador" }, type: "number", required: true },
      { key: "zoneId", label: { ht: "Sèvè / Zòn", fr: "Serveur / Zone", en: "Server / Zone", es: "Servidor / Zona" }, type: "text", required: true },
    ],
  },
  {
    name: "eFootball (Konami)",
    fields: [
      { key: "konamiId", label: all("KONAMI ID"), type: "number", required: true, placeholder: "123456789012" },
      { key: "konamiEmail", label: { ht: "Imèl KONAMI", fr: "Email KONAMI", en: "KONAMI email", es: "Correo KONAMI" }, type: "email", required: true, placeholder: "nom@email.com" },
      { key: "platform", label: { ht: "Platfòm", fr: "Plateforme", en: "Platform", es: "Plataforma" }, type: "select", required: true, options: [{ value: "iPhone" }, { value: "Android" }] },
    ],
  },
  { name: "Email", fields: [{ key: "email", label: { ht: "Imèl", fr: "E-mail", en: "Email", es: "Correo" }, type: "email", required: true }] },
  { name: "Phone", fields: [{ key: "phone", label: { ht: "Nimewo telefòn", fr: "Numéro de téléphone", en: "Phone number", es: "Número de teléfono" }, type: "tel", required: true, placeholder: "+509" }] },
];
const TYPES: [Field["type"], string][] = [["text", "Text"], ["number", "Number"], ["email", "Email"], ["tel", "Phone"], ["select", "Choice (buttons)"]];

/** Visual editor for what the customer must fill in before buying (player ID, Konami email, platform…). Saved as JSON in `name`. */
export function FieldsEditor({ name, initial }: { name: string; initial: string }) {
  const [fields, setFields] = useState<Field[]>(() => {
    try {
      return JSON.parse(initial || "[]");
    } catch {
      return [];
    }
  });
  const set = (i: number, patch: Partial<Field>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(fields)} />
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted">Ready-made:</span>
        {PRESETS.map((p) => (
          <button key={p.name} type="button" onClick={() => setFields(p.fields)} className="badge border border-border bg-surface-2 px-3 py-1.5">{p.name}</button>
        ))}
        {fields.length > 0 && <button type="button" onClick={() => setFields([])} className="badge px-3 py-1.5 text-danger">Clear</button>}
      </div>
      {fields.map((f, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
            <label><span className="mb-1 block text-xs text-muted">Label (Kreyòl)</span><input value={f.label.ht ?? ""} onChange={(e) => set(i, { label: { ...f.label, ht: e.target.value } })} className="input" /></label>
            <label>
              <span className="mb-1 block text-xs text-muted">Type</span>
              <select value={f.type} onChange={(e) => set(i, { type: e.target.value as Field["type"], options: e.target.value === "select" ? f.options ?? [{ value: "iPhone" }, { value: "Android" }] : undefined })} className="input">
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" checked={f.required} onChange={(e) => set(i, { required: e.target.checked })} /> Required</label>
            <button type="button" onClick={() => setFields(fields.filter((_, j) => j !== i))} className="pt-5 text-sm text-danger">Remove</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label><span className="mb-1 block text-xs text-muted">Français</span><input value={f.label.fr ?? ""} onChange={(e) => set(i, { label: { ...f.label, fr: e.target.value } })} className="input" /></label>
            <label><span className="mb-1 block text-xs text-muted">English</span><input value={f.label.en ?? ""} onChange={(e) => set(i, { label: { ...f.label, en: e.target.value } })} className="input" /></label>
            <label><span className="mb-1 block text-xs text-muted">Español</span><input value={f.label.es ?? ""} onChange={(e) => set(i, { label: { ...f.label, es: e.target.value } })} className="input" /></label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label><span className="mb-1 block text-xs text-muted">Code (used by suppliers, e.g. playerId)</span><input value={f.key} onChange={(e) => set(i, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} className="input font-mono" /></label>
            {f.type === "select" ? (
              <label><span className="mb-1 block text-xs text-muted">Choices, separated by commas</span><input defaultValue={(f.options ?? []).map((o) => o.value).join(", ")} onBlur={(e) => set(i, { options: e.target.value.split(",").map((v) => v.trim()).filter(Boolean).map((value) => ({ value })) })} className="input" /></label>
            ) : (
              <label><span className="mb-1 block text-xs text-muted">Example shown in the box</span><input value={f.placeholder ?? ""} onChange={(e) => set(i, { placeholder: e.target.value || undefined })} className="input" /></label>
            )}
          </div>
        </div>
      ))}
      {fields.length < 8 && (
        <button type="button" onClick={() => setFields([...fields, { key: `field${fields.length + 1}`, label: all(""), type: "text", required: true }])} className="btn-secondary min-h-9 px-3 text-xs">+ Add a field</button>
      )}
    </div>
  );
}
