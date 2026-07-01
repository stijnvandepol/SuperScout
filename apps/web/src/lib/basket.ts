"use client";

const KEY = "superscout:basket";
const EVENT = "superscout:basket";

/** Offer ids currently in the basket. */
export function getBasket(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function save(ids: string[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT));
}

export function isInBasket(id: string): boolean {
  return getBasket().includes(id);
}

/** Add or remove an offer; returns the new membership state. */
export function toggleBasket(id: string): boolean {
  const current = getBasket();
  const has = current.includes(id);
  save(has ? current.filter((x) => x !== id) : [...current, id]);
  return !has;
}

export function removeFromBasket(id: string): void {
  save(getBasket().filter((x) => x !== id));
}

/** Subscribe to basket changes; returns an unsubscribe fn. */
export function onBasketChange(handler: () => void): () => void {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export const BASKET_EVENT = EVENT;
