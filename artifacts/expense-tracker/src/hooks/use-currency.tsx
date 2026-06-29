import { createContext, useContext, useState } from "react";

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", symbol: "$", label: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", label: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", label: "British Pound", locale: "en-GB" },
  { code: "INR", symbol: "₹", label: "Indian Rupee", locale: "en-IN" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen", locale: "ja-JP" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar", locale: "en-CA" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar", locale: "en-AU" },
  { code: "CHF", symbol: "Fr", label: "Swiss Franc", locale: "de-CH" },
  { code: "CNY", symbol: "¥", label: "Chinese Yuan", locale: "zh-CN" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real", locale: "pt-BR" },
  { code: "MXN", symbol: "MX$", label: "Mexican Peso", locale: "es-MX" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar", locale: "en-SG" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham", locale: "ar-AE" },
  { code: "KRW", symbol: "₩", label: "South Korean Won", locale: "ko-KR" },
];

interface CurrencyContextType {
  currency: CurrencyOption;
  setCurrency: (c: CurrencyOption) => void;
  format: (amount: number, compact?: boolean) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyOption>(() => {
    const saved = localStorage.getItem("preferred_currency");
    return CURRENCIES.find(c => c.code === saved) ?? CURRENCIES[0];
  });

  const setCurrency = (c: CurrencyOption) => {
    localStorage.setItem("preferred_currency", c.code);
    setCurrencyState(c);
  };

  const format = (amount: number, compact = false): string => {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    try {
      const formatted = new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        notation: compact && abs >= 1000 ? "compact" : "standard",
        minimumFractionDigits: currency.code === "JPY" || currency.code === "KRW" ? 0 : 2,
        maximumFractionDigits: currency.code === "JPY" || currency.code === "KRW" ? 0 : 2,
      }).format(abs);
      return sign + formatted;
    } catch {
      return `${sign}${currency.symbol}${abs.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
