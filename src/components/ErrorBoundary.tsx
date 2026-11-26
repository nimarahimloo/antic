"use client";

import { Component, ReactNode, ReactElement, ErrorInfo } from "react";
import { toast as sonnerToast } from "sonner";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactElement | ((props: { error: Error; reset: () => void }) => ReactElement);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches unexpected exceptions in the render tree,
 * shows a user-facing Persian message with a safe retry action, and never
 * exposes stack traces or internal details to the client.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error boundary caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
    try {
      sonnerToast("خطایی در صفحه رخ داد. لطفاً دوباره تلاش کنید.");
    } catch {
      /* toast may not be available in SSR; ignore */
    }
  }

  render() {
    const { children, fallback } = this.props;
    if (this.state.hasError) {
      if (fallback) {
        const reset = () => this.setState({ hasError: false, error: null });
        const rendered = typeof fallback === "function" ? fallback({ error: this.state.error!, reset }) : fallback;
        return rendered;
      }
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <svg className="h-6 w-6 text-destructive" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mb-2">
            خطایی در نمایش صفحه رخ داد
          </h3>
          <p className="font-body text-sm text-muted-foreground mb-4">
            لطفاً صفحه را بازنشانی کنید یا دوباره تلاش کنید.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-ghost-gold"
          >
            دوباره تلاش کنید
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-gold mt-3 w-full justify-center"
          >
            بازنشانی صفحه
          </button>
        </div>
      );
    }
    return children;
  }
}
