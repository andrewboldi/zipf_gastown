import React, { useState, useMemo } from 'react';
import { ZipfData } from '../types';

interface WordTableProps {
  data: ZipfData[];
  loading: boolean;
}

export function WordTable({ data, loading }: WordTableProps) {
  const [topN, setTopN] = useState(25);
  const [sortBy, setSortBy] = useState<'rank' | 'frequency'>('rank');
  const [selectedTextId, setSelectedTextId] = useState<string | 'all'>('all');

  const tableData = useMemo(() => {
    if (data.length === 0) return [];

    if (selectedTextId === 'all') {
      const wordMap = new Map<string, { frequency: number; texts: string[] }>();

      data.forEach(zipfData => {
        zipfData.words.forEach(w => {
          const existing = wordMap.get(w.word);
          if (existing) {
            existing.frequency += w.frequency;
            existing.texts.push(zipfData.title);
          } else {
            wordMap.set(w.word, { frequency: w.frequency, texts: [zipfData.title] });
          }
        });
      });

      const combined = Array.from(wordMap.entries())
        .map(([word, data]) => ({
          word,
          frequency: data.frequency,
          texts: data.texts,
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      return combined.slice(0, topN);
    } else {
      const textData = data.find(d => d.textId === selectedTextId);
      if (!textData) return [];

      const sorted = [...textData.words].sort((a, b) =>
        sortBy === 'rank' ? a.rank - b.rank : b.frequency - a.frequency
      );

      return sorted.slice(0, topN).map(w => ({
        word: w.word,
        frequency: w.frequency,
        rank: w.rank,
        texts: [textData.title],
      }));
    }
  }, [data, topN, sortBy, selectedTextId]);

  if (loading) {
    return <div className="word-table loading">Loading word data...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="word-table empty">
        <p>Select texts to see word frequency data</p>
      </div>
    );
  }

  return (
    <div className="word-table">
      <div className="table-header">
        <h3>Top {topN} Words by Frequency</h3>
        <div className="table-controls">
          <label>
            Show top:
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>

          <label>
            Text:
            <select
              value={selectedTextId}
              onChange={(e) => setSelectedTextId(e.target.value)}
            >
              <option value="all">All Combined</option>
              {data.map(d => (
                <option key={d.textId} value={d.textId}>
                  {d.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sort by:
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rank' | 'frequency')}
            >
              <option value="rank">Rank</option>
              <option value="frequency">Frequency</option>
            </select>
          </label>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Word</th>
              <th>Frequency</th>
              <th>Expected (Zipf)</th>
              {selectedTextId === 'all' && <th>Appears In</th>}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => {
              const maxFreq = tableData[0]?.frequency || 1;
              const expectedFreq = maxFreq / row.rank;
              const deviation = ((row.frequency - expectedFreq) / expectedFreq * 100).toFixed(1);

              return (
                <tr key={`${row.word}-${row.rank}`}>
                  <td className="rank-cell">{row.rank}</td>
                  <td className="word-cell">{row.word}</td>
                  <td className="freq-cell">{row.frequency.toLocaleString()}</td>
                  <td className="expected-cell">
                    {Math.round(expectedFreq).toLocaleString()}
                    <span className={`deviation ${Number(deviation) > 0 ? 'positive' : 'negative'}`}>
                      ({deviation}%)
                    </span>
                  </td>
                  {selectedTextId === 'all' && (
                    <td className="texts-cell">{row.texts.length} text(s)</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
