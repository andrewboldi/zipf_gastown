import React, { useState, useCallback, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { ZipfData, ChartDataPoint } from '../types';

interface ZipfChartProps {
  data: ZipfData[];
  loading: boolean;
}

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#0088FE',
];

interface ZoomState {
  x1: number | null;
  x2: number | null;
  y1: number | null;
  y2: number | null;
  refAreaLeft: string;
  refAreaRight: string;
}

export function ZipfChart({ data, loading }: ZipfChartProps) {
  const [zoomState, setZoomState] = useState<ZoomState>({
    x1: null,
    x2: null,
    y1: null,
    y2: null,
    refAreaLeft: '',
    refAreaRight: '',
  });
  const [isSelecting, setIsSelecting] = useState(false);

  const chartData = useMemo(() => {
    const allPoints: ChartDataPoint[] = [];
    data.forEach((zipfData, index) => {
      zipfData.words.forEach(word => {
        allPoints.push({
          logRank: Math.log10(word.rank),
          logFrequency: Math.log10(word.frequency),
          rank: word.rank,
          frequency: word.frequency,
          word: word.word,
          textId: zipfData.textId,
          textTitle: zipfData.title,
        });
      });
    });
    return allPoints;
  }, [data]);

  const dataByText = useMemo(() => {
    const grouped: Record<string, ChartDataPoint[]> = {};
    chartData.forEach(point => {
      if (!grouped[point.textId]) {
        grouped[point.textId] = [];
      }
      grouped[point.textId].push(point);
    });
    return grouped;
  }, [chartData]);

  const domain = useMemo(() => {
    if (chartData.length === 0) {
      return { x: [0, 5] as [number, number], y: [0, 6] as [number, number] };
    }
    const xValues = chartData.map(p => p.logRank);
    const yValues = chartData.map(p => p.logFrequency);

    const xMin = zoomState.x1 ?? Math.min(...xValues);
    const xMax = zoomState.x2 ?? Math.max(...xValues);
    const yMin = zoomState.y1 ?? Math.min(...yValues);
    const yMax = zoomState.y2 ?? Math.max(...yValues);

    return {
      x: [xMin - 0.1, xMax + 0.1] as [number, number],
      y: [yMin - 0.1, yMax + 0.1] as [number, number],
    };
  }, [chartData, zoomState]);

  const handleMouseDown = useCallback((e: any) => {
    if (e && e.xValue !== undefined) {
      setIsSelecting(true);
      setZoomState(prev => ({
        ...prev,
        refAreaLeft: e.xValue,
        refAreaRight: e.xValue,
      }));
    }
  }, []);

  const handleMouseMove = useCallback((e: any) => {
    if (isSelecting && e && e.xValue !== undefined) {
      setZoomState(prev => ({
        ...prev,
        refAreaRight: e.xValue,
      }));
    }
  }, [isSelecting]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const { refAreaLeft, refAreaRight } = zoomState;
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setZoomState(prev => ({
        ...prev,
        refAreaLeft: '',
        refAreaRight: '',
      }));
      return;
    }

    const left = Math.min(Number(refAreaLeft), Number(refAreaRight));
    const right = Math.max(Number(refAreaLeft), Number(refAreaRight));

    const pointsInRange = chartData.filter(
      p => p.logRank >= left && p.logRank <= right
    );

    if (pointsInRange.length > 0) {
      const yValues = pointsInRange.map(p => p.logFrequency);
      setZoomState({
        x1: left,
        x2: right,
        y1: Math.min(...yValues),
        y2: Math.max(...yValues),
        refAreaLeft: '',
        refAreaRight: '',
      });
    } else {
      setZoomState(prev => ({
        ...prev,
        refAreaLeft: '',
        refAreaRight: '',
      }));
    }
  }, [isSelecting, zoomState, chartData]);

  const handleReset = useCallback(() => {
    setZoomState({
      x1: null,
      x2: null,
      y1: null,
      y2: null,
      refAreaLeft: '',
      refAreaRight: '',
    });
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const point = payload[0].payload as ChartDataPoint;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-word">"{point.word}"</p>
          <p>Rank: {point.rank}</p>
          <p>Frequency: {point.frequency.toLocaleString()}</p>
          <p className="tooltip-text">From: {point.textTitle}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="zipf-chart loading">Loading chart data...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="zipf-chart empty">
        <p>Select one or more texts to visualize Zipf's law</p>
      </div>
    );
  }

  return (
    <div className="zipf-chart">
      <div className="chart-header">
        <h3>Zipf's Law: Word Frequency vs Rank (Log-Log Scale)</h3>
        <div className="chart-controls">
          <button onClick={handleReset} className="reset-zoom-btn">
            Reset Zoom
          </button>
          <span className="zoom-hint">Drag to zoom into a region</span>
        </div>
      </div>
      <div className="chart-stats">
        {data.map((d, i) => (
          <span key={d.textId} className="stat-item" style={{ color: COLORS[i % COLORS.length] }}>
            {d.title}: α = {d.zipfExponent.toFixed(3)}, R² = {d.rSquared.toFixed(3)}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="logRank"
            name="Log₁₀(Rank)"
            domain={domain.x}
            tickFormatter={(v) => v.toFixed(1)}
            label={{ value: 'Log₁₀(Rank)', position: 'bottom', offset: 0 }}
          />
          <YAxis
            type="number"
            dataKey="logFrequency"
            name="Log₁₀(Frequency)"
            domain={domain.y}
            tickFormatter={(v) => v.toFixed(1)}
            label={{ value: 'Log₁₀(Frequency)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {Object.entries(dataByText).map(([textId, points], index) => (
            <Scatter
              key={textId}
              name={data.find(d => d.textId === textId)?.title || textId}
              data={points}
              fill={COLORS[index % COLORS.length]}
              opacity={0.7}
            />
          ))}

          <ReferenceLine
            stroke="#666"
            strokeDasharray="5 5"
            segment={[
              { x: domain.x[0], y: domain.y[1] },
              { x: domain.x[1], y: domain.y[1] - (domain.x[1] - domain.x[0]) },
            ]}
            label={{ value: 'Ideal Zipf (slope = -1)', position: 'insideTopRight' }}
          />

          {zoomState.refAreaLeft && zoomState.refAreaRight && (
            <ReferenceArea
              x1={zoomState.refAreaLeft}
              x2={zoomState.refAreaRight}
              strokeOpacity={0.3}
              fill="#8884d8"
              fillOpacity={0.3}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
