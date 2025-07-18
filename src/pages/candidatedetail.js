// src/pages/candidatedetail.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CandidateProfile from '../components/candidateprofile';
import QuestionsView from '../components/questionsview';
import EditCandidateModal from '../components/editcandidatemodal';

const CandidateDetail = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchCandidateDetails(id);
  }, [id]);

  const fetchCandidateDetails = async (candidateId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/candidates/${candidateId}`);
      const data = await response.json();
      setCandidate(data);
    } catch (error) {
      console.error('Error fetching candidate:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!candidate) return <div>Candidate not found</div>;

  return (
    <div className="candidate-detail-page">
      <div className="page-header">
        <h1>Candidate Details</h1>
        <button onClick={() => setShowEditModal(true)}>Edit Candidate</button>
      </div>
      
      <CandidateProfile candidate={candidate} />
      <QuestionsView candidate={candidate} />
      
      {showEditModal && (
        <EditCandidateModal 
          candidate={candidate}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => {
            setCandidate(updated);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};

export default CandidateDetail;
