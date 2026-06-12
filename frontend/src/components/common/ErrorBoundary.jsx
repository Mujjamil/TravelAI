/**
 * ErrorBoundary — catches render errors anywhere in the tree.
 * Wrap around <Routes> in App.jsx.
 */

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-6">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {this.state.error && (
            <pre className="text-xs text-left bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5 overflow-auto max-h-32 text-red-600">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="btn-blue px-6 py-2 text-sm"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }
}
