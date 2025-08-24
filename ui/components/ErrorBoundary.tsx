"use client";
import React from 'react';

interface State { hasError: boolean; error?: any }
export class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode; children?: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: any){ return { hasError:true, error }; }
  componentDidCatch(error: any, info: any){ if(process.env.NODE_ENV!=='production') console.error('UI ErrorBoundary', error, info); }
  render(){ if(this.state.hasError) return this.props.fallback || <div className="p-6 text-sm text-red-300">Произошла ошибка UI. Перезагрузите страницу.</div>; return this.props.children; }
}
