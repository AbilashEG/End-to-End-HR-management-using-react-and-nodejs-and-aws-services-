// src/components/resumeupload.js - Enhanced Combined Upload (Fixed)
import React, { useState } from 'react';
import axios from 'axios';

const ResumeUpload = ({ onResumeUploaded }) => {
  // Combined upload states
  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [processingStage, setProcessingStage] = useState('');

  const handleResumeChange = (e) => {
    const selectedFile = e.target.files[0];
    setResumeFile(selectedFile);
    setError('');
    setResult(null);
  };

  const handleJdChange = (e) => {
    const selectedFile = e.target.files[0];
    setJdFile(selectedFile);
    setError('');
    setResult(null);
  };

  // Combined upload function for both files
  const handleCombinedUpload = async () => {
    if (!resumeFile) {
      setError('Please select a resume file');
      return;
    }

    const formData = new FormData();
    formData.append('resume', resumeFile);
    
    // Add JD if provided
    if (jdFile) {
      formData.append('jobDescription', jdFile);
    }

    try {
      setUploading(true);
      setError('');
      setProgress(0);

      // Stage 1: Uploading files
      setProcessingStage('Uploading files to cloud storage...');
      setProgress(10);

      const response = await axios.post('http://localhost:5000/api/upload-combined', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        onUploadProgress: (progressEvent) => {
          const uploadPercent = Math.round((progressEvent.loaded * 40) / progressEvent.total);
          setProgress(10 + uploadPercent);
          
          if (uploadPercent > 30) {
            setProcessingStage('Processing documents with AI...');
          }
        }
      });

      // Simulate processing stages for better UX
      setProgress(60);
      setProcessingStage('Extracting candidate information...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProgress(80);
      setProcessingStage(jdFile ? 'Generating enhanced interview questions...' : 'Generating interview questions...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProgress(100);
      setProcessingStage('Processing complete!');
      setResult(response.data);
      
      if (onResumeUploaded) {
        onResumeUploaded(response.data);
      }

    } catch (err) {
      console.error('Combined Upload error:', err);
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setProcessingStage('');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setResumeFile(null);
    setJdFile(null);
    setResult(null);
    setError('');
    setProgress(0);
    setProcessingStage('');
    
    // Reset file inputs
    const resumeInput = document.querySelector('#resume-file');
    const jdInput = document.querySelector('#jd-file');
    if (resumeInput) resumeInput.value = '';
    if (jdInput) jdInput.value = '';
  };

  return (
    <div className="resume-upload-section">
      <div className="section-header">
        <h2>📄 Smart Resume & Job Description Upload</h2>
        <h3>Upload resume and optional job description for enhanced AI matching</h3>
      </div>

      {/* Combined Upload Container */}
      <div className="upload-container-centered">
        <div className="upload-card-main enhanced-upload-card">
          
          

          {/* Resume Upload Area */}
          <div className="file-upload-area">
            <div className="upload-section-title">
              <h4>📄 Candidate Resume</h4>
              <span className="required-badge">Required</span>
            </div>
            <input
              type="file"
              onChange={handleResumeChange}
              accept=".pdf,.doc,.docx"
              className="file-input"
              id="resume-file"
              disabled={uploading}
            />
            <label htmlFor="resume-file" className="file-label">
              {resumeFile ? (
                <div className="file-selected">
                  <span className="file-icon">📎</span>
                  <div className="file-info">
                    <span className="file-name">{resumeFile.name}</span>
                    <span className="file-size">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <span className="file-status">✅</span>
                </div>
              ) : (
                <div className="file-placeholder">
                  <span className="upload-icon">📤</span>
                  <span className="upload-text">Click to select resume file</span>
                  <span className="file-types">Supports PDF, DOC, DOCX</span>
                </div>
              )}
            </label>
          </div>

          {/* JD Upload Area - Inline */}
          <div className="file-upload-area jd-upload-inline">
            <div className="upload-section-title">
              <h4>📋 Job Description</h4>
              <span className="optional-badge"></span>
            </div>
            <input
              type="file"
              onChange={handleJdChange}
              accept=".pdf,.doc,.docx,.txt"
              className="file-input"
              id="jd-file"
              disabled={uploading}
            />
            <label htmlFor="jd-file" className="file-label jd-file-label">
              {jdFile ? (
                <div className="file-selected">
                  <span className="file-icon">📎</span>
                  <div className="file-info">
                    <span className="file-name">{jdFile.name}</span>
                    <span className="file-size">{(jdFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <span className="file-status">✅</span>
                </div>
              ) : (
                <div className="file-placeholder">
                  <span className="upload-icon">📋</span>
                  <span className="upload-text">Click to select job description (Optional)</span>
                  <span className="file-types">Supports PDF, DOC, DOCX, TXT</span>
                </div>
              )}
            </label>
          </div>

          

          {/* Progress Display */}
          {uploading && (
            <div className="upload-progress enhanced-progress">
              <div className="progress-header">
                <h4>🚀 Processing Files with AI</h4>
                <span className="progress-percentage">{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">
                <span className="processing-stage">{processingStage}</span>
              </div>
              <div className="processing-steps">
                <div className={`step ${progress >= 10 ? 'completed' : 'pending'}`}>
                  <span className="step-icon">☁️</span>
                  <span>Upload to Cloud</span>
                </div>
                <div className={`step ${progress >= 60 ? 'completed' : 'pending'}`}>
                  <span className="step-icon">📄</span>
                  <span>Extract Data</span>
                </div>
                <div className={`step ${progress >= 80 ? 'completed' : 'pending'}`}>
                  <span className="step-icon">🤖</span>
                  <span>AI Analysis</span>
                </div>
                <div className={`step ${progress === 100 ? 'completed' : 'pending'}`}>
                  <span className="step-icon">✅</span>
                  <span>Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Combined Action Button */}
          <div className="upload-actions">
            <button 
              className="btn-upload-combined" 
              onClick={handleCombinedUpload} 
              disabled={uploading || !resumeFile}
            >
              {uploading ? (
                <>
                  <div className="spinner"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  <span className="btn-text">
                    {jdFile ? 
                      `Process Resume + JD with Enhanced AI` : 
                      'Process Resume with AI'
                    }
                  </span>
                  <span className="btn-badge">
                    {jdFile ? 'Enhanced' : 'Standard'}
                  </span>
                </>
              )}
            </button>
            
            {(resumeFile || jdFile || result) && (
              <button className="btn-reset" onClick={resetUpload} disabled={uploading}>
                <span>🔄</span>
                Reset All
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Results Display */}
      {result && (
        <div className="upload-success-enhanced">
          <div className="success-header">
            <span className="success-icon">✅</span>
            <h3>{jdFile ? 'Enhanced Processing Complete!' : 'Resume Processed Successfully!'}</h3>
            <p>{jdFile ? 'Resume and Job Description processed with AI matching' : 'Resume processed with AI analysis'}</p>
          </div>
          
          <div className="results-container">
            <div className="result-section candidate-info">
              <h4>👤 Candidate Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Name:</strong> 
                  <span>{result.name}</span>
                </div>
                <div className="info-item">
                  <strong>Email:</strong> 
                  <span>{result.email}</span>
                </div>
                <div className="info-item">
                  <strong>Phone:</strong> 
                  <span>{result.phone}</span>
                </div>
                <div className="info-item">
                  <strong>Status:</strong> 
                  <span className="status-pending">Pending Review</span>
                </div>
              </div>
            </div>

            <div className="result-section ai-analysis">
              <h4>🤖 AI Analysis Results</h4>
              <div className="analysis-grid">
                <div className="analysis-item">
                  <span className="analysis-icon">❓</span>
                  <span>Interview Questions: 10 Generated</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-icon">🎯</span>
                  <span>Technical Questions: 5</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-icon">🤝</span>
                  <span>Behavioral Questions: 5</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-icon">{result.aiUsed ? '✨' : '🔄'}</span>
                  <span>{result.aiUsed ? 'AI Enhanced' : 'Standard Processing'}</span>
                </div>
                {jdFile && result.enhancedMatching && (
                  <>
                    <div className="analysis-item enhanced">
                      <span className="analysis-icon">🎯</span>
                      <span>Job Matching: Active</span>
                    </div>
                    <div className="analysis-item enhanced">
                      <span className="analysis-icon">⭐</span>
                      <span>Enhanced Scoring: Enabled</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="result-actions">
            <div className="action-buttons">
              <a 
                href={result.resumeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-view-document"
              >
                📄 View Resume
              </a>
              {result.jdUrl && (
                <a 
                  href={result.jdUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-view-document"
                >
                  📋 View Job Description
                </a>
              )}
            </div>
            <div className="success-message">
              <p>✨ {jdFile ? 'Enhanced candidate profile' : 'Candidate'} has been added to the system and is ready for review!</p>
              <small>🔄 Redirecting to HR Dashboard in 3 seconds...</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
