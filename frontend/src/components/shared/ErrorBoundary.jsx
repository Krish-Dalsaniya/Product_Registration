import React from 'react';
import ErrorBanner from './ErrorBanner';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <ErrorBanner 
            error={this.state.error} 
            onRetry={this.handleRetry} 
            title="System Error"
            description="Something went wrong while loading the application. Please try refreshing."
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
