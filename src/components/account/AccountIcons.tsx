import type { SVGProps } from "react";

/** Icons for the account, wallet and bottom bar screens (same stroke style as Icons.tsx). */
type P = SVGProps<SVGSVGElement>;
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const GamepadIcon = (p: P) => (<svg {...base} {...p}><path d="M7 7h10a5 5 0 0 1 4.9 6l-.6 3a2.6 2.6 0 0 1-4.5 1.3L15 15H9l-1.8 2.3a2.6 2.6 0 0 1-4.5-1.3l-.6-3A5 5 0 0 1 7 7Z" /><path d="M8 10v3M6.5 11.5h3M15.5 11h.01M17.5 12.5h.01" /></svg>);
export const StorefrontIcon = (p: P) => (<svg {...base} {...p}><path d="M4 9.5V20h16V9.5" /><path d="M3 5.5 4.5 3h15L21 5.5V8a2.5 2.5 0 0 1-4.5 1.5A2.5 2.5 0 0 1 12 9.5a2.5 2.5 0 0 1-4.5 0A2.5 2.5 0 0 1 3 8Z" /><path d="M9.5 20v-5h5v5" /></svg>);
export const WalletCardIcon = (p: P) => (<svg {...base} {...p}><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M15 10h6v5h-6a2.5 2.5 0 0 1 0-5Z" /><path d="M16.5 12.5h.01" /></svg>);
export const UserGearIcon = (p: P) => (<svg {...base} {...p}><circle cx="9.5" cy="8" r="4" /><path d="M2.5 20.5c1.2-3.6 3.7-5.5 7-5.5 1.1 0 2.1.2 3 .6" /><circle cx="18" cy="17.5" r="2.2" /><path d="M18 13.8v1.5M18 19.7v1.5M14.3 17.5h1.5M20.2 17.5h1.5M15.4 14.9l1 1M19.6 19.1l1 1M15.4 20.1l1-1M19.6 15.9l1-1" /></svg>);
export const ChevronRightIcon = (p: P) => (<svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>);
export const ReceiptIcon = (p: P) => (<svg {...base} {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>);
export const ReorderIcon = (p: P) => (<svg {...base} {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" /><path d="M4 3.5v5h5" /></svg>);
export const KeyIcon = (p: P) => (<svg {...base} {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M15 8l2 2" /></svg>);
export const InfoIcon = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></svg>);
export const CardPlusIcon = (p: P) => (<svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M16 14v4M14 16h4" /></svg>);
export const UndoIcon = (p: P) => (<svg {...base} {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>);
export const ArrowDownLeftIcon = (p: P) => (<svg {...base} {...p}><path d="M17 7 7 17M16 17H7V8" /></svg>);
export const ArrowUpRightIcon = (p: P) => (<svg {...base} {...p}><path d="M7 17 17 7M8 7h9v9" /></svg>);
export const SlidersIcon = (p: P) => (<svg {...base} {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>);
export const GaugeIcon = (p: P) => (<svg {...base} {...p}><path d="M4.5 18a9 9 0 1 1 15 0" /><path d="m12 13 4-4" /><circle cx="12" cy="13" r="1.3" /></svg>);
export const UnlockIcon = (p: P) => (<svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 7.7-1.5" /></svg>);
export const WrenchIcon = (p: P) => (<svg {...base} {...p}><path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3Z" /><path d="M14.5 6.5 17 4l3 3-2.5 2.5" /></svg>);
export const CheckCheckIcon = (p: P) => (<svg {...base} {...p}><path d="m2 12.5 4 4L14 8.5M10 16.5l1 1 9-9" /></svg>);
