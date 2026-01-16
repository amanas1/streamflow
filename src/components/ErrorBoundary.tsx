import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
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

    return this.props.children;
  }
}