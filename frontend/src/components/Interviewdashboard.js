// components/InterviewDashboard.jsx
import React, { useState, useEffect } from 'react';
import './InterviewDashboard.css';

const InterviewDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');
  const [taskGenerating, setTaskGenerating] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/candidates');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setCandidates(data);
    } catch (error) {
      console.error('❌ Error fetching candidates:', error);
      alert(`Failed to fetch candidates: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateTaskQuestions = async (email) => {
    setTaskGenerating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/generate-tasks/${email}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('✅ Task-based questions generated successfully!');
        setCandidates(prev => prev.map(candidate => 
          candidate.email === email 
            ? { 
                ...candidate, 
                taskQuestions: result.taskQuestions, 
                taskQuestionsGenerated: true 
              }
            : candidate
        ));
        
        if (selectedCandidate?.email === email) {
          setSelectedCandidate(prev => ({
            ...prev,
            taskQuestions: result.taskQuestions,
            taskQuestionsGenerated: true
          }));
        }
      } else {
        alert(`Failed to generate tasks: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setTaskGenerating(false);
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesStatus = filters.status === 'all' || candidate.status === filters.status;
    const matchesSearch = candidate.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                         candidate.email?.toLowerCase().includes(filters.search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const colors = {
      'Pending': '#fbbf24',
      'Shortlisted': '#3b82f6',
      'Hired': '#059669',
      'Rejected': '#ef4444'
    };
    
    return (
      <span 
        className="status-badge" 
        style={{ 
          backgroundColor: colors[status] || '#6b7280',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        {status || 'Unknown'}
      </span>
    );
  };

  const renderQuestions = () => {
    if (!selectedCandidate?.questions) return <p>No questions available</p>;

    const questionsHtml = selectedCandidate.questions;
    
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <h3 style={{ 
          margin: '0 0 15px 0', 
          flexShrink: 0, 
          fontSize: '18px',
          color: '#1f2937',
          fontWeight: '600'
        }}>
          📋 Interview Questions
        </h3>
        <div 
          style={{
            backgroundColor: '#ffffff',
            padding: '25px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            lineHeight: '1.7',
            fontSize: '15px',
            flex: 1,
            overflowY: 'auto'
          }}
          dangerouslySetInnerHTML={{ __html: questionsHtml }} 
        />
      </div>
    );
  };

  const renderTaskQuestions = () => {
    if (!selectedCandidate?.taskQuestions) {
      return (
        <div style={{ 
          height: '100%',
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          textAlign: 'center',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎯</div>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '24px', color: '#374151' }}>Task Questions</h3>
          <p style={{ margin: '0 0 30px 0', color: '#6b7280', fontSize: '16px' }}>No task-based questions generated yet.</p>
          
          {selectedCandidate?.status === 'Shortlisted' && !selectedCandidate?.taskQuestionsGenerated && (
            <div style={{ 
              backgroundColor: '#f0f9ff', 
              padding: '30px', 
              borderRadius: '12px',
              border: '2px solid #3b82f6',
              maxWidth: '600px',
              width: '100%',
              margin: '0 auto'
            }}>
              <h4 style={{
                margin: '0 0 15px 0',
                color: '#1e40af',
                fontSize: '18px'
              }}>
                🎉 Candidate Shortlisted!
              </h4>
              <p style={{ 
                margin: '0 0 25px 0', 
                color: '#1e40af',
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                This candidate is now eligible for specialized task-based assessment. Generate personalized technical challenges to evaluate their practical skills.
              </p>
              <button 
                onClick={() => generateTaskQuestions(selectedCandidate.email)}
                disabled={taskGenerating}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '15px 30px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: taskGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  opacity: taskGenerating ? 0.7 : 1,
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                }}
              >
                {taskGenerating ? '⏳ Generating Tasks...' : '🎯 Generate Task Questions'}
              </button>
            </div>
          )}
          
          {selectedCandidate?.status !== 'Shortlisted' && (
            <div style={{ 
              backgroundColor: '#f9fafb', 
              padding: '30px', 
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              maxWidth: '500px',
              width: '100%',
              margin: '0 auto'
            }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '16px', lineHeight: '1.5' }}>
                Task questions are only available for shortlisted candidates. Please update the candidate status to "Shortlisted" to enable task generation.
              </p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <div style={{
          flexShrink: 0,
          marginBottom: '15px'
        }}>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '20px',
            color: '#1f2937',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🎯 Task-Based Assessment Questions
          </h3>
          <p style={{
            margin: '0',
            color: '#6b7280',
            fontSize: '14px',
            fontStyle: 'italic'
          }}>
            Specialized technical challenges for shortlisted candidates
          </p>
        </div>
        
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header badge */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '12px 25px',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                ✅ GENERATED SUCCESSFULLY
              </span>
              <span style={{
                color: '#6b7280',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                Scroll to view all content
              </span>
            </div>
          </div>

          {/* Scrollable content area */}
          <div 
            style={{
              padding: '30px',
              flex: 1,
              overflowY: 'auto',
              lineHeight: '1.8',
              fontSize: '15px',
              color: '#374151'
            }}
            dangerouslySetInnerHTML={{ __html: selectedCandidate.taskQuestions }} 
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px 30px',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        flexShrink: 0,
        zIndex: 10
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '28px', 
          fontWeight: '700', 
          color: '#1f2937' 
        }}>
          🎯 Interview Dashboard
        </h1>
      </div>

      {/* Main Layout */}
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        <div style={{ 
          width: '320px',
          minWidth: '320px',
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f8fafc',
            flexShrink: 0
          }}>
            <h3 style={{ 
              margin: '0 0 15px 0', 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#374151' 
            }}>
              Candidates
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>
              
              <input
                type="text"
                placeholder="Search candidates..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '15px'
          }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Loading...
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                No candidates found
              </div>
            ) : (
              filteredCandidates.map(candidate => (
                <div
                  key={candidate.email}
                  onClick={() => setSelectedCandidate(candidate)}
                  style={{
                    padding: '15px',
                    margin: '0 0 12px 0',
                    borderRadius: '8px',
                    border: selectedCandidate?.email === candidate.email ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    backgroundColor: selectedCandidate?.email === candidate.email ? '#f0f9ff' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedCandidate?.email === candidate.email ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <h4 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {candidate.name || 'Unknown Name'}
                  </h4>
                  <p style={{ 
                    margin: '0 0 10px 0', 
                    color: '#6b7280', 
                    fontSize: '14px' 
                  }}>
                    {candidate.email}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    flexWrap: 'wrap' 
                  }}>
                    {getStatusBadge(candidate.status)}
                    {candidate.taskQuestionsGenerated && (
                      <span style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        🎯 Tasks Ready
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content Area - Fixed height calculation */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {selectedCandidate ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              padding: '25px'
            }}>
              {/* Candidate Header */}
              <div style={{ 
                marginBottom: '20px',
                flexShrink: 0,
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h2 style={{ 
                  margin: '0 0 15px 0', 
                  fontSize: '24px', 
                  fontWeight: '600', 
                  color: '#1f2937' 
                }}>
                  {selectedCandidate.name || 'Unknown'}
                </h2>
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'center', 
                  flexWrap: 'wrap' 
                }}>
                  {getStatusBadge(selectedCandidate.status)}
                  {selectedCandidate.status === 'Shortlisted' && !selectedCandidate.taskQuestionsGenerated && (
                    <button 
                      onClick={() => generateTaskQuestions(selectedCandidate.email)}
                      disabled={taskGenerating}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 20px',
                        cursor: taskGenerating ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: taskGenerating ? 0.7 : 1
                      }}
                    >
                      {taskGenerating ? '⏳ Generating...' : '🎯 Generate Tasks'}
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ 
                flexShrink: 0, 
                marginBottom: '20px',
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={() => setActiveTab('questions')}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: activeTab === 'questions' ? '#3b82f6' : '#ffffff',
                    color: activeTab === 'questions' ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500',
                    boxShadow: activeTab === 'questions' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📋 Interview Questions
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: activeTab === 'tasks' ? '#3b82f6' : '#ffffff',
                    color: activeTab === 'tasks' ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500',
                    boxShadow: activeTab === 'tasks' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🎯 Task Questions
                  {selectedCandidate.taskQuestionsGenerated && (
                    <span style={{ 
                      marginLeft: '8px', 
                      fontSize: '14px' 
                    }}>✅</span>
                  )}
                </button>
              </div>

              {/* Content Area - Uses remaining height */}
              <div style={{ 
                flex: 1, 
                minHeight: 0,
                overflow: 'hidden'
              }}>
                {activeTab === 'questions' && renderQuestions()}
                {activeTab === 'tasks' && renderTaskQuestions()}
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              margin: '25px',
              padding: '60px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>👥</div>
              <h3 style={{ 
                margin: '0 0 10px 0', 
                fontSize: '24px', 
                fontWeight: '600', 
                color: '#374151' 
              }}>
                Select a Candidate
              </h3>
              <p style={{ 
                margin: 0, 
                color: '#6b7280', 
                fontSize: '16px' 
              }}>
                Choose a candidate from the list to view their interview questions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 8px;
        }
        
        div::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        div::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        div::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default InterviewDashboard;
