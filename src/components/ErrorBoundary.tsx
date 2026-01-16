import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  /**
   * Fix: Made children optional to prevent missing property errors in parent components (like App.tsx).
   * In some TypeScript/React configurations, nested JSX elements are not automatically inferred
   * to satisfy a required 'children' prop on the attribute object.
   */
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  /**
   * Fix: Explicitly declare the state property. This resolves "Property 'state' does not exist 
   * on type 'ErrorBoundary'" errors that can occur when TypeScript strict mode or specific 
   * compiler options are used with React class components.
   */
  public state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    /**
     * Fix: State access is now correctly typed and recognized by the compiler.
     */
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#070b14] text-white p-6 text-center font-sans">
          <h1 className="text-3xl font-black mb-4 text-primary tracking-tight">System Halted</h1>
          <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
            The audio engine encountered a critical error. 
            This usually happens due to browser resource limits or network interruptions.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95"
          >
            Reboot System
          </button>
          {this.state.error && (
             <div className="mt-12 p-4 bg-black/40 rounded-xl border border-red-500/20 max-w-lg w-full text-left">
                 <p className="text-[10px] font-bold text-red-400 uppercase mb-2">Error Log</p>
                 <pre className="text-[10px] text-slate-500 overflow-auto whitespace-pre-wrap font-mono">
                     {this.state.error.toString()}
                 </pre>
             </div>
          )}
        </div>
      );
    }

    /**
     * Fix: children is now accessible via this.props as expected for a React.Component.
     */
    return this.props.children;
  }
}
