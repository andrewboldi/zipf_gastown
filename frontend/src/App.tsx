import React, { useState, useEffect, useCallback } from 'react';
import { TextSelector } from './components/TextSelector';
import { ZipfChart } from './components/ZipfChart';
import { WordTable } from './components/WordTable';
import { StatisticsPanel } from './components/StatisticsPanel';
import { fetchTexts, fetchMultipleZipfData } from './api';
import { TextInfo, ZipfData } from './types';
import './App.css';

function App() {
  const [texts, setTexts] = useState<TextInfo[]>([]);
  const [selectedTextIds, setSelectedTextIds] = useState<string[]>([]);
  const [zipfData, setZipfData] = useState<ZipfData[]>([]);
  const [textsLoading, setTextsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadTexts() {
      try {
        setTextsLoading(true);
        setError(null);
        const data = await fetchTexts();
        setTexts(data);
      } catch (err) {
        setError('Failed to load texts. Make sure the backend is running on port 8000.');
        console.error('Error loading texts:', err);
      } finally {
        setTextsLoading(false);
      }
    }
    loadTexts();
  }, []);

  const handleSelectionChange = useCallback(async (ids: string[]) => {
    setSelectedTextIds(ids);

    if (ids.length === 0) {
      setZipfData([]);
      return;
    }

    try {
      setDataLoading(true);
      setError(null);
      const data = await fetchMultipleZipfData(ids);
      setZipfData(data);
    } catch (err) {
      setError('Failed to load Zipf data for selected texts.');
      console.error('Error loading Zipf data:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Zipf's Law Visualization</h1>
        <p className="subtitle">
          Explore how word frequency follows a power law distribution
        </p>
      </header>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <main className="app-main">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <TextSelector
            texts={texts}
            selectedIds={selectedTextIds}
            onSelectionChange={handleSelectionChange}
            loading={textsLoading}
          />

          <StatisticsPanel
            data={zipfData}
            loading={dataLoading}
          />

          <div className="info-panel">
            <h4>About Zipf's Law</h4>
            <p>
              Zipf's law states that the frequency of a word is inversely
              proportional to its rank. The most frequent word occurs approximately
              twice as often as the second most frequent word, three times as often
              as the third, and so on.
            </p>
            <p className="formula">
              f(r) = C / r<sup>α</sup>
            </p>
            <p>
              where α ≈ 1 for natural language.
            </p>
          </div>
        </aside>

        <section className="content">
          <button
            className="mobile-menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? '× Close' : '☰ Menu'}
          </button>

          <ZipfChart
            data={zipfData}
            loading={dataLoading}
          />

          <WordTable
            data={zipfData}
            loading={dataLoading}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Zipf's Law Visualization | Using data from Project Gutenberg
        </p>
      </footer>
    </div>
  );
}

export default App;
