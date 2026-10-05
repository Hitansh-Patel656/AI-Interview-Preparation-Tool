import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './DashboardTrends.css';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-date">{formatDate(label)}</p>
        <p className="tooltip-value">
          {payload[0].value} {unit}
        </p>
      </div>
    );
  }
  return null;
};

const TrendChart = ({ title, data, color, unit, yDomain }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="trend-card">
        <CardHeader>
          <CardTitle className="trend-title">{title}</CardTitle>
        </CardHeader>
        <CardContent className="trend-empty">
          <p>Not enough data</p>
        </CardContent>
      </Card>
    );
  }

  // Determine trend interpretation (simple comparison of last two data points)
  let interpretation = '';
  if (data.length >= 2) {
    const last = data[data.length - 1].value;
    const prev = data[data.length - 2].value;

    // For filler words, lower is better. For others, higher is better.
    const isFiller = title.toLowerCase().includes('filler');

    if (last === prev) {
      interpretation = 'Stable';
    } else if (last > prev) {
      interpretation = isFiller ? 'Declining' : 'Improving';
    } else {
      interpretation = isFiller ? 'Improving' : 'Declining';
    }
  }

  return (
    <Card className="trend-card">
      <CardHeader className="trend-header">
        <CardTitle className="trend-title">{title}</CardTitle>
        {interpretation && (
          <span className={`trend-badge trend-${interpretation.toLowerCase()}`}>
            {interpretation}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E7E4" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B6B6B' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B6B6B' }}
                domain={yDomain || ['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardTrends = ({ pace, filler, star, content }) => {
  return (
    <div className="dashboard-trends">
      <h2 className="section-title">Performance Trends</h2>
      <div className="trends-grid">
        <TrendChart
          title="Content Score"
          data={content}
          color="#0F52BA"
          unit="%"
          yDomain={[0, 100]}
        />
        <TrendChart
          title="STAR Method Compliance"
          data={star}
          color="#8B5CF6"
          unit="%"
          yDomain={[0, 100]}
        />
        <TrendChart
          title="Speaking Pace"
          data={pace}
          color="#10B981"
          unit="WPM"
        />
        <TrendChart
          title="Filler Words"
          data={filler}
          color="#F59E0B"
          unit="words"
          yDomain={[0, 'auto']}
        />
      </div>
    </div>
  );
};
