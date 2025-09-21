// src/components/QuestionsView.js
import React, { useState } from 'react';


const QuestionsView = ({ candidate, onBack }) => {
  const [activeTab, setActiveTab] = useState('technical');

  // Extract questions from HTML (same logic as before)
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

  const questions = candidate ? extractQuestions(candidate.questions) : { techQuestions: [], behavQuestions: [] };

  return (
    <div className="questions-view">
      <div className="questions-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Candidates
        </button>
        <div className="candidate-info">
          <h2>{candidate.name}</h2>
          <p>{candidate.email}</p>
        </div>
      </div>

      <div className="questions-tabs">
        <button 
          className={`tab-btn ${activeTab === 'technical' ? 'active' : ''}`}
          onClick={() => setActiveTab('technical')}
        >
          🔧 Technical Interview Questions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'behavioral' ? 'active' : ''}`}
          onClick={() => setActiveTab('behavioral')}
        >
          🤝 Behavioral Interview Questions
        </button>
      </div>

      <div className="questions-content">
        {activeTab === 'technical' && (
          <div className="questions-section">
            <h3>🔧 Technical Interview Questions</h3>
            <div className="questions-list">
              {questions.techQuestions.map((question, index) => (
                <div key={index} className="question-item">
                  <div className="question-number">{index + 1}</div>
                  <div className="question-text">{question}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'behavioral' && (
          <div className="questions-section">
            <h3>🤝 Behavioral Interview Questions</h3>
            <div className="questions-list">
              {questions.behavQuestions.map((question, index) => (
                <div key={index} className="question-item">
                  <div className="question-number">{index + 1}</div>
                  <div className="question-text">{question}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionsView;
