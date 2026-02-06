import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

const COLORS = [
  { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
  { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
  { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
  { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' },
  { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
];

function App() {
  const [texts, setTexts] = useState([]);
  const [selectedTexts, setSelectedTexts] = useState([]);
  const [textData, setTextData] = useState({});
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState('loglog'); // 'loglog', 'linear', 'scatter'
  const [showIdeal, setShowIdeal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('chart'); // 'chart', 'table', 'compare'
  const [tableData, setTableData] = useState([]);

  // Fetch available texts
  useEffect(() => {
    axios.get('http://localhost:3001/api/texts')
      .then(response => {
        setTexts(response.data);
        // Select first text by default
        if (response.data.length > 0) {
          setSelectedTexts([response.data[0].id]);
        }
      })
      .catch(error => {
        console.error('Error fetching texts:', error);
      });
  }, []);

  // Fetch data for selected texts
  useEffect(() => {
    if (selectedTexts.length === 0) return;
    
    setLoading(true);
    const fetchPromises = selectedTexts.map(textId =>
      axios.get(`http://localhost:3001/api/word-frequencies/${textId}?limit=1000`)
        .then(res => ({ id: textId, data: res.data }))
    );

    Promise.all(fetchPromises)
      .then(results => {
        const newTextData = {};
        results.forEach(({ id, data }) => {
          newTextData[id] = data;
        });
        setTextData(newTextData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching word frequencies:', error);
        setLoading(false);
      });

    // Fetch stats
    if (selectedTexts.length === 1) {
      axios.get(`http://localhost:3001/api/zipf-stats/${selectedTexts[0]}`)
        .then(res => setStats(res.data))
        .catch(err => console.error('Error fetching stats:', err));
    } else if (selectedTexts.length > 1) {
      axios.get(`http://localhost:3001/api/compare?texts=${selectedTexts.join(',')}`)
        .then(res => {
          setStats({ comparison: res.data });
        })
        .catch(err => console.error('Error fetching comparison:', err));
    }
  }, [selectedTexts]);

  // Update chart when data or view changes
  useEffect(() => {
    if (Object.keys(textData).length === 0) return;

    const datasets = [];
    
    selectedTexts.forEach((textId, index) => {
      const data = textData[textId];
      if (!data) return;

      const frequencies = Object.values(data.frequencies);
      const color = COLORS[index % COLORS.length];

      if (chartType === 'scatter') {
        const scatterData = frequencies.map((freq, i) => ({
          x: i + 1,
          y: freq
        }));
        datasets.push({
          label: `${data.metadata?.title || textId} (observed)`,
          data: scatterData,
          backgroundColor: color.border,
          borderColor: color.border,
          showLine: false,
          pointRadius: 3
        });
      } else {
        datasets.push({
          label: `${data.metadata?.title || textId} (observed)`,
          data: frequencies,
          borderColor: color.border,
          backgroundColor: color.background,
          tension: 0.1,
          pointRadius: chartType === 'linear' ? 2 : 0
        });
      }

      // Add ideal Zipf curve for single text or first text
      if (showIdeal && (selectedTexts.length === 1 || index === 0)) {
        const maxFreq = frequencies[0];
        const idealFreqs = frequencies.map((_, i) => maxFreq / (i + 1));
        
        datasets.push({
          label: 'Ideal Zipf (1/rank)',
          data: chartType === 'scatter' 
            ? idealFreqs.map((freq, i) => ({ x: i + 1, y: freq }))
            : idealFreqs,
          borderColor: 'rgba(255, 0, 0, 0.5)',
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.1
        });
      }
    });

    const maxLength = Math.max(
      ...selectedTexts.map(id => 
        textData[id] ? Object.keys(textData[id].frequencies).length : 0
      )
    );

    setChartData({
      labels: Array.from({ length: maxLength }, (_, i) => i + 1),
      datasets
    });

    // Update table data
    if (selectedTexts.length > 0) {
      const firstText = textData[selectedTexts[0]];
      if (firstText) {
        const entries = Object.entries(firstText.frequencies).slice(0, 50);
        setTableData(entries.map(([word, freq], i) => ({
          rank: i + 1,
          word,
          frequency: freq,
          ideal: Math.round(firstText.total_words / (12.5 * (i + 1)))
        })));
      }
    }
  }, [textData, selectedTexts, chartType, showIdeal]);

  const handleTextToggle = (textId) => {
    setSelectedTexts(prev => 
      prev.includes(textId)
        ? prev.filter(id => id !== textId)
        : [...prev, textId]
    );
  };

  const getChartOptions = () => {
    const isLogLog = chartType === 'loglog';
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: "Zipf's Law: Word Frequency vs. Rank",
          font: { size: 18 }
        },
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            title: (items) => `Rank: ${items[0].label}`,
            label: (item) => {
              const freq = item.raw.y !== undefined ? item.raw.y : item.raw;
              return `${item.dataset.label}: ${freq.toLocaleString()}`;
            }
          }
        },
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'xy'
          },
          pan: {
            enabled: true,
            mode: 'xy'
          }
        }
      }
    };

    if (chartType === 'scatter') {
      return {
        ...baseOptions,
        scales: {
          x: {
            type: isLogLog ? 'logarithmic' : 'linear',
            title: { display: true, text: 'Rank' },
            min: 1
          },
          y: {
            type: isLogLog ? 'logarithmic' : 'linear',
            title: { display: true, text: 'Frequency' },
            min: 1
          }
        }
      };
    }

    return {
      ...baseOptions,
      scales: {
        x: {
          type: isLogLog ? 'logarithmic' : 'linear',
          title: { display: true, text: 'Rank' },
          min: 1
        },
        y: {
          type: 'logarithmic',
          title: { display: true, text: 'Frequency' }
        }
      }
    };
  };

  const exportChart = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'zipf-visualization.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Zipf's Law Visualization</h1>
        <p className="subtitle">
          Word frequency follows an inverse relationship with rank: <strong>f(r) ≈ C/r</strong>
        </p>
      </header>

      <div className="controls-container">
        <div className="control-group">
          <h3>Select Texts to Compare</h3>
          <div className="text-selector">
            {texts.map(text => (
              <label key={text.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedTexts.includes(text.id)}
                  onChange={() => handleTextToggle(text.id)}
                />
                <span>{text.title}</span>
                <small>({text.author}, {text.year})</small>
              </label>
            ))}
          </div>
        </div>

        <div className="control-group">
          <h3>Chart Options</h3>
          <div className="chart-controls">
            <select 
              value={chartType} 
              onChange={(e) => setChartType(e.target.value)}
              className="select-input"
            >
              <option value="loglog">Log-Log Scale (Recommended)</option>
              <option value="linear">Linear Scale</option>
              <option value="scatter">Scatter Plot</option>
            </select>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showIdeal}
                onChange={(e) => setShowIdeal(e.target.checked)}
              />
              <span>Show Ideal Zipf Curve</span>
            </label>
          </div>
        </div>

        <div className="control-group">
          <h3>View Mode</h3>
          <div className="view-toggle">
            <button 
              className={viewMode === 'chart' ? 'active' : ''}
              onClick={() => setViewMode('chart')}
            >
              Chart
            </button>
            <button 
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              Frequency Table
            </button>
            {selectedTexts.length > 1 && (
              <button 
                className={viewMode === 'compare' ? 'active' : ''}
                onClick={() => setViewMode('compare')}
              >
                Compare
              </button>
            )}
          </div>
          <button onClick={exportChart} className="export-btn">
            Export Chart as PNG
          </button>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {stats && !loading && (
        <div className="stats-container">
          {stats.comparison ? (
            <div className="comparison-stats">
              <h3>Text Comparison</h3>
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Text</th>
                    <th>Total Words</th>
                    <th>Unique Words</th>
                    <th>Zipf R²</th>
                    <th>Exponent</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.comparison.map((text, i) => (
                    <tr key={i}>
                      <td>{text.metadata?.title}</td>
                      <td>{text.total_words?.toLocaleString()}</td>
                      <td>{text.unique_words?.toLocaleString()}</td>
                      <td>{text.r_squared?.toFixed(4)}</td>
                      <td>{text.zipf_exponent?.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="single-stats">
              <h3>Statistics: {stats.metadata?.title}</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <label>Total Words:</label>
                  <value>{stats.total_words?.toLocaleString()}</value>
                </div>
                <div className="stat-item">
                  <label>Unique Words:</label>
                  <value>{stats.unique_words?.toLocaleString()}</value>
                </div>
                <div className="stat-item">
                  <label>Vocabulary Richness:</label>
                  <value>{((stats.unique_words / stats.total_words) * 100).toFixed(2)}%</value>
                </div>
                <div className="stat-item">
                  <label>Most Frequent Word:</label>
                  <value>"{stats.max_frequency?.toLocaleString()}" occurrences</value>
                </div>
                <div className="stat-item highlight">
                  <label>Zipf R² Fit:</label>
                  <value>{stats.r_squared?.toFixed(4)}</value>
                </div>
                <div className="stat-item">
                  <label>Zipf Exponent:</label>
                  <value>{stats.zipf_exponent?.toFixed(3)} (ideal: 1.0)</value>
                </div>
              </div>
              <p className="zipf-explanation">
                R² close to 1.0 indicates the text closely follows Zipf's Law.
                The exponent measures how steeply frequency drops with rank.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="content-container">
        {viewMode === 'chart' && chartData && (
          <div className="chart-container">
            {chartType === 'scatter' ? (
              <Scatter data={chartData} options={getChartOptions()} />
            ) : (
              <Line data={chartData} options={getChartOptions()} />
            )}
          </div>
        )}

        {viewMode === 'table' && (
          <div className="table-container">
            <h3>Top 50 Words by Frequency</h3>
            <table className="frequency-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Word</th>
                  <th>Frequency</th>
                  <th>Ideal (Zipf)</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row) => (
                  <tr key={row.rank}>
                    <td>{row.rank}</td>
                    <td>{row.word}</td>
                    <td>{row.frequency.toLocaleString()}</td>
                    <td>{row.ideal.toLocaleString()}</td>
                    <td className={row.frequency > row.ideal ? 'positive' : 'negative'}>
                      {((row.frequency - row.ideal) / row.ideal * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'compare' && stats?.comparison && (
          <div className="comparison-chart">
            <h3>Side-by-Side Comparison</h3>
            {stats.comparison.map((text, i) => (
              <div key={i} className="comparison-item">
                <h4>{text.metadata?.title}</h4>
                <div className="mini-chart">
                  {/* Simplified bar chart for comparison */}
                  <div className="zipf-bar">
                    <div 
                      className="zipf-fill" 
                      style={{ width: `${text.r_squared * 100}%` }}
                    />
                    <span>R² = {text.r_squared?.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="app-footer">
        <p>
          <strong>Zipf's Law:</strong> The frequency of any word is inversely proportional 
          to its rank in the frequency table. This empirical law holds across languages 
          and text types, revealing a fundamental pattern in human language.
        </p>
      </footer>
    </div>
  );
}

export default App;
