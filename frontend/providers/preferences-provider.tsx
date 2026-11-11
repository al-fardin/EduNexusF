"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import { translate, type Language } from "@/lib/translations";
type Preferences = {
  language: Language;
  size: string;
  setLanguage: (value: Language) => void;
  setSize: (value: string) => void;
  t: (text: string) => string;
  locale: string;
};
const Context = createContext<Preferences>({
  language: "en",
  size: "standard",
  setLanguage: () => {},
  setSize: () => {},
  t: (text) => text,
  locale: "en-GB",
});
const defaults = '{"language":"en","size":"standard"}';
let memory = defaults;
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("edunexus:preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("edunexus:preferences", callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem("edunexus:preferences") ?? memory;
  } catch {
    return memory;
  }
}
export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => defaults);
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    value = {};
  }
  const language: Language = value?.language === "bn" ? "bn" : "en",
    size = ["large", "larger"].includes(value?.size) ? value.size : "standard";
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.textSize = size;
  }, [language, size]);
  function save(nextLanguage: Language, nextSize: string) {
    memory = JSON.stringify({ language: nextLanguage, size: nextSize });
    try {
      localStorage.setItem("edunexus:preferences", memory);
    } catch {}
    window.dispatchEvent(new Event("edunexus:preferences"));
  }
  return (
    <Context.Provider
      value={{
        language,
        size,
        setLanguage: (v) => save(v, size),
        setSize: (v) => save(language, v),
        t: (text) => translate(language, text),
        locale: language === "bn" ? "bn-BD" : "en-GB",
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const usePreferences = () => useContext(Context);
