// src/components/ErrorBoundary.jsx
// Catches uncaught runtime render errors and presents a recovery UI instead of a black screen
import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('NOVA UI Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: 'var(--color-bg-primary, #0d0d12)',
          color: 'var(--color-text-primary, #f0f0f8)',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: 'var(--color-bg-surface, #1a1a24)',
            border: '1px solid var(--color-error, #ef4444)',
            borderRadius: '16px',
            padding: '36px',
            maxWidth: '540px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            <span style={{ fontSize: '42px', display: 'block', marginBottom: '16px' }}>⚠️</span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Something went wrong</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary, #8888a8)', marginBottom: '16px', lineHeight: 1.6 }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering the view.'}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                background: 'var(--color-accent, #7c6dfa)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              🔄 Reload NOVA
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
