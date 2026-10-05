import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Code,
  Users,
  MessageSquare,
  AlertCircle,
  Play,
} from 'lucide-react';
import './InterviewSetup.css';

const INTERVIEW_TYPES = [
  { value: 'Technical', label: 'Technical', icon: Code, description: 'Coding & system design' },
  { value: 'HR', label: 'HR', icon: Users, description: 'Culture & fit' },
  { value: 'Behavioral', label: 'Behavioral', icon: MessageSquare, description: 'STAR-based scenarios' },
];

export const InterviewSetup = () => {
  const navigate = useNavigate();

  // Data states
  const [resume, setResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [jdLoading, setJdLoading] = useState(true);

  // Form state
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [selectedJdId, setSelectedJdId] = useState(null); // null = none
  const [newJdMode, setNewJdMode] = useState(false);
  const [newJdText, setNewJdText] = useState('');
  const [newJdSaving, setNewJdSaving] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch resume
  const fetchResume = useCallback(async () => {
    try {
      setResumeLoading(true);
      const data = await api.get('/users/me/resume');
      setResume(data);
    } catch (_err) {
      // 404 = no resume, which is fine
      setResume(null);
    } finally {
      setResumeLoading(false);
    }
  }, []);

  // Fetch job descriptions
  const fetchJobDescriptions = useCallback(async () => {
    try {
      setJdLoading(true);
      const data = await api.get('/job-descriptions');
      setJobDescriptions(Array.isArray(data) ? data : []);
    } catch (_err) {
      setJobDescriptions([]);
    } finally {
      setJdLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResume();
    fetchJobDescriptions();
  }, [fetchResume, fetchJobDescriptions]);

  // Validation
  const validate = () => {
    const newErrors = {};
    if (!role.trim()) {
      newErrors.role = 'Role is required';
    }
    if (!interviewType) {
      newErrors.interviewType = 'Select an interview type';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save inline JD
  const handleSaveNewJd = async () => {
    const trimmed = newJdText.trim();
    if (trimmed.length < 20) {
      setErrors((prev) => ({ ...prev, newJd: 'Job description must be at least 20 characters' }));
      return;
    }
    setErrors((prev) => { const { newJd: _, ...rest } = prev; return rest; });

    try {
      setNewJdSaving(true);
      const created = await api.post('/job-descriptions', { raw_text: trimmed });
      setJobDescriptions((prev) => [created, ...prev]);
      setSelectedJdId(created.id);
      setNewJdMode(false);
      setNewJdText('');
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        newJd: err?.data?.message || 'Failed to save job description',
      }));
    } finally {
      setNewJdSaving(false);
    }
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (submitting) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const body = {
        role: role.trim(),
        interview_type: interviewType,
      };
      if (selectedJdId) {
        body.job_description_id = selectedJdId;
      }

      const data = await api.post('/sessions', body);

      // Navigate to the interview room with the new session ID
      navigate(`/interview/${data.session._id}`);
    } catch (err) {
      const message = err?.data?.message || err?.message || 'Failed to create interview session. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Truncate JD preview
  const truncateJd = (text, maxLen = 120) => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
  };

  return (
    <div className="setup-container">
      {/* Header */}
      <header className="setup-header">
        <button
          type="button"
          className="setup-back"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <h1 className="setup-title">New Interview</h1>
        <p className="setup-subtitle">
          Configure your practice interview session.
        </p>
      </header>

      <form className="setup-form" onSubmit={handleSubmit} noValidate>
        {/* Resume status */}
        <div className="setup-section">
          <span className="setup-section-label">Resume</span>
          {resumeLoading ? (
            <div className="resume-loading">
              <Loader2 size={16} className="btn-spinner" />
              Loading resume…
            </div>
          ) : resume ? (
            <div className="resume-status">
              <div className="resume-icon has-resume">
                <CheckCircle2 size={20} />
              </div>
              <div className="resume-info">
                <p className="resume-name">{resume.fileName}</p>
                <p className="resume-detail">
                  Uploaded {new Date(resume.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          ) : (
            <div className="resume-status">
              <div className="resume-icon no-resume">
                <AlertTriangle size={20} />
              </div>
              <div className="resume-info">
                <p className="resume-name">No resume uploaded</p>
                <p className="resume-detail">
                  Upload a resume via the API to personalize questions. You can still start an interview without one.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Role */}
        <div className="setup-section">
          <Label htmlFor="role">Target Role</Label>
          <Input
            id="role"
            type="text"
            placeholder="e.g. Senior Frontend Engineer"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              if (errors.role) setErrors((prev) => { const { role: _, ...rest } = prev; return rest; });
            }}
            error={errors.role}
            autoComplete="off"
          />
        </div>

        {/* Interview type */}
        <div className="setup-section">
          <span className="setup-section-label">Interview Type</span>
          <div className="type-options" role="radiogroup" aria-label="Interview type">
            {INTERVIEW_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  className={`type-option ${interviewType === t.value ? 'selected' : ''}`}
                  onClick={() => {
                    setInterviewType(t.value);
                    if (errors.interviewType) setErrors((prev) => { const { interviewType: _, ...rest } = prev; return rest; });
                  }}
                  role="radio"
                  aria-checked={interviewType === t.value}
                  aria-label={t.label}
                >
                  <Icon size={24} className="type-option-icon" />
                  <span className="type-option-name">{t.label}</span>
                </button>
              );
            })}
          </div>
          {errors.interviewType && <span className="field-error">{errors.interviewType}</span>}
        </div>

        {/* Job description */}
        <div className="setup-section">
          <span className="setup-section-label">Job Description (optional)</span>
          {jdLoading ? (
            <div className="jd-loading">
              <Loader2 size={16} className="btn-spinner" />
              Loading job descriptions…
            </div>
          ) : (
            <div className="jd-options">
              {/* None option */}
              <label className="jd-option" htmlFor="jd-none">
                <input
                  type="radio"
                  id="jd-none"
                  name="jd-select"
                  checked={selectedJdId === null && !newJdMode}
                  onChange={() => { setSelectedJdId(null); setNewJdMode(false); }}
                />
                <span className="jd-none-label">No job description</span>
              </label>

              {/* Existing JDs */}
              {jobDescriptions.map((jd) => (
                <label className={`jd-option ${selectedJdId === jd.id ? 'selected' : ''}`} key={jd.id} htmlFor={`jd-${jd.id}`}>
                  <input
                    type="radio"
                    id={`jd-${jd.id}`}
                    name="jd-select"
                    checked={selectedJdId === jd.id}
                    onChange={() => { setSelectedJdId(jd.id); setNewJdMode(false); }}
                  />
                  <div className="jd-option-content">
                    <p className="jd-option-label">
                      <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '0.375rem' }} />
                      Added {new Date(jd.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="jd-option-text">{truncateJd(jd.raw_text)}</p>
                  </div>
                </label>
              ))}

              {/* Add new JD inline */}
              {!newJdMode ? (
                <button
                  type="button"
                  className="jd-option"
                  onClick={() => { setNewJdMode(true); setSelectedJdId(null); }}
                  style={{ justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-color)' }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>+ Add a job description</span>
                </button>
              ) : (
                <div className="jd-inline-form">
                  <textarea
                    className={`jd-textarea ${errors.newJd ? 'jd-textarea-error' : ''}`}
                    placeholder="Paste the job description text here…"
                    value={newJdText}
                    onChange={(e) => {
                      setNewJdText(e.target.value);
                      if (errors.newJd) setErrors((prev) => { const { newJd: _, ...rest } = prev; return rest; });
                    }}
                    rows={4}
                    aria-label="Job description text"
                  />
                  {errors.newJd && <span className="field-error">{errors.newJd}</span>}
                  <div className="jd-textarea-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNewJdMode(false); setNewJdText(''); setErrors((prev) => { const { newJd: _, ...rest } = prev; return rest; }); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveNewJd}
                      isLoading={newJdSaving}
                      disabled={newJdSaving || newJdText.trim().length < 20}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <hr className="setup-divider" />

        {/* Error banner */}
        {submitError && (
          <div className="setup-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{submitError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="setup-footer">
          <Button
            type="submit"
            size="lg"
            isLoading={submitting}
            disabled={submitting}
          >
            <Play size={16} />
            Start Interview
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => navigate('/dashboard')}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
