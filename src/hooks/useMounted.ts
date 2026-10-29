"use client"

import { useSyncExternalStore } from "react"

function subscribe(): () => void {
  return () => {}
}

function getClientSnapshot(): boolean {
  return true
}

function getServerSnapshot(): boolean {
  return false
}

// `false` en SSR y durante la hidratación; `true` una vez montado en cliente.
// `useSyncExternalStore` evita el `setState` dentro de un efecto y el desajuste de hidratación.
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}
