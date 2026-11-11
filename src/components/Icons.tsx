import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const CartIcon = (p: P) => (<svg {...base} {...p}><path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2" /><circle cx="9.5" cy="20" r="1.2" /><circle cx="17.5" cy="20" r="1.2" /></svg>);
export const UserIcon = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>);
export const MenuIcon = (p: P) => (<svg {...base} {...p}><path d="M4 6h16M4 12h16M4 18h16" /></svg>);
export const CloseIcon = (p: P) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const SearchIcon = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const SunIcon = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
export const MoonIcon = (p: P) => (<svg {...base} {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>);
export const BellIcon = (p: P) => (<svg {...base} {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>);
export const WalletIcon = (p: P) => (<svg {...base} {...p}><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /></svg>);
export const BoltIcon = (p: P) => (<svg {...base} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg>);
export const ShieldIcon = (p: P) => (<svg {...base} {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>);
export const ChatIcon = (p: P) => (<svg {...base} {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>);
export const PinIcon = (p: P) => (<svg {...base} {...p}><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>);
export const ArrowRightIcon = (p: P) => (<svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const SwapIcon = (p: P) => (<svg {...base} {...p}><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>);
export const PlusIcon = (p: P) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const CopyIcon = (p: P) => (<svg {...base} {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>);
export const GlobeIcon = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>);

export const WhatsAppIcon = (p: P) => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden {...p}>
    <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z" />
  </svg>
);
export const HomeIcon = (p: P) => (<svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></svg>);
export const StoreIcon = (p: P) => (<svg {...base} {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>);
export const TagIcon = (p: P) => (<svg {...base} {...p}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>);
export const BookIcon = (p: P) => (<svg {...base} {...p}><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2Z" /><path d="M4 20a2 2 0 0 0 2 2h13v-4" /><path d="M9 8h6" /></svg>);
export const NewsIcon = (p: P) => (<svg {...base} {...p}><path d="M4 4h13v16H6a2 2 0 0 1-2-2Z" /><path d="M17 8h3v10a2 2 0 0 1-2 2" /><path d="M8 8h5M8 12h5M8 16h3" /></svg>);
export const HelpIcon = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01" /></svg>);
export const BagIcon = (p: P) => (<svg {...base} {...p}><path d="M6 7h12l1 13H5Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>);
export const FileIcon = (p: P) => (<svg {...base} {...p}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>);
export const LoginIcon = (p: P) => (<svg {...base} {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></svg>);
export const UserPlusIcon = (p: P) => (<svg {...base} {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" /><path d="M19 8v6M16 11h6" /></svg>);
export const LogoutIcon = (p: P) => (<svg {...base} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>);
export const ShareIcon = (p: P) => (<svg {...base} {...p}><path d="M12 15V3M8 7l4-4 4 4" /><path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" /></svg>);
export const PlusSquareIcon = (p: P) => (<svg {...base} {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></svg>);
export const PhoneDownIcon = (p: P) => (<svg {...base} {...p}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M12 7v7M9 11l3 3 3-3M10.5 18.5h3" /></svg>);
export const GiftIcon = (p: P) => (<svg {...base} {...p}><rect x="3" y="8" width="18" height="5" rx="1" /><path d="M5 13v7h14v-7M12 8v12M12 8S10.5 3 8 4s-1 4 4 4ZM12 8s1.5-5 4-4 1 4-4 4Z" /></svg>);
export const LockIcon = (p: P) => (<svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>);
export const HeadsetIcon = (p: P) => (<svg {...base} {...p}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /><path d="M19 20a3 3 0 0 1-3 2h-2" /></svg>);
export const SendIcon = (p: P) => (<svg {...base} {...p}><path d="M21 3 10 14" /><path d="m21 3-7 18-4-7-7-4Z" /></svg>);

// ── Icons that replace emoji in the interface (same stroke style) ──
export const SmartphoneIcon = (p: P) => (<svg {...base} {...p}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></svg>);
export const LaptopIcon = (p: P) => (<svg {...base} {...p}><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></svg>);
export const ClockIcon = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const HourglassIcon = (p: P) => (<svg {...base} {...p}><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" /></svg>);
export const AlertIcon = (p: P) => (<svg {...base} {...p}><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17v.01" /></svg>);
export const BanIcon = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="m5.7 5.7 12.6 12.6" /></svg>);
export const CoinIcon = (p: P) => (<svg {...base} {...p}><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></svg>);
export const EyeIcon = (p: P) => (<svg {...base} {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
export const StarIcon = (p: P) => (<svg {...base} {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" /></svg>);
export const FireIcon = (p: P) => (<svg {...base} {...p}><path d="M12 22c4 0 7-2.7 7-6.6 0-3.4-2.2-5.6-3.6-7.4-.5 1.9-1.6 3-2.9 3.5.4-3.3-1-6.3-3.5-8.5C9 6.4 5 9.3 5 15.4 5 19.3 8 22 12 22Z" /></svg>);
export const DownloadIcon = (p: P) => (<svg {...base} {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>);
export const MoneyIcon = (p: P) => (<svg {...base} {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9v.01M18 15v.01" /></svg>);
export const HashIcon = (p: P) => (<svg {...base} {...p}><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" /></svg>);
export const MonitorIcon = (p: P) => (<svg {...base} {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>);
export const AndroidIcon = (p: P) => (<svg {...base} {...p}><path d="M6 10a6 6 0 0 1 12 0v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1Z" /><path d="M8 4.5 9.2 6.5M16 4.5l-1.2 2M9.5 11v.01M14.5 11v.01M6 13H4M20 13h-2" /></svg>);
export const FlagIcon = (p: P) => (<svg {...base} {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>);
