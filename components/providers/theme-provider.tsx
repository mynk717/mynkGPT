"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Suppress React 19 warning about script tags inside components (raised by next-themes inline script)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
      return
    }
    origError.apply(console, args)
  }
}

/**
 * Wraps the app with `next-themes` for light/dark/system theme switching.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}