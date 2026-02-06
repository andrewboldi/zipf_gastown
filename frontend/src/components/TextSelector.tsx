import React, { useState, useMemo } from 'react';
import { TextInfo } from '../types';

interface TextSelectorProps {
  texts: TextInfo[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading: boolean;
}

export function TextSelector({ texts, selectedIds, onSelectionChange, loading }: TextSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'wordCount'>('title');

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const filteredTexts = filteredAndSortedTexts.map(t => t.id);
    if (filteredTexts.every(id => selectedIds.includes(id))) {
      onSelectionChange(selectedIds.filter(i => !filteredTexts.includes(i)));
    } else {
      const newIds = [...new Set([...selectedIds, ...filteredTexts])];
      onSelectionChange(newIds);
    }
  };

  const filteredAndSortedTexts = useMemo(() => {
    let result = [...texts];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        text =>
          text.title.toLowerCase().includes(query) ||
          (text.author && text.author.toLowerCase().includes(query))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          const authorA = a.author || '';
          const authorB = b.author || '';
          return authorA.localeCompare(authorB);
        case 'wordCount':
          return b.wordCount - a.wordCount;
        default:
          return 0;
      }
    });

    return result;
  }, [texts, searchQuery, sortBy]);

  const allVisibleSelected = filteredAndSortedTexts.length > 0 &&
    filteredAndSortedTexts.every(text => selectedIds.includes(text.id));

  if (loading) {
    return <div className="text-selector loading">Loading texts...</div>;
  }

  return (
    <div className="text-selector">
      <div className="selector-header">
        <h3>Select Texts to Compare</h3>
        <button
          className="select-all-btn"
          onClick={handleSelectAll}
        >
          {allVisibleSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="search-controls">
        <input
          type="text"
          placeholder="Search by title or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'title' | 'author' | 'wordCount')}
          className="sort-select"
        >
          <option value="title">Sort by Title</option>
          <option value="author">Sort by Author</option>
          <option value="wordCount">Sort by Word Count</option>
        </select>
      </div>
      <div className="text-list">
        {filteredAndSortedTexts.map(text => (
          <label key={text.id} className={`text-item ${selectedIds.includes(text.id) ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={selectedIds.includes(text.id)}
              onChange={() => handleToggle(text.id)}
            />
            <div className="text-info">
              <span className="text-title">{text.title}</span>
              {text.author && <span className="text-author">by {text.author}</span>}
              <span className="text-stats">
                {text.wordCount.toLocaleString()} words | {text.uniqueWords.toLocaleString()} unique
              </span>
            </div>
          </label>
        ))}
      </div>
      {filteredAndSortedTexts.length === 0 && texts.length > 0 && (
        <p className="no-texts">No texts match your search.</p>
      )}
      {texts.length === 0 && (
        <p className="no-texts">No texts available. Make sure the backend is running.</p>
      )}
      <div className="selection-summary">
        {selectedIds.length} of {texts.length} texts selected
      </div>
    </div>
  );
}
