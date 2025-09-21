// src/components/hrdashboard.js
import React, { useState, useMemo } from 'react';

const HRDashboard = ({ candidates, onCandidateUpdate, onSelectCandidate, onRefresh }) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [showQuestions, setShowQuestions] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Enhanced color schemes
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'hired': return { bg: '#10b981', light: '#d1fae5', text: '#065f46' };
      case 'shortlisted': return { bg: '#3b82f6', light: '#dbeafe', text: '#1e40af' };
      case 'rejected': return { bg: '#ef4444', light: '#fee2e2', text: '#991b1b' };
      case 'pending': return { bg: '#f59e0b', light: '#fef3c7', text: '#92400e' };
      default: return { bg: '#6b7280', light: '#f3f4f6', text: '#374151' };
    }
  };

  const getAttendanceColor = (attendance) => {
    switch (attendance?.toLowerCase()) {
      case 'present': return { bg: '#10b981', light: '#d1fae5', text: '#065f46' };
      case 'absent': return { bg: '#ef4444', light: '#fee2e2', text: '#991b1b' };
      case 'pending': return { bg: '#f59e0b', light: '#fef3c7', text: '#92400e' };
      default: return { bg: '#6b7280', light: '#f3f4f6', text: '#374151' };
    }
  };

  // Enhanced filtering and sorting
  const filteredAndSortedCandidates = useMemo(() => {
    let filtered = candidates.filter(candidate => {
      const matchesStatus = filterStatus === 'all' || candidate.status.toLowerCase() === filterStatus;
      const matchesSearch = searchTerm === '' || 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.phone.includes(searchTerm);
      return matchesStatus && matchesSearch;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'uploadedAt':
          aValue = new Date(a.uploadedAt);
          bValue = new Date(b.uploadedAt);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [candidates, filterStatus, searchTerm, sortBy, sortOrder]);

  const handleStatusUpdate = async (candidate, newStatus) => {
    const updatedCandidate = { ...candidate, status: newStatus };
    await onCandidateUpdate(updatedCandidate);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Edit functionality
  const handleEditCandidate = (candidate) => {
    setEditingCandidate(candidate);
    setEditForm({
      name: candidate.name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      status: candidate.status || 'Pending',
      interviewDate: candidate.interviewDate || '',
      attendance: candidate.attendance || 'Pending',
      skills: candidate.skills || '',
      experience: candidate.experience || '',
      position: candidate.position || '',
      notes: candidate.notes || ''
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    const updatedCandidate = {
      ...editingCandidate,
      ...editForm
    };
    
    try {
      await onCandidateUpdate(updatedCandidate);
      setEditingCandidate(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating candidate:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCandidate(null);
    setEditForm({});
  };

  const extractQuestions = (htmlString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    
    const techQuestions = [];
    const behavQuestions = [];
    
    const techSection = Array.from(doc.querySelectorAll('h5')).find(h => 
      h.textContent.toLowerCase().includes('technical')
    );
    const behavSection = Array.from(doc.querySelectorAll('h5')).find(h => 
      h.textContent.toLowerCase().includes('behavioral')
    );
    
    if (techSection) {
      const techUL = techSection.nextElementSibling;
      if (techUL && techUL.tagName === 'UL') {
        Array.from(techUL.querySelectorAll('li')).forEach(li => {
          const text = li.textContent.trim();
          if (text) techQuestions.push(text);
        });
      }
    }
    
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

  if (candidates.length === 0) {
    return (
      <div className="empty-state-enhanced">
        <div className="empty-icon-large">📋</div>
        <h2>No Candidates Found</h2>
        <p>Upload your first resume to get started with candidate management.</p>
        <div className="empty-actions">
          <button className="btn-primary" onClick={() => window.location.href = '#upload'}>
            📤 Upload Resume
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-dashboard-enhanced">
      {/* Enhanced Header */}
      <div className="dashboard-header-enhanced">
        <div className="header-content-enhanced">
          <div className="header-title-section">
            <h1>📊 HR Dashboard</h1>
            <p className="header-subtitle">Candidate Management System</p>
          </div>
          <div className="header-meta">
            <span className="last-updated">
              🕒 Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="dashboard-actions-enhanced">
          <button className="btn-refresh-enhanced" onClick={onRefresh}>
            <span className="btn-icon">🔄</span>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="dashboard-stats-enhanced">
        <div className="stat-card-enhanced total">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{candidates.length}</div>
            <div className="stat-label">Total Candidates</div>
          </div>
        </div>
        <div className="stat-card-enhanced pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{candidates.filter(c => c.status === 'Pending').length}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>
        <div className="stat-card-enhanced shortlisted">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-number">{candidates.filter(c => c.status === 'Shortlisted').length}</div>
            <div className="stat-label">Shortlisted</div>
          </div>
        </div>
        <div className="stat-card-enhanced hired">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{candidates.filter(c => c.status === 'Hired').length}</div>
            <div className="stat-label">Hired</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="dashboard-controls-enhanced">
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search candidates by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-enhanced"
            />
          </div>
        </div>
        <div className="filter-section">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select-enhanced"
          >
            <option value="all">All Candidates</option>
            <option value="pending">Pending</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select-enhanced"
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="status">Sort by Status</option>
            <option value="uploadedAt">Sort by Date</option>
          </select>
          <button 
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Enhanced Results Counter */}
      <div className="results-counter">
        Showing {filteredAndSortedCandidates.length} of {candidates.length} candidates
      </div>

      {/* Enhanced Table */}
      <div className="candidates-table-container-enhanced">
        <table className="candidates-table-enhanced">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('name')}>
                <span>CANDIDATE</span>
                {sortBy === 'name' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="sortable" onClick={() => handleSort('email')}>
                <span>EMAIL</span>
                {sortBy === 'email' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th>PHONE</th>
              <th className="sortable" onClick={() => handleSort('status')}>
                <span>STATUS</span>
                {sortBy === 'status' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th>INTERVIEW DATE</th>
              <th>ATTENDANCE</th>
              <th>RESUME</th>
              <th>QUESTIONS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedCandidates.map((candidate, index) => (
              <tr key={index} className="candidate-row-enhanced">
                <td>
                  <div className="candidate-info-enhanced">
                    <div className="candidate-avatar-enhanced">
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="candidate-details-enhanced">
                      <strong className="candidate-name">{candidate.name}</strong>
                      <small className="candidate-id">ID: {index + 1}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="email-cell">
                    <span className="email-text">{candidate.email}</span>
                  </div>
                </td>
                <td>
                  <div className="phone-cell">
                    <span className="phone-text">{candidate.phone}</span>
                  </div>
                </td>
                <td>
                  <span 
                    className="status-badge-enhanced" 
                    style={{ 
                      backgroundColor: getStatusColor(candidate.status).light,
                      color: getStatusColor(candidate.status).text,
                      border: `1px solid ${getStatusColor(candidate.status).bg}`
                    }}
                  >
                    {candidate.status}
                  </span>
                </td>
                <td>
                  <span className="date-text">
                    {candidate.interviewDate || 'Not scheduled'}
                  </span>
                </td>
                <td>
                  <span 
                    className="attendance-badge-enhanced" 
                    style={{ 
                      backgroundColor: getAttendanceColor(candidate.attendance).light,
                      color: getAttendanceColor(candidate.attendance).text,
                      border: `1px solid ${getAttendanceColor(candidate.attendance).bg}`
                    }}
                  >
                    {candidate.attendance}
                  </span>
                </td>
                <td>
                  <a 
                    href={candidate.resumeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-link-enhanced"
                  >
                    <span className="btn-icon">📄</span>
                    View Resume
                  </a>
                </td>
                <td>
                  <button 
                    className="btn-questions-enhanced"
                    onClick={() => setShowQuestions(showQuestions === index ? null : index)}
                  >
                    <span className="btn-icon">❓</span>
                    Questions
                  </button>
                </td>
                <td>
                  <div className="action-buttons-enhanced">
                    <select 
                      value={candidate.status}
                      onChange={(e) => handleStatusUpdate(candidate, e.target.value)}
                      className="status-select-enhanced"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Hired">Hired</option>
                    </select>
                    <button 
                      className="btn-interview-enhanced"
                      onClick={() => onSelectCandidate(candidate)}
                    >
                      <span className="btn-icon">📝</span>
                      Interview Actions
                    </button>
                    <button 
                      className="btn-edit-enhanced"
                      onClick={() => handleEditCandidate(candidate)}
                    >
                      <span className="btn-icon">✏️</span>
                        Candidate Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Questions Modal */}
      {showQuestions !== null && (
        <div className="questions-modal-enhanced">
          <div className="modal-overlay" onClick={() => setShowQuestions(null)}></div>
          <div className="modal-content-enhanced">
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <h3>Interview Questions</h3>
                <p className="modal-subtitle">{filteredAndSortedCandidates[showQuestions].name}</p>
              </div>
              <button 
                className="close-btn-enhanced"
                onClick={() => setShowQuestions(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body-enhanced">
              {(() => {
                const questions = extractQuestions(filteredAndSortedCandidates[showQuestions].questions);
                return (
                  <div className="questions-content-enhanced">
                    <div className="questions-section-enhanced tech">
                      <div className="section-header-questions">
                        <span className="section-icon">🔧</span>
                        <h4>Technical Questions</h4>
                      </div>
                      <ol className="questions-list">
                        {questions.techQuestions.map((q, i) => (
                          <li key={i} className="question-item">{q}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="questions-section-enhanced behavioral">
                      <div className="section-header-questions">
                        <span className="section-icon">🤝</span>
                        <h4>Behavioural Questions</h4>
                      </div>
                      <ol className="questions-list">
                        {questions.behavQuestions.map((q, i) => (
                          <li key={i} className="question-item">{q}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* NEW: Edit Candidate Modal */}
      {editingCandidate && (
        <div className="questions-modal-enhanced">
          <div className="modal-overlay" onClick={handleCancelEdit}></div>
          <div className="modal-content-enhanced" style={{ maxWidth: '800px' }}>
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <h3>✏️ Edit Candidate</h3>
                <p className="modal-subtitle">Update candidate information</p>
              </div>
              <button 
                className="close-btn-enhanced"
                onClick={handleCancelEdit}
              >
                ×
              </button>
            </div>
            <div className="modal-body-enhanced">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Personal Information Section */}
                <div className="questions-section-enhanced">
                  <div className="section-header-questions">
                    <span className="section-icon">👤</span>
                    <h4>Personal Information</h4>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => handleEditFormChange('name', e.target.value)}
                        className="search-input-enhanced"
                        placeholder="Enter full name"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => handleEditFormChange('email', e.target.value)}
                        className="search-input-enhanced"
                        placeholder="Enter email address"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => handleEditFormChange('phone', e.target.value)}
                        className="search-input-enhanced"
                        placeholder="Enter phone number"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Position Applied
                      </label>
                      <input
                        type="text"
                        value={editForm.position}
                        onChange={(e) => handleEditFormChange('position', e.target.value)}
                        className="search-input-enhanced"
                        placeholder="Enter position"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status & Schedule Section */}
                <div className="questions-section-enhanced">
                  <div className="section-header-questions">
                    <span className="section-icon">📅</span>
                    <h4>Status & Schedule</h4>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Application Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => handleEditFormChange('status', e.target.value)}
                        className="filter-select-enhanced"
                        style={{ width: '100%' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Hired">Hired</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Interview Date
                      </label>
                      <input
                        type="datetime-local"
                        value={editForm.interviewDate}
                        onChange={(e) => handleEditFormChange('interviewDate', e.target.value)}
                        className="search-input-enhanced"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Attendance Status
                      </label>
                      <select
                        value={editForm.attendance}
                        onChange={(e) => handleEditFormChange('attendance', e.target.value)}
                        className="filter-select-enhanced"
                        style={{ width: '100%' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        value={editForm.experience}
                        onChange={(e) => handleEditFormChange('experience', e.target.value)}
                        className="search-input-enhanced"
                        placeholder="Years of experience"
                        min="0"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                <div className="questions-section-enhanced">
                  <div className="section-header-questions">
                    <span className="section-icon">📝</span>
                    <h4>Additional Information</h4>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                      Skills
                    </label>
                    <textarea
                      value={editForm.skills}
                      onChange={(e) => handleEditFormChange('skills', e.target.value)}
                      className="search-input-enhanced"
                      placeholder="Enter skills separated by commas"
                      rows="3"
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                      Notes
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => handleEditFormChange('notes', e.target.value)}
                      className="search-input-enhanced"
                      placeholder="Additional notes about the candidate"
                      rows="4"
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={handleCancelEdit}
                style={{
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>💾</span>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
