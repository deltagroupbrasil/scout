"use client"

import { toast as sonnerToast } from "sonner"

// Compatibilidade com toaster antigo
// Agora usamos Sonner, mas mantemos a interface para componentes existentes
export function useToast() {
  return {
    toast: (options: {
      title?: string
      description?: string
      variant?: "default" | "destructive"
    }) => {
      if (options.variant === "destructive") {
        sonnerToast.error(options.title || "Erro", {
          description: options.description
        })
      } else {
        sonnerToast.success(options.title || "Sucesso", {
          description: options.description
        })
      }
    }
  }
}
