"use client"

import * as React from "react"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Toast({ title, description, variant = "default", open = true, onOpenChange }: ToastProps) {
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onOpenChange?.(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [open, onOpenChange])

  if (!open) return null

  const variantStyles = variant === "destructive"
    ? "bg-red-600 text-white border-red-700"
    : "bg-white text-gray-900 border-gray-200"

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md rounded-lg border shadow-lg ${variantStyles} p-4`}
      role="alert"
    >
      <div className="flex-1">
        {title && (
          <div className="font-semibold text-sm mb-1">
            {title}
          </div>
        )}
        {description && (
          <div className="text-sm opacity-90">
            {description}
          </div>
        )}
      </div>
      <button
        onClick={() => onOpenChange?.(false)}
        className="ml-4 inline-flex h-6 w-6 items-center justify-center rounded-md hover:opacity-70"
      >
        <span className="sr-only">Close</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
