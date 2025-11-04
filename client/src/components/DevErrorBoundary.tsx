import React from "react";

type State = { hasError: boolean; error?: any };

export class DevErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.hasError && import.meta.env.DEV) {
      return (
        <div className="p-6 font-sans">
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <pre className="whitespace-pre-wrap text-sm bg-red-50 p-3 rounded border border-red-200">
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children as any;
  }
}
