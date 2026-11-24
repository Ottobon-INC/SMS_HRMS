import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('HRMS ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans antialiased">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-4">
            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
              SMS
            </div>
            <h2 className="text-xl font-bold text-slate-800">Session Refresh</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your session encountered a brief display interrupt during page reload. Click below to reload your dashboard.
            </p>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-teal-600/10"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('hrms_local_employees');
                  window.location.href = '/dashboard';
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Reset & Open
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
