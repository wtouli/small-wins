"use client";
import { track } from "@vercel/analytics";

export function logEvent(name: string, props?: Record<string, any>) {
  try {
    track(name, props);
  } catch (e) {
    console.warn("Analytics event not sent:", e);
  }
}
