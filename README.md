# Zipf's Law Visualization System

A full-stack application demonstrating Zipf's law using large text corpora.

## Architecture

### Backend (Python/FastAPI)
- **Data Acquisition**: Downloads texts from Project Gutenberg, Wikipedia
- **Text Processing**: Tokenization, punctuation removal, normalization
- **Frequency Analysis**: Word counting, rank calculation, Zipf curve fitting
- **API**: REST endpoints for frontend

### Frontend (React/TypeScript)
- **Text Selector**: Choose from available corpora
- **Visualization**: Interactive Zipf curve with zoom/pan
- **Comparison**: Compare multiple texts side-by-side
- **Statistics**: Raw data tables and metrics

### Data
- `data/raw/`: Original downloaded texts
- `data/processed/`: Computed frequency data (JSON)

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m app.main

# Frontend
cd frontend
npm install
npm start
```

## Zipf's Law

The frequency of any word is inversely proportional to its rank in the frequency table:

```
f(r) ≈ C / r^s
```

Where:
- `f(r)` = frequency of word at rank `r`
- `C` = constant (approximates total word count / harmonic number)
- `s` ≈ 1 (the exponent, ideally close to 1)
