// src/components/CandidateProfile.js
import React from 'react';

const CandidateProfile = ({ candidate }) => {
  return (
    <div className="candidate-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          {candidate.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h2>{candidate.name}</h2>
          <p>{candidate.email}</p>
          <p>{candidate.phone}</p>
        </div>
      </div>
      
      <div className="profile-details">
        <div className="detail-item">
          <strong>Status:</strong> {candidate.status}
        </div>
        <div className="detail-item">
          <strong>Interview Date:</strong> {candidate.interviewDate}
        </div>
        <div className="detail-item">
          <strong>Rating:</strong> {candidate.rating || 'N/A'}
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;
