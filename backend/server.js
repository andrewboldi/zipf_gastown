const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Text metadata
const TEXTS_METADATA = {
  'shakespeare': {
    title: 'The Complete Works of William Shakespeare',
    author: 'William Shakespeare',
    year: '1623',
    language: 'English',
    source: 'Project Gutenberg'
  },
  'moby_dick': {
    title: 'Moby Dick',
    author: 'Herman Melville',
    year: '1851',
    language: 'English',
    source: 'Project Gutenberg'
  },
  'pride_and_prejudice': {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: '1813',
    language: 'English',
    source: 'Project Gutenberg'
  },
  'alice_wonderland': {
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    year: '1865',
    language: 'English',
    source: 'Project Gutenberg'
  }
};

// Helper to load text data
function loadTextData(textId) {
  const filePath = path.join(__dirname, 'data', `${textId}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  // Fallback to old format in root directory
  const oldPath = path.join(__dirname, `${textId === 'shakespeare' ? 'word_frequencies' : textId}.json`);
  if (fs.existsSync(oldPath)) {
    const freqs = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
    return {
      total_words: Object.values(freqs).reduce((a, b) => a + b, 0),
      unique_words: Object.keys(freqs).length,
      frequencies: freqs
    };
  }
  return null;
}

// Calculate Zipf statistics
function calculateZipfStats(data) {
  const freqs = data.frequencies || data;
  const frequencies = Object.values(freqs);
  const totalWords = data.total_words || frequencies.reduce((a, b) => a + b, 0);
  
  // Calculate rank-frequency pairs
  const sortedFreqs = frequencies.sort((a, b) => b - a);
  const ranks = sortedFreqs.map((_, i) => i + 1);
  
  // Calculate ideal Zipf distribution (C/rank where C is max frequency)
  const c = sortedFreqs[0];
  const idealZipf = ranks.map(rank => c / rank);
  
  // Calculate R-squared (coefficient of determination)
  const logFreqs = sortedFreqs.map(f => Math.log(f));
  const logRanks = ranks.map(r => Math.log(r));
  const logIdeal = idealZipf.map(f => Math.log(f));
  
  const meanLogFreq = logFreqs.reduce((a, b) => a + b, 0) / logFreqs.length;
  
  let ssTotal = 0;
  let ssResidual = 0;
  
  for (let i = 0; i < logFreqs.length; i++) {
    ssTotal += Math.pow(logFreqs[i] - meanLogFreq, 2);
    ssResidual += Math.pow(logFreqs[i] - logIdeal[i], 2);
  }
  
  const rSquared = 1 - (ssResidual / ssTotal);
  
  // Calculate Zipf constant (exponent from power law fit)
  // Using linear regression on log-log data
  const n = logFreqs.length;
  const sumLogRanks = logRanks.reduce((a, b) => a + b, 0);
  const sumLogFreqs = logFreqs.reduce((a, b) => a + b, 0);
  const sumLogRanksSq = logRanks.reduce((a, b) => a + b * b, 0);
  const sumLogRanksLogFreqs = logRanks.reduce((sum, logR, i) => sum + logR * logFreqs[i], 0);
  
  const slope = (n * sumLogRanksLogFreqs - sumLogRanks * sumLogFreqs) / 
                (n * sumLogRanksSq - sumLogRanks * sumLogRanks);
  const intercept = (sumLogFreqs - slope * sumLogRanks) / n;
  
  return {
    total_words: totalWords,
    unique_words: frequencies.length,
    max_frequency: sortedFreqs[0],
    r_squared: rSquared,
    zipf_exponent: -slope, // Should be close to 1 for ideal Zipf
    zipf_constant: Math.exp(intercept)
  };
}

// GET /api/texts - List all available texts
app.get('/api/texts', (req, res) => {
  const texts = Object.entries(TEXTS_METADATA).map(([id, meta]) => ({
    id,
    ...meta
  }));
  res.json(texts);
});

// GET /api/texts/:textId - Get metadata for a specific text
app.get('/api/texts/:textId', (req, res) => {
  const { textId } = req.params;
  const metadata = TEXTS_METADATA[textId];
  
  if (!metadata) {
    return res.status(404).json({ error: 'Text not found' });
  }
  
  const data = loadTextData(textId);
  if (!data) {
    return res.status(404).json({ error: 'Text data not found' });
  }
  
  const stats = calculateZipfStats(data);
  
  res.json({
    id: textId,
    ...metadata,
    ...stats
  });
});

// GET /api/word-frequencies/:textId - Get word frequencies for a text
app.get('/api/word-frequencies/:textId', (req, res) => {
  const { textId } = req.params;
  const limit = parseInt(req.query.limit) || 1000;
  
  const data = loadTextData(textId);
  if (!data) {
    return res.status(404).json({ error: 'Text not found' });
  }
  
  const freqs = data.frequencies || data;
  const entries = Object.entries(freqs).slice(0, limit);
  const limitedFreqs = Object.fromEntries(entries);
  
  res.json({
    id: textId,
    metadata: TEXTS_METADATA[textId],
    total_words: data.total_words,
    unique_words: data.unique_words || Object.keys(freqs).length,
    frequencies: limitedFreqs
  });
});

// GET /api/compare - Compare multiple texts
app.get('/api/compare', (req, res) => {
  const textIds = req.query.texts ? req.query.texts.split(',') : [];
  
  if (textIds.length === 0) {
    return res.status(400).json({ error: 'No texts specified. Use ?texts=id1,id2,id3' });
  }
  
  const results = textIds.map(textId => {
    const data = loadTextData(textId);
    if (!data) return null;
    
    const stats = calculateZipfStats(data);
    return {
      id: textId,
      metadata: TEXTS_METADATA[textId],
      ...stats
    };
  }).filter(Boolean);
  
  res.json(results);
});

// GET /api/zipf-stats/:textId - Get Zipf law statistics
app.get('/api/zipf-stats/:textId', (req, res) => {
  const { textId } = req.params;
  
  const data = loadTextData(textId);
  if (!data) {
    return res.status(404).json({ error: 'Text not found' });
  }
  
  const stats = calculateZipfStats(data);
  
  res.json({
    id: textId,
    metadata: TEXTS_METADATA[textId],
    ...stats
  });
});

// POST /api/analyze - Analyze custom text
app.post('/api/analyze', (req, res) => {
  const { text, name = 'Custom Text' } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }
  
  // Simple word frequency analysis
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w && !w.match(/^\d+$/));
  
  const frequencies = {};
  words.forEach(word => {
    frequencies[word] = (frequencies[word] || 0) + 1;
  });
  
  const sortedFreqs = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1]);
  
  const data = {
    total_words: words.length,
    unique_words: sortedFreqs.length,
    frequencies: Object.fromEntries(sortedFreqs.slice(0, 100))
  };
  
  const stats = calculateZipfStats(data);
  
  res.json({
    name,
    ...data,
    ...stats
  });
});

app.listen(port, () => {
  console.log(`🚀 Zipf Law Backend API listening at http://localhost:${port}`);
  console.log(`📚 Available endpoints:`);
  console.log(`   GET  /api/texts              - List all texts`);
  console.log(`   GET  /api/texts/:id          - Get text metadata`);
  console.log(`   GET  /api/word-frequencies/:id - Get word frequencies`);
  console.log(`   GET  /api/compare?texts=a,b  - Compare texts`);
  console.log(`   GET  /api/zipf-stats/:id     - Get Zipf statistics`);
  console.log(`   POST /api/analyze            - Analyze custom text`);
});
