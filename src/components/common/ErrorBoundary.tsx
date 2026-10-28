import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered in place of the children after an error. */
  fallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches failures inside the 3D view so that search and text directions keep
 * working even if the scene cannot render.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('3D view failed', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}
