// src/pages/login.js - CLEAN VERSION
import React, { useState, useEffect, useCallback } from 'react';

const Login = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [diagnostics, setDiagnostics] = useState({});

  // Run diagnostics on component mount
  useEffect(() => {
    const runDiagnostics = () => {
      const diag = {
        // Environment variables
        envVars: {
          domain: process.env.REACT_APP_COGNITO_DOMAIN,
          clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
          redirectUri: process.env.REACT_APP_COGNITO_REDIRECT_URI,
          logoutUri: process.env.REACT_APP_COGNITO_LOGOUT_URI,
          nodeEnv: process.env.NODE_ENV,
          publicUrl: process.env.PUBLIC_URL
        },
        // Check if variables exist
        envStatus: {
          domainExists: !!process.env.REACT_APP_COGNITO_DOMAIN,
          clientIdExists: !!process.env.REACT_APP_COGNITO_CLIENT_ID,
          redirectUriExists: !!process.env.REACT_APP_COGNITO_REDIRECT_URI,
          allVarsLoaded: !!(process.env.REACT_APP_COGNITO_DOMAIN && process.env.REACT_APP_COGNITO_CLIENT_ID && process.env.REACT_APP_COGNITO_REDIRECT_URI)
        },
        // Current location info
        location: {
          href: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          origin: window.location.origin
        },
        // All process.env variables starting with REACT_APP_
        allReactEnvVars: Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')).reduce((obj, key) => {
          obj[key] = process.env[key];
          return obj;
        }, {})
      };

      setDiagnostics(diag);
      
      return diag;
    };

    runDiagnostics();
  }, []);

  const handleCognitoLogin = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Starting login process...');
      console.log('🔍 Environment check:', diagnostics.envVars);

      // Check if environment variables are loaded
      if (!process.env.REACT_APP_COGNITO_DOMAIN) {
        throw new Error('REACT_APP_COGNITO_DOMAIN is undefined. Check your .env file.');
      }
      if (!process.env.REACT_APP_COGNITO_CLIENT_ID) {
        throw new Error('REACT_APP_COGNITO_CLIENT_ID is undefined. Check your .env file.');
      }
      if (!process.env.REACT_APP_COGNITO_REDIRECT_URI) {
        throw new Error('REACT_APP_COGNITO_REDIRECT_URI is undefined. Check your .env file.');
      }

      // Build URL with minimal scope
      const cognitoUrl = `https://${process.env.REACT_APP_COGNITO_DOMAIN}/login?` +
        `client_id=${process.env.REACT_APP_COGNITO_CLIENT_ID}&` +
        `response_type=code&` +
        `scope=openid&` +
        `redirect_uri=${encodeURIComponent(process.env.REACT_APP_COGNITO_REDIRECT_URI)}`;

      console.log('🔍 Generated URL:', cognitoUrl);
      console.log('🔍 URL Parts:', {
        baseUrl: `https://${process.env.REACT_APP_COGNITO_DOMAIN}/login`,
        clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
        responseType: 'code',
        scope: 'openid',
        redirectUri: process.env.REACT_APP_COGNITO_REDIRECT_URI,
        encodedRedirectUri: encodeURIComponent(process.env.REACT_APP_COGNITO_REDIRECT_URI)
      });

      // Delay to see console output
      console.log('🔍 Redirecting in 3 seconds...');
      setTimeout(() => {
        console.log('🔍 Redirecting now to:', cognitoUrl);
        window.location.href = cognitoUrl;
      }, 3000);

    } catch (err) {
      console.error('❌ Login error:', err);
      setError(`Login Error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleCognitoCallback = useCallback(async (code) => {
    try {
      setLoading(true);
      console.log('🔍 Processing callback with code:', code);
      
      const response = await fetch('http://localhost:5000/api/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      console.log('🔍 Backend response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Backend response data:', data);
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('idToken', data.idToken);
        onLogin(data.user);
        window.history.replaceState({}, document.title, '/');
      } else {
        const errorData = await response.json();
        console.error('🔍 Backend error:', errorData);
        setError(errorData.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('❌ Callback error:', error);
      setError('Authentication callback failed');
    } finally {
      setLoading(false);
    }
  }, [onLogin]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    console.log('🔍 URL Analysis:', {
      currentUrl: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      code: code,
      error: error,
      errorDescription: errorDescription
    });
    
    if (error) {
      console.error('❌ Cognito error detected:', { error, errorDescription });
      setError(`Cognito Error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
      window.history.replaceState({}, document.title, '/');
      return;
    }
    
    if (code && window.location.pathname === '/callback') {
      console.log('🔍 Valid callback detected, processing...');
      handleCognitoCallback(code);
    }
  }, [handleCognitoCallback]);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1> Smart HR System</h1>
          <p>AI-Powered Resume Analysis & Candidate Management</p>
        </div>
        
        <div className="login-content">
          <h2>Welcome Back!</h2>
          <p>Please sign in to continue to your HR dashboard</p>
          
          {error && (
            <div className="error-message" style={{ margin: '1rem 0', padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c00' }}>
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          <button 
            className="login-btn" 
            onClick={handleCognitoLogin}
            disabled={loading || !diagnostics.envStatus?.allVarsLoaded}
            style={{ width: '100%', padding: '1rem', margin: '1rem 0', background: diagnostics.envStatus?.allVarsLoaded ? '#007bff' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', cursor: diagnostics.envStatus?.allVarsLoaded ? 'pointer' : 'not-allowed' }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                {loading ? 'Redirecting in 3 seconds...' : 'Processing...'}
              </>
            ) : (
              <>
                🔐 {diagnostics.envStatus?.allVarsLoaded ? 'Sign in with AWS Cognito' : 'Environment Variables Not Loaded'}
              </>
            )}
          </button>
        </div>
        
        <div className="login-footer">
          <p>Secure authentication powered by AWS Cognito</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
