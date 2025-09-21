// src/components/InterviewActions.js
import React, { useState, useEffect } from 'react';

const InterviewActions = ({ candidate, onBack, onUpdateCandidate }) => {
  const [formData, setFormData] = useState({
    status: candidate?.status || 'Pending',
    interviewDate: candidate?.interviewDate || '',
    attendance: candidate?.attendance || 'Pending',
    interviewNotes: candidate?.interviewNotes || '',
    feedback: candidate?.feedback || '',
    rating: candidate?.rating || '',
    nextSteps: candidate?.nextSteps || '',
    technicalSkills: candidate?.technicalSkills || '',
    communicationSkills: candidate?.communicationSkills || '',
    problemSolvingSkills: candidate?.problemSolvingSkills || '',
    overallImpression: candidate?.overallImpression || ''
  });

  const [activeSection, setActiveSection] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState({
    name: candidate?.name || '',
    email: candidate?.email || '',
    phone: candidate?.phone || '',
    status: candidate?.status || 'Pending',
    uploadedAt: candidate?.uploadedAt || ''
  });

  // Initialize editable data when candidate changes
  useEffect(() => {
    if (candidate) {
      setEditableData({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        status: candidate.status || 'Pending',
        uploadedAt: candidate.uploadedAt || ''
      });
    }
  }, [candidate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditableChange = (field, value) => {
    setEditableData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    const updatedCandidate = {
      ...candidate,
      ...formData,
      lastUpdated: new Date().toISOString()
    };
    
    await onUpdateCandidate(updatedCandidate);
    showNotification('Interview actions updated successfully!', 'success');
  };

  const handleSaveOverview = async () => {
    // Update the main form data with edited values
    setFormData(prev => ({
      ...prev,
      status: editableData.status
    }));
    
    // Update the candidate data
    const updatedCandidate = {
      ...candidate,
      name: editableData.name,
      email: editableData.email,
      phone: editableData.phone,
      status: editableData.status,
      uploadedAt: editableData.uploadedAt,
      lastUpdated: new Date().toISOString()
    };
    
    await onUpdateCandidate(updatedCandidate);
    setIsEditing(false);
    showNotification('Candidate details updated successfully!', 'success');
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setEditableData({
      name: candidate?.name || '',
      email: candidate?.email || '',
      phone: candidate?.phone || '',
      status: candidate?.status || 'Pending',
      uploadedAt: candidate?.uploadedAt || ''
    });
    setIsEditing(false);
  };

  const showNotification = (message, type) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${type === 'success' ? '✅' : '❌'}</span>
        <span class="notification-message">${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'hired': return '#10b981';
      case 'shortlisted': return '#3b82f6';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'interview scheduled': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Excellent': return '#10b981';
      case 'Good': return '#3b82f6';
      case 'Average': return '#f59e0b';
      case 'Below Average': return '#f97316';
      case 'Poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Enhanced extractQuestions function - handles both spellings for compatibility
  const extractQuestions = (htmlString) => {
    if (!htmlString) return { techQuestions: [], behavQuestions: [] };
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    
    const techQuestions = [];
    const behavQuestions = [];
    
    // Find Technical Questions section
    const techSection = Array.from(doc.querySelectorAll('h5')).find(h => 
      h.textContent.toLowerCase().includes('technical')
    );
    
    // Find Behavioral/Behavioural Questions section - handles both spellings
    const behavSection = Array.from(doc.querySelectorAll('h5')).find(h => {
      const text = h.textContent.toLowerCase();
      return text.includes('behavioral') || text.includes('behavioural'); // Both spellings
    });
    
    // Extract Technical Questions
    if (techSection) {
      const techUL = techSection.nextElementSibling;
      if (techUL && techUL.tagName === 'UL') {
        Array.from(techUL.querySelectorAll('li')).forEach(li => {
          const text = li.textContent.trim();
          if (text) techQuestions.push(text);
        });
      }
    }
    
    // Extract Behavioral Questions
    if (behavSection) {
      const behavUL = behavSection.nextElementSibling;
      if (behavUL && behavUL.tagName === 'UL') {
        Array.from(behavUL.querySelectorAll('li')).forEach(li => {
          const text = li.textContent.trim();
          if (text) behavQuestions.push(text);
        });
      }
    }
    
    return { techQuestions, behavQuestions };
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'questions', label: 'Questions', icon: '❓' },
    { id: 'schedule', label: 'Schedule & Status', icon: '📅' },
    { id: 'evaluation', label: 'Evaluation', icon: '⭐' },
    { id: 'feedback', label: 'Feedback', icon: '📝' },
    { id: 'actions', label: 'Actions', icon: '🎯' }
  ];

  return (
    <div className="interview-actions-dashboard">
      {/* Enhanced Header with Breadcrumb */}
      <div className="interview-header-professional">
        <div className="header-top">
          <div className="breadcrumb">
            <span className="breadcrumb-item" onClick={onBack}>Dashboard</span>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-item active">Interview Actions</span>
          </div>
          <div className="header-actions">
            <button className="btn-header-action" onClick={() => window.print()}>
              <span className="btn-icon">🖨️</span>
              Print
            </button>
            <button className="btn-header-action" onClick={onBack}>
              <span className="btn-icon">↩️</span>
              Back
            </button>
          </div>
        </div>
        
        <div className="candidate-header-professional">
          <div className="candidate-avatar-professional">
            {editableData.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="candidate-info-professional">
            <h1 className="candidate-name-large">{editableData.name}</h1>
            <div className="candidate-meta">
              <span className="meta-item">
                <span className="meta-icon">📧</span>
                {editableData.email}
              </span>
              <span className="meta-item">
                <span className="meta-icon">📱</span>
                {editableData.phone}
              </span>
              <span className="meta-item">
                <span className="meta-icon">📅</span>
                Applied: {new Date(editableData.uploadedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="candidate-status-professional">
            <div className="status-badge-large" style={{ backgroundColor: getStatusColor(editableData.status) }}>
              {editableData.status}
            </div>
          </div>
        </div>
      </div>

      {/* Professional Dashboard Layout */}
      <div className="interview-dashboard-content">
        {/* Sidebar Navigation */}
        <div className="interview-sidebar">
          <div className="sidebar-header">
            <h3>Interview Sections</h3>
          </div>
          <nav className="sidebar-nav">
            {menuItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="interview-main-content">
          {/* Overview Section with Edit Functionality */}
          {activeSection === 'overview' && (
            <div className="content-section">
              <div className="section-header">
                <div className="section-title-with-actions">
                  <div>
                    <h2>📊 Candidate Overview</h2>
                    <p>Complete summary of candidate information and current status</p>
                  </div>
                  <button 
                    className="btn-edit-overview"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <span className="btn-icon">{isEditing ? '👁️' : '✏️'}</span>
                    {isEditing ? 'View Mode' : 'Edit Mode'}
                  </button>
                </div>
              </div>
              
              <div className="overview-grid">
                <div className="overview-card">
                  <div className="card-icon">👤</div>
                  <div className="card-content">
                    <h3>Personal Information</h3>
                    <div className="info-list">
                      <div className="info-row">
                        <span className="info-label">Full Name:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editableData.name}
                            onChange={(e) => handleEditableChange('name', e.target.value)}
                            className="edit-input-inline"
                            placeholder="Enter full name"
                          />
                        ) : (
                          <span className="info-value">{editableData.name}</span>
                        )}
                      </div>
                      <div className="info-row">
                        <span className="info-label">Email:</span>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editableData.email}
                            onChange={(e) => handleEditableChange('email', e.target.value)}
                            className="edit-input-inline"
                            placeholder="Enter email address"
                          />
                        ) : (
                          <span className="info-value">{editableData.email}</span>
                        )}
                      </div>
                      <div className="info-row">
                        <span className="info-label">Phone:</span>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editableData.phone}
                            onChange={(e) => handleEditableChange('phone', e.target.value)}
                            className="edit-input-inline"
                            placeholder="Enter phone number"
                          />
                        ) : (
                          <span className="info-value">{editableData.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overview-card">
                  <div className="card-icon">📄</div>
                  <div className="card-content">
                    <h3>Application Details</h3>
                    <div className="info-list">
                      <div className="info-row">
                        <span className="info-label">Status:</span>
                        {isEditing ? (
                          <select
                            value={editableData.status}
                            onChange={(e) => handleEditableChange('status', e.target.value)}
                            className="edit-select-inline"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interview Scheduled">Interview Scheduled</option>
                            <option value="Hired">Hired</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        ) : (
                          <span className="info-value status-badge-small" style={{ backgroundColor: getStatusColor(editableData.status) }}>
                            {editableData.status}
                          </span>
                        )}
                      </div>
                      <div className="info-row">
                        <span className="info-label">Applied:</span>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editableData.uploadedAt ? new Date(editableData.uploadedAt).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleEditableChange('uploadedAt', e.target.value)}
                            className="edit-input-inline"
                          />
                        ) : (
                          <span className="info-value">{new Date(editableData.uploadedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="info-row">
                        <span className="info-label">Resume:</span>
                        <a 
                          href={candidate?.resumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="resume-link-professional"
                          onClick={(e) => {
                            if (!candidate?.resumeUrl) {
                              e.preventDefault();
                              showNotification('Resume not available', 'error');
                            }
                          }}
                        >
                          📄 View Resume
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overview-card">
                  <div className="card-icon">⭐</div>
                  <div className="card-content">
                    <h3>Interview Status</h3>
                    <div className="info-list">
                      <div className="info-row">
                        <span className="info-label">Interview Date:</span>
                        <span className="info-value">{formData.interviewDate ? new Date(formData.interviewDate).toLocaleString() : 'Not scheduled'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Attendance:</span>
                        <span className="info-value">{formData.attendance}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Rating:</span>
                        <span className="info-value" style={{ color: getRatingColor(formData.rating) }}>
                          {formData.rating || 'Not rated'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="edit-actions-overview">
                  <button className="btn-save-overview" onClick={handleSaveOverview}>
                    <span className="btn-icon">💾</span>
                    Save Changes
                  </button>
                  <button className="btn-cancel-overview" onClick={handleCancelEdit}>
                    <span className="btn-icon">❌</span>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Questions Section */}
          {activeSection === 'questions' && (
            <div className="content-section">
              <div className="section-header">
                <h2>❓ Interview Questions</h2>
                <p>Generated questions based on candidate's resume and job requirements</p>
              </div>
              
              <div className="questions-display-container">
                {(() => {
                  const questions = extractQuestions(candidate?.questions);
                  return (
                    <div className="questions-content-professional">
                      <div className="questions-section-professional tech">
                        <div className="section-header-questions">
                          <span className="section-icon">🔧</span>
                          <h3>Technical Questions</h3>
                        </div>
                        <div className="questions-list-container">
                          {questions.techQuestions.length > 0 ? (
                            <ol className="questions-list-professional">
                              {questions.techQuestions.map((question, index) => (
                                <li key={index} className="question-item-professional">
                                  {question}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <div className="no-questions-message">
                              <span className="no-questions-icon">🔍</span>
                              <p>No technical questions available for this candidate.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="questions-section-professional behavioral">
                        <div className="section-header-questions">
                          <span className="section-icon">🤝</span>
                          <h3>Behavioral Questions</h3>
                        </div>
                        <div className="questions-list-container">
                          {questions.behavQuestions.length > 0 ? (
                            <ol className="questions-list-professional">
                              {questions.behavQuestions.map((question, index) => (
                                <li key={index} className="question-item-professional">
                                  {question}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <div className="no-questions-message">
                              <span className="no-questions-icon">🔍</span>
                              <p>No behavioral questions available for this candidate.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Schedule & Status Section */}
          {activeSection === 'schedule' && (
            <div className="content-section">
              <div className="section-header">
                <h2>📅 Schedule & Status Management</h2>
                <p>Manage interview scheduling and application status</p>
              </div>
              
              <div className="form-card">
                <div className="form-grid-professional">
                  <div className="form-group-professional">
                    <label className="form-label-professional">Application Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="form-select-professional"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview Scheduled">Interview Scheduled</option>
                      <option value="Hired">Hired</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  
                  <div className="form-group-professional">
                    <label className="form-label-professional">Interview Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.interviewDate}
                      onChange={(e) => handleInputChange('interviewDate', e.target.value)}
                      className="form-input-professional"
                    />
                  </div>
                  
                  <div className="form-group-professional">
                    <label className="form-label-professional">Attendance Status</label>
                    <select
                      value={formData.attendance}
                      onChange={(e) => handleInputChange('attendance', e.target.value)}
                      className="form-select-professional"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Rescheduled">Rescheduled</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evaluation Section */}
          {activeSection === 'evaluation' && (
            <div className="content-section">
              <div className="section-header">
                <h2>⭐ Candidate Evaluation</h2>
                <p>Assess candidate performance across different criteria</p>
              </div>
              
              <div className="evaluation-grid">
                <div className="evaluation-card">
                  <h3>📊 Overall Rating</h3>
                  <select
                    value={formData.rating}
                    onChange={(e) => handleInputChange('rating', e.target.value)}
                    className="rating-select"
                  >
                    <option value="">Select Overall Rating</option>
                    <option value="Excellent">⭐⭐⭐⭐⭐ Excellent</option>
                    <option value="Good">⭐⭐⭐⭐ Good</option>
                    <option value="Average">⭐⭐⭐ Average</option>
                    <option value="Below Average">⭐⭐ Below Average</option>
                    <option value="Poor">⭐ Poor</option>
                  </select>
                </div>

                <div className="evaluation-card">
                  <h3>💻 Technical Skills</h3>
                  <textarea
                    value={formData.technicalSkills}
                    onChange={(e) => handleInputChange('technicalSkills', e.target.value)}
                    className="evaluation-textarea"
                    placeholder="Assess technical competencies..."
                    rows="4"
                  />
                </div>

                <div className="evaluation-card">
                  <h3>💬 Communication Skills</h3>
                  <textarea
                    value={formData.communicationSkills}
                    onChange={(e) => handleInputChange('communicationSkills', e.target.value)}
                    className="evaluation-textarea"
                    placeholder="Evaluate communication abilities..."
                    rows="4"
                  />
                </div>

                <div className="evaluation-card">
                  <h3>🧠 Problem Solving</h3>
                  <textarea
                    value={formData.problemSolvingSkills}
                    onChange={(e) => handleInputChange('problemSolvingSkills', e.target.value)}
                    className="evaluation-textarea"
                    placeholder="Rate problem-solving approach..."
                    rows="4"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Feedback Section */}
          {activeSection === 'feedback' && (
            <div className="content-section">
              <div className="section-header">
                <h2>📝 Interview Feedback</h2>
                <p>Provide detailed feedback and recommendations</p>
              </div>
              
              <div className="feedback-grid">
                <div className="feedback-card">
                  <h3>📋 Interview Notes</h3>
                  <textarea
                    value={formData.interviewNotes}
                    onChange={(e) => handleInputChange('interviewNotes', e.target.value)}
                    className="feedback-textarea"
                    placeholder="Record detailed interview observations..."
                    rows="6"
                  />
                </div>

                <div className="feedback-card">
                  <h3>💭 Overall Impression</h3>
                  <textarea
                    value={formData.overallImpression}
                    onChange={(e) => handleInputChange('overallImpression', e.target.value)}
                    className="feedback-textarea"
                    placeholder="Share your overall impression of the candidate..."
                    rows="6"
                  />
                </div>

                <div className="feedback-card full-width">
                  <h3>📊 Detailed Feedback</h3>
                  <textarea
                    value={formData.feedback}
                    onChange={(e) => handleInputChange('feedback', e.target.value)}
                    className="feedback-textarea"
                    placeholder="Provide comprehensive feedback on candidate performance, strengths, and areas for improvement..."
                    rows="8"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions Section */}
          {activeSection === 'actions' && (
            <div className="content-section">
              <div className="section-header">
                <h2>🎯 Next Steps & Actions</h2>
                <p>Define next steps and action items for this candidate</p>
              </div>
              
              <div className="actions-card">
                <div className="form-group-professional full-width">
                  <label className="form-label-professional">Next Steps</label>
                  <textarea
                    value={formData.nextSteps}
                    onChange={(e) => handleInputChange('nextSteps', e.target.value)}
                    className="form-textarea-professional"
                    placeholder="Outline the next steps in the hiring process, follow-up actions, or recommendations..."
                    rows="8"
                  />
                </div>

                <div className="action-summary">
                  <h3>📋 Action Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Current Status:</span>
                      <span className="summary-value status-badge-small" style={{ backgroundColor: getStatusColor(formData.status) }}>
                        {formData.status}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Overall Rating:</span>
                      <span className="summary-value" style={{ color: getRatingColor(formData.rating) }}>
                        {formData.rating || 'Not rated'}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Interview Date:</span>
                      <span className="summary-value">
                        {formData.interviewDate ? new Date(formData.interviewDate).toLocaleString() : 'Not scheduled'}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Attendance:</span>
                      <span className="summary-value">{formData.attendance}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Action Buttons */}
          <div className="floating-actions">
            <button className="btn-save-floating" onClick={handleSave}>
              <span className="btn-icon">💾</span>
              Save Changes
            </button>
            <button className="btn-cancel-floating" onClick={onBack}>
              <span className="btn-icon">↩️</span>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewActions;
