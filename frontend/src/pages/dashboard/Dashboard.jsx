import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { DashboardOverview } from './components/DashboardOverview';
import { DashboardTrends } from './components/DashboardTrends';
import { DashboardSessions } from './components/DashboardSessions';
import { Play, AlertCircle, Loader2, Target } from 'lucide-react';
import './Dashboard.css';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/users/me/progress');
      setData(response);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const hasData = data && data.stats && data.stats.total_interviews > 0;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome back, {user?.name}</h1>
          <p className="dashboard-subtitle">Track your performance and prepare for your next role.</p>
        </div>
        <Button className="start-btn" onClick={() => navigate('/interview/setup')}>
          <Play size={16} />
          <span>New Interview</span>
        </Button>
      </header>

      {/* States */}
      {isLoading ? (
        <div className="dashboard-loading">
          <Loader2 className="spinner" size={32} />
          <p>Loading your progress...</p>
        </div>
      ) : error ? (
        <div className="dashboard-error">
          <AlertCircle size={32} />
          <p>{error}</p>
          <Button variant="secondary" onClick={fetchProgress}>Retry</Button>
        </div>
      ) : !hasData ? (
        <div className="dashboard-empty">
          <div className="empty-icon-wrapper">
            <Target size={32} />
          </div>
          <h2>No Interviews Yet</h2>
          <p>Complete your first interview to see your performance metrics and trends here.</p>
          <Button className="empty-action" onClick={() => navigate('/interview/setup')}>
            Start First Interview
          </Button>
        </div>
      ) : (
        /* Content */
        <div className="dashboard-content">
          <DashboardOverview stats={data.stats} />

          <DashboardTrends
            pace={data.pace_trend}
            filler={data.filler_trend}
            star={data.star_trend}
            content={data.content_trend}
          />

          <DashboardSessions sessions={data.sessions} />
        </div>
      )}
    </div>
  );
};
