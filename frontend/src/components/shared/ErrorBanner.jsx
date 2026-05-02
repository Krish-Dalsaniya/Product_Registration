import React from 'react';
import './ErrorBanner.css';

const ErrorBanner = ({ error, onRetry, title = 'Unable to connect', description = 'Service is temporarily unavailable. Please try again in a moment.' }) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message || description;

  return (
    <div className="error-banner-container">
      <div className="error-banner">
        <div className="error-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#EF4444"/>
            <path d="M12 7V13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 16H12.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="error-content">
          <h3 className="error-title">{title}</h3>
          <p className="error-description">{errorMessage}</p>
          {onRetry && (
            <button className="error-retry-btn" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorBanner;
