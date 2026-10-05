import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Target, Trophy, Activity, Hash } from 'lucide-react';
import './DashboardOverview.css';

export const DashboardOverview = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="dashboard-overview">
      <Card>
        <CardContent className="stat-card">
          <div className="stat-icon-wrapper blue">
            <Hash size={20} />
          </div>
          <div>
            <p className="stat-label">Total Interviews</p>
            <p className="stat-value">{stats.total_interviews || 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="stat-card">
          <div className="stat-icon-wrapper green">
            <Target size={20} />
          </div>
          <div>
            <p className="stat-label">Average Score</p>
            <p className="stat-value">{stats.average_score || 0}%</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="stat-card">
          <div className="stat-icon-wrapper gold">
            <Trophy size={20} />
          </div>
          <div>
            <p className="stat-label">Best Score</p>
            <p className="stat-value">{stats.best_score || 0}%</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="stat-card">
          <div className="stat-icon-wrapper purple">
            <Activity size={20} />
          </div>
          <div>
            <p className="stat-label">Latest Score</p>
            <p className="stat-value">{stats.latest_score || 0}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
