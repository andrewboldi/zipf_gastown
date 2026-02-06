import React from 'react';
import { TextInfo } from '../types';

interface TextSelectorProps {
  texts: TextInfo[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading: boolean;
}

export function TextSelector({ texts, selectedIds, onSelectionChange, loading }: TextSelectorProps) {
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === texts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(texts.map(t => t.id));
    }
  };

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
          {selectedIds.length === texts.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="text-list">
        {texts.map(text => (
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
      {texts.length === 0 && (
        <p className="no-texts">No texts available. Make sure the backend is running.</p>
      )}
    </div>
  );
}
