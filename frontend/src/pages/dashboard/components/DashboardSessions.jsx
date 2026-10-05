import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Calendar, Briefcase, ChevronRight } from 'lucide-react';
import './DashboardSessions.css';

export const DashboardSessions = ({ sessions }) => {
  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="dashboard-sessions">
      <h2 className="section-title">Recent Interviews</h2>

      <div className="sessions-list">
        {sessions.map((session) => (
          <Card key={session.session_id} className="session-card">
            <CardContent className="session-content">
              <div className="session-info">
                <div className="session-primary">
                  <h3 className="session-role">{session.role || 'Interview'}</h3>
                  <span className="session-score">{session.overall_score || 0}%</span>
                </div>

                <div className="session-meta">
                  <span className="meta-item">
                    <Briefcase size={14} />
                    {session.company_name || 'General'}
                  </span>
                  <span className="meta-item">
                    <Calendar size={14} />
                    {new Date(session.completed_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className="session-action">
                {/*
                  Future: wrap in Link to detailed view
                  <Link to={`/sessions/${session.session_id}`} className="view-btn">
                */}
                <button className="view-btn" disabled>
                  <span>View Details</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
