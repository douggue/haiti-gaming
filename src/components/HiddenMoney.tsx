"use client";
import { useEffect, useState } from "react";

const KEY = "hg_hide_balance";
const EVENT = "hg-hide-balance";

/** Read and change the "hide my balance" choice; every balance on the page follows it at once. */
export function useHiddenBalance(): [boolean, (v: boolean) => void] {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setHidden(localStorage.getItem(KEY) === "1");
      } catch {}
    };
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  const set = (v: boolean) => {
    setHidden(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return [hidden, set];
}

/** A balance amount that turns into •••• when the customer hid their balance (eye button on the wallet card). */
export function HiddenMoney({ text }: { text: string }) {
  const [hidden] = useHiddenBalance();
  return <>{hidden ? "••••" : text}</>;
}
