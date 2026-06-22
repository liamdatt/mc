"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type QuoteItem = {
  productId: number; // listing id (for the detail link)
  variantId: number; // dedup key
  slug: string; // listing slug
  name: string; // listing name
  sku: string; // variant sku
  variantLabel: string; // e.g. "4 L · Each"; "" when a single unlabeled variant
  imagePath: string;
  categorySlug: string;
  quantity: number;
};

type QuoteCartValue = {
  items: QuoteItem[];
  count: number;
  addItem: (item: Omit<QuoteItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: number) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "mec_quote_cart_v2";
const QuoteCartContext = createContext<QuoteCartValue | null>(null);

export function QuoteCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time hydration from localStorage on mount. localStorage is
    // unavailable during SSR, so this must run in an effect (not a lazy
    // initializer), which makes the setState-in-effect here intentional.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback(
    (item: Omit<QuoteItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((p) => p.variantId === item.variantId);
        if (existing) {
          return prev.map((p) =>
            p.variantId === item.variantId
              ? { ...p, quantity: p.quantity + quantity }
              : p,
          );
        }
        return [...prev, { ...item, quantity }];
      });
    },
    [],
  );

  const removeItem = useCallback((variantId: number) => {
    setItems((prev) => prev.filter((p) => p.variantId !== variantId));
  }, []);

  const setQuantity = useCallback((variantId: number, quantity: number) => {
    setItems((prev) =>
      prev
        .map((p) =>
          p.variantId === variantId
            ? { ...p, quantity: Math.max(1, Math.floor(quantity)) }
            : p,
        )
        .filter((p) => p.quantity > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<QuoteCartValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      addItem,
      removeItem,
      setQuantity,
      clear,
    }),
    [items, addItem, removeItem, setQuantity, clear],
  );

  return (
    <QuoteCartContext.Provider value={value}>
      {children}
    </QuoteCartContext.Provider>
  );
}

export function useQuoteCart(): QuoteCartValue {
  const ctx = useContext(QuoteCartContext);
  if (!ctx)
    throw new Error("useQuoteCart must be used within QuoteCartProvider");
  return ctx;
}
