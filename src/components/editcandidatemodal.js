// src/components/editcandidatemodal.js
import React, { useState } from 'react';

const EditCandidateModal = ({ candidate, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    status: candidate.status,
    attendance: candidate.attendance,
    rating: candidate.rating,
    interviewDate: candidate.interviewDate || '',
    notes: candidate.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...candidate, ...formData });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>✏️ Edit Candidate - {candidate.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Pending">Pending</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Attendance</label>
              <select
                name="attendance"
                value={formData.attendance}
                onChange={handleChange}
              >
                <option value="Pending">Pending</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
            </div>
            <div className="form-group">
              <label>Rating</label>
              <select
                name="rating"
                value={formData.rating}
                onChange={handleChange}
              >
                <option value="">Select Rating</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Fair</option>
                <option value="3">3 - Good</option>
                <option value="4">4 - Very Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Interview Date & Time</label>
            <input
              type="datetime-local"
              name="interviewDate"
              value={formData.interviewDate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Add any additional notes about the candidate..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCandidateModal;
