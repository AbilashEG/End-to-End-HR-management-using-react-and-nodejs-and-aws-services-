// src/components/resumeupload.js
import React, { useState } from 'react';
import axios from 'axios';

const ResumeUpload = ({ onResumeUploaded }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError('');
    setResult(null);
    setUploadStep('idle');
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a resume file');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setUploading(true);
      setError('');
      setProgress(0);

      setUploadStep('processing');
      setProgress(20);

      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 80) / progressEvent.total);
          setProgress(20 + percentCompleted);
        }
      });

      setProgress(100);
      setResult(response.data);
      setUploadStep('complete');
      
      if (onResumeUploaded) {
        onResumeUploaded(response.data);
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setUploadStep('error');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    setError('');
    setUploadStep('idle');
    setProgress(0);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="resume-upload-section">
      <div className="section-header">
        <h2>📄 Resume Upload & Processing</h2>
        <h3> Upload candidate resume </h3>
      </div>

      {/* Centered Upload Card */}
      <div className="upload-container-centered">
        <div className="upload-card-main">
          <div className="file-upload-area">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
              className="file-input"
              id="resume-file"
              disabled={uploading}
            />
            <label htmlFor="resume-file" className="file-label">
              {file ? (
                <div className="file-selected">
                  <span className="file-icon">📎</span>
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
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

          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">
                {uploadStep === 'processing' && 'Processing resume with AI...'}
                {uploadStep === 'complete' && 'Processing complete!'}
              </div>
            </div>
          )}

          <div className="upload-actions">
            <button 
              className="btn-upload-primary" 
              onClick={handleUpload} 
              disabled={uploading || !file}
            >
              {uploading ? (
                <>
                  <div className="spinner"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Process Resume
                </>
              )}
            </button>
            
            {(file || result) && (
              <button className="btn-reset" onClick={resetUpload} disabled={uploading}>
                <span>🔄</span>
                Reset
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="upload-success-centered">
          <div className="success-header">
            <span className="success-icon">✅</span>
            <h3>Resume Processed Successfully!</h3>
          </div>
          <div className="candidate-preview">
            <div className="preview-item">
              <strong>Name:</strong> {result.name}
            </div>
            <div className="preview-item">
              <strong>Email:</strong> {result.email}
            </div>
            <div className="preview-item">
              <strong>Phone:</strong> {result.phone}
            </div>
            <div className="preview-item">
              <strong>Status:</strong> <span className="status-pending">Pending</span>
            </div>
            <div className="preview-item">
              <strong>Questions Generated:</strong> 10 (5 Technical + 5 Behavioral)
            </div>
            <div className="preview-item">
              <strong>Resume URL:</strong> 
              <a href={result.resumeUrl} target="_blank" rel="noopener noreferrer">
                📄 View Resume
              </a>
            </div>
          </div>
          <div className="success-actions">
            <p>✨ Candidate has been added to the system and is ready for review!</p>
            <small>Redirecting to HR Dashboard...</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
