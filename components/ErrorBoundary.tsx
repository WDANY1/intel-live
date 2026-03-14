'use client'

import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message }
  }

  componentDidCatch(err: Error) {
    console.error('[ErrorBoundary]', err)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="font-mono text-[0.6rem] text-[#FF1744] tracking-[2px]">COMPONENT ERROR</div>
            <div className="font-mono text-[0.5rem] text-[#475569] max-w-[200px] leading-relaxed">
              {this.state.message}
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
