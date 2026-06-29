import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", symbol: "$",    label: "US Dollar",         locale: "en-US" },
  { code: "EUR", symbol: "€",    label: "Euro",              locale: "de-DE" },
  { code: "GBP", symbol: "£",    label: "British Pound",     locale: "en-GB" },
  { code: "INR", symbol: "₹",    label: "Indian Rupee",      locale: "en-IN" },
  { code: "JPY", symbol: "¥",    label: "Japanese Yen",      locale: "ja-JP" },
  { code: "CAD", symbol: "CA$",  label: "Canadian Dollar",   locale: "en-CA" },
  { code: "AUD", symbol: "A$",   label: "Australian Dollar", locale: "en-AU" },
  { code: "CHF", symbol: "Fr",   label: "Swiss Franc",       locale: "de-CH" },
  { code: "CNY", symbol: "¥",    label: "Chinese Yuan",      locale: "zh-CN" },
  { code: "BRL", symbol: "R$",   label: "Brazilian Real",    locale: "pt-BR" },
  { code: "MXN", symbol: "MX$",  label: "Mexican Peso",      locale: "es-MX" },
  { code: "SGD", symbol: "S$",   label: "Singapore Dollar",  locale: "en-SG" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham",        locale: "ar-AE" },
  { code: "KRW", symbol: "₩",    label: "South Korean Won",  locale: "ko-KR" },
  { code: "THB", symbol: "฿",    label: "Thai Baht",         locale: "th-TH" },
  { code: "ZAR", symbol: "R",    label: "South African Rand",locale: "en-ZA" },
  { code: "NGN", symbol: "₦",    label: "Nigerian Naira",    locale: "en-NG" },
  { code: "PKR", symbol: "₨",    label: "Pakistani Rupee",   locale: "ur-PK" },
  { code: "BDT", symbol: "৳",    label: "Bangladeshi Taka",  locale: "bn-BD" },
  { code: "EGP", symbol: "£",    label: "Egyptian Pound",    locale: "ar-EG" },
];

const RATES_CACHE_KEY = "fx_rates_cache";
const RATES_TTL_MS = 60 * 60 * 1000; // 1 hour

interface RatesCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

function loadCachedRates(): RatesCache | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const parsed: RatesCache = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > RATES_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedRates(rates: Record<string, number>) {
  try {
    const cache: RatesCache = { rates, fetchedAt: Date.now() };
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

interface CurrencyContextType {
  currency: CurrencyOption;
  setCurrency: (c: CurrencyOption) => void;
  format: (amountUSD: number, compact?: boolean) => string;
  convert: (amountUSD: number) => number;
  rate: number;
  ratesUpdatedAt: Date | null;
  ratesLoading: boolean;
  ratesError: boolean;
  refetchRates: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyOption>(() => {
    const saved = localStorage.getItem("preferred_currency");
    return CURRENCIES.find(c => c.code === saved) ?? CURRENCIES[0];
  });

  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<Date | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(false);

  const fetchRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(false);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      if (json.result !== "success" || !json.rates) throw new Error("bad response");
      const newRates: Record<string, number> = { USD: 1, ...json.rates };
      setRates(newRates);
      setRatesUpdatedAt(new Date());
      setRatesError(false);
      saveCachedRates(newRates);
    } catch {
      setRatesError(true);
      // keep whatever rates we have (fallback to 1:1 if none)
    } finally {
      setRatesLoading(false);
    }
  }, []);

  // On mount: use cache if fresh, otherwise fetch live
  useEffect(() => {
    const cached = loadCachedRates();
    if (cached) {
      setRates(cached.rates);
      setRatesUpdatedAt(new Date(cached.fetchedAt));
    } else {
      fetchRates();
    }
  }, [fetchRates]);

  const setCurrency = (c: CurrencyOption) => {
    localStorage.setItem("preferred_currency", c.code);
    setCurrencyState(c);
  };

  // Rate for the currently selected currency (relative to USD)
  const rate = rates[currency.code] ?? 1;

  // Convert a USD-denominated amount to the selected currency
  const convert = (amountUSD: number): number => amountUSD * rate;

  const format = (amountUSD: number, compact = false): string => {
    const converted = convert(amountUSD);
    const abs = Math.abs(converted);
    const sign = converted < 0 ? "-" : "";
    const noDecimals = currency.code === "JPY" || currency.code === "KRW" || currency.code === "BDT";
    try {
      const formatted = new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        notation: compact && abs >= 1000 ? "compact" : "standard",
        minimumFractionDigits: noDecimals ? 0 : 2,
        maximumFractionDigits: noDecimals ? 0 : 2,
      }).format(abs);
      return sign + formatted;
    } catch {
      return `${sign}${currency.symbol}${abs.toFixed(noDecimals ? 0 : 2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{
      currency, setCurrency,
      format, convert,
      rate, ratesUpdatedAt,
      ratesLoading, ratesError,
      refetchRates: fetchRates,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
