// src/pages/dashboard.js
import React, { useState, useEffect } from 'react';
import CandidatesList from '../components/candidatelist';
import QuestionsView from '../components/questionsview';
import EditCandidateModal from '../components/editcandidatemodal';


const Dashboard = () => {
  const [currentView, setCurrentView] = useState('candidates'); // 'candidates' or 'questions'
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await fetch('http://localhost:5000/api/candidates');
      const data = await response.json();
      setCandidates(data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuestions = (candidate) => {
    setSelectedCandidate(candidate);
    setCurrentView('questions');
  };

  const handleEditCandidate = (candidate) => {
    setSelectedCandidate(candidate);
    setShowEditModal(true);
  };

  const handleUpdateCandidate = async (updatedCandidate) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`http://localhost:5000/api/candidates/${updatedCandidate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCandidate),
      });
      
      if (response.ok) {
        setCandidates(candidates.map(c => 
          c.id === updatedCandidate.id ? updatedCandidate : c
        ));
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating candidate:', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 HR Dashboard</h1>
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${currentView === 'candidates' ? 'active' : ''}`}
            onClick={() => setCurrentView('candidates')}
          >
            📋 All Candidates
          </button>
          {selectedCandidate && (
            <button 
              className={`toggle-btn ${currentView === 'questions' ? 'active' : ''}`}
              onClick={() => setCurrentView('questions')}
            >
              ❓ Questions
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        {currentView === 'candidates' ? (
          <CandidatesList 
            candidates={candidates}
            loading={loading}
            onViewQuestions={handleViewQuestions}
            onEditCandidate={handleEditCandidate}
          />
        ) : (
          <QuestionsView 
            candidate={selectedCandidate}
            onBack={() => setCurrentView('candidates')}
          />
        )}
      </div>

      {showEditModal && (
        <EditCandidateModal 
          candidate={selectedCandidate}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateCandidate}
        />
      )}
    </div>
  );
};

export default Dashboard;
