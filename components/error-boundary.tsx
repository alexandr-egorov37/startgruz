"use client"
import React, { ErrorInfo, ReactNode } from "react"
import { AlertCircle, RotateCcw } from "lucide-react"

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
          <div className="mb-6 rounded-full bg-red-500/10 p-4 ring-1 ring-red-500/20">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="mb-2 text-2xl font-black text-white uppercase tracking-tight">Что-то пошло не так</h1>
          <p className="mb-8 text-sm text-white/40 max-w-xs">Произошла ошибка при загрузке интерфейса. Попробуйте обновить страницу.</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-black text-black transition hover:scale-105 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            Обновить страницу
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
