// src/components/candidateslist.js
import React from 'react';

const CandidatesList = ({ candidates, onViewQuestions, onEditCandidate }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'hired': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getAttendanceColor = (attendance) => {
    switch (attendance?.toLowerCase()) {
      case 'present': return '#10b981';
      case 'absent': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (candidates.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h2>No Candidates Yet</h2>
        <p>Upload your first resume to get started with candidate management.</p>
      </div>
    );
  }

  return (
    <div className="candidates-container">
      <div className="candidates-header">
        <h2>📋 All Candidates</h2>
        <div className="candidates-stats">
          <span className="stat-item">
            Total: <strong>{candidates.length}</strong>
          </span>
          <span className="stat-item">
            Hired: <strong>{candidates.filter(c => c.status === 'Hired').length}</strong>
          </span>
          <span className="stat-item">
            Pending: <strong>{candidates.filter(c => c.status === 'Pending').length}</strong>
          </span>
        </div>
      </div>

      <div className="candidates-table-container">
        <table className="candidates-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Interview Date</th>
              <th>Attendance</th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id}>
                <td>
                  <div className="candidate-name">
                    <div className="candidate-avatar">
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{candidate.name}</span>
                  </div>
                </td>
                <td>{candidate.email}</td>
                <td>{candidate.phone}</td>
                <td>
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(candidate.status) }}
                  >
                    {candidate.status}
                  </span>
                </td>
                <td>{candidate.interviewDate || 'Not scheduled'}</td>
                <td>
                  <span 
                    className="attendance-badge" 
                    style={{ backgroundColor: getAttendanceColor(candidate.attendance) }}
                  >
                    {candidate.attendance}
                  </span>
                </td>
                <td>
                  <div className="rating">
                    {candidate.rating ? (
                      <span className="rating-score">{candidate.rating}</span>
                    ) : (
                      <span className="rating-na">N/A</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="actions">
                    <button 
                      className="btn-action btn-download"
                      onClick={() => window.open(candidate.resumeUrl, '_blank')}
                    >
                      📄 Resume
                    </button>
                    <button 
                      className="btn-action btn-edit"
                      onClick={() => onEditCandidate(candidate)}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn-action btn-questions"
                      onClick={() => onViewQuestions(candidate)}
                    >
                      ❓ Questions
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CandidatesList;
