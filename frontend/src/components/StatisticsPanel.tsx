import React, { useMemo } from 'react';
import { ZipfData } from '../types';

interface StatisticsPanelProps {
  data: ZipfData[];
  loading: boolean;
}

export function StatisticsPanel({ data, loading }: StatisticsPanelProps) {
  const aggregatedStats = useMemo(() => {
    if (data.length === 0) return null;

    const totalWords = data.reduce((sum, d) => {
      const textTotal = d.words.reduce((wordSum, w) => wordSum + w.frequency, 0);
      return sum + textTotal;
    }, 0);

    const uniqueWords = data.reduce((sum, d) => sum + d.words.length, 0);
    const avgZipfExponent = data.reduce((sum, d) => sum + d.zipfExponent, 0) / data.length;
    const avgRSquared = data.reduce((sum, d) => sum + d.rSquared, 0) / data.length;

    return {
      totalWords,
      uniqueWords,
      avgZipfExponent,
      avgRSquared,
      textCount: data.length,
    };
  }, [data]);

  if (loading) {
    return <div className="statistics-panel loading">Loading statistics...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="statistics-panel empty">
        <p>Select texts to view statistics</p>
      </div>
    );
  }

  return (
    <div className="statistics-panel">
      <h4>Statistics</h4>
      {aggregatedStats && (
        <div className="aggregated-stats">
          <div className="stat-row">
            <span className="stat-label">Texts Selected:</span>
            <span className="stat-value">{aggregatedStats.textCount}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Total Words:</span>
            <span className="stat-value">{aggregatedStats.totalWords.toLocaleString()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Unique Words:</span>
            <span className="stat-value">{aggregatedStats.uniqueWords.toLocaleString()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Avg Zipf Exponent (α):</span>
            <span className="stat-value">{aggregatedStats.avgZipfExponent.toFixed(3)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Avg R²:</span>
            <span className="stat-value">{aggregatedStats.avgRSquared.toFixed(3)}</span>
          </div>
        </div>
      )}

      <div className="individual-stats">
        {data.map((d, index) => {
          const textTotal = d.words.reduce((sum, w) => sum + w.frequency, 0);
          return (
            <div key={d.textId} className="individual-stat-item">
              <div className="stat-title">{d.title}</div>
              <div className="stat-details">
                <div className="mini-stat">
                  <span className="mini-label">Words:</span>
                  <span className="mini-value">{textTotal.toLocaleString()}</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-label">Unique:</span>
                  <span className="mini-value">{d.words.length.toLocaleString()}</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-label">α:</span>
                  <span className="mini-value">{d.zipfExponent.toFixed(3)}</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-label">R²:</span>
                  <span className="mini-value">{d.rSquared.toFixed(3)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
