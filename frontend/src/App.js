// src/App.js - Reorganized Navigation Flow
import React, { useState, useEffect, useCallback } from 'react';
import './styles/combined.css';
import './App.css';

import Login from './pages/login';
import ResumeUpload from './components/resumeupload';
import HRDashboard from './components/hrdashboard';
import InterviewActions from './components/interviewactions';
import InterviewDashboard from './components/Interviewdashboard';

// Error Boundary Components
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container">
            <h1>🚨 Application Error</h1>
            <p>Something went wrong. Please refresh the page or contact support.</p>
            <button 
              onClick={() => window.location.reload()}
              className="error-reload-btn"
            >
              🔄 Reload Page
            </button>
            <details className="error-details">
              <summary>Technical Details</summary>
              <pre>{this.state.error && this.state.error.toString()}</pre>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('upload');
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandidates = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch('http://localhost:5000/api/candidates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCandidates(Array.isArray(data) ? data : []);
        setError(null);
        console.log('✅ Candidates fetched:', data.length);
      } else if (response.status === 401) {
        handleLogout();
      } else {
        throw new Error(`Failed to fetch candidates: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      setError('Failed to load candidates');
      setCandidates([]);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const userInfo = localStorage.getItem('userInfo');
        
        if (token) {
          setIsAuthenticated(true);
          if (userInfo) {
            setUser(JSON.parse(userInfo));
          }
          await fetchCandidates();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setError('Authentication check failed');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [fetchCandidates]);

  const handleLogin = (userData) => {
    try {
      setIsAuthenticated(true);
      setUser(userData);
      setCurrentView('upload');
      setError(null);
      
      localStorage.setItem('userInfo', JSON.stringify(userData));
      console.log('✅ Login successful:', userData);
    } catch (error) {
      console.error('Login handler error:', error);
      setError('Login failed');
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('userInfo');
      
      setIsAuthenticated(false);
      setUser(null);
      setCandidates([]);
      setCurrentView('upload');
      setSelectedCandidate(null);
      setError(null);
      
      console.log('✅ Logout successful');
      
      if (process.env.REACT_APP_COGNITO_DOMAIN && process.env.REACT_APP_COGNITO_CLIENT_ID) {
        const logoutUrl = `https://${process.env.REACT_APP_COGNITO_DOMAIN}/logout?` +
          `client_id=${process.env.REACT_APP_COGNITO_CLIENT_ID}&` +
          `logout_uri=${encodeURIComponent(process.env.REACT_APP_COGNITO_LOGOUT_URI || window.location.origin)}`;
        
        window.location.href = logoutUrl;
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.reload();
    }
  };

  const handleResumeUploaded = (newCandidate) => {
    try {
      if (newCandidate) {
        setCandidates(prev => [...prev, newCandidate]);
        setCurrentView('dashboard');
        setError(null);
        console.log('✅ Resume uploaded:', newCandidate.name);
      }
    } catch (error) {
      console.error('Resume upload handler error:', error);
      setError('Failed to process uploaded resume');
    }
  };

  const handleCandidateUpdate = useCallback(async (updatedCandidate) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`http://localhost:5000/api/candidates/${updatedCandidate.email}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedCandidate)
      });
      
      if (response.ok) {
        await fetchCandidates();
        setError(null);
        console.log('✅ Candidate updated:', updatedCandidate.name);
      } else if (response.status === 401) {
        handleLogout();
      } else {
        throw new Error(`Failed to update candidate: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating candidate:', error);
      setError('Failed to update candidate');
    }
  }, [fetchCandidates]);

  const handleSelectCandidate = (candidate) => {
    try {
      setSelectedCandidate(candidate);
      setCurrentView('post-interview');
      console.log('✅ Candidate selected:', candidate.name);
    } catch (error) {
      console.error('Candidate selection error:', error);
      setError('Failed to select candidate');
    }
  };

  const handleViewChange = (view) => {
    try {
      setCurrentView(view);
      setError(null);
      console.log('✅ View changed to:', view);
    } catch (error) {
      console.error('View change error:', error);
      setError('Navigation failed');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading Smart HR System...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="App">
        {/* Global Error Display */}
        {error && (
          <div className="global-error">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Header */}
        <header className="app-header">
          <div className="header-left">
            <h1>🎯 Smart HR System</h1>
            <span className="workflow-indicator">
              {currentView === 'upload' && '📄 Resume Upload'}
              {currentView === 'dashboard' && '📊 Dashboard'}
              {currentView === 'interview' && '🎯 Interview System'}
              {currentView === 'post-interview' && '📝 Post Interview'}
            </span>
          </div>
          <div className="header-right">
            <span className="user-info">👤 {user?.name || user?.email || 'HR Manager'}</span>
            <button className="logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </header>

        {/* Reorganized Navigation */}
        <nav className="workflow-nav">
          <button 
            className={currentView === 'upload' ? 'workflow-btn active' : 'workflow-btn'}
            onClick={() => handleViewChange('upload')}
          >
            <span className="step-number">1</span>
            📄 Resume Upload
          </button>
          
          <div className="nav-arrow">→</div>
          
          <button 
            className={currentView === 'dashboard' ? 'workflow-btn active' : 'workflow-btn'}
            onClick={() => handleViewChange('dashboard')}
          >
            <span className="step-number">2</span>
            📊 Dashboard
          </button>
          
          <div className="nav-arrow">→</div>
          
          <button 
  className={currentView === 'interview' ? 'workflow-btn active' : 'workflow-btn'}
  onClick={() => handleViewChange('interview')}
>
  <span className="step-number">3</span>
  🎯 Interview System
</button>

          
          <div className="nav-arrow">→</div>
          
          <button 
            className={currentView === 'post-interview' ? 'workflow-btn active' : 'workflow-btn'}
            onClick={() => handleViewChange('post-interview')}
            disabled={!selectedCandidate}
          >
            <span className="step-number">4</span>
            📝 Post Interview
          </button>
        </nav>

        {/* Main Content */}
        <main className="app-main">
          {currentView === 'upload' && (
            <ResumeUpload 
              onResumeUploaded={handleResumeUploaded}
            />
          )}
          
          {currentView === 'dashboard' && (
            <HRDashboard 
              candidates={candidates}
              onCandidateUpdate={handleCandidateUpdate}
              onSelectCandidate={handleSelectCandidate}
              onRefresh={fetchCandidates}
            />
          )}
          
          {currentView === 'interview' && (
            <InterviewDashboard 
              candidates={candidates}
              onCandidateUpdate={handleCandidateUpdate}
              onRefresh={fetchCandidates}
              user={user}
            />
          )}
          
          {currentView === 'post-interview' && selectedCandidate && (
            <InterviewActions 
              candidate={selectedCandidate}
              onUpdateCandidate={handleCandidateUpdate}
              onBack={() => handleViewChange('dashboard')}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
