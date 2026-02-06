# Zipf's Law Visualization - Frontend

React-based frontend for visualizing Zipf's law in text corpora.

## Features

- **Text Selector**: Multi-select interface for comparing multiple texts
  - Search/filter by title or author
  - Sort by title, author, or word count
  - Select all/deselect all functionality
  - Selection summary

- **Interactive Zipf Chart**: Log-log scatter plot visualization
  - Multiple text comparison with color-coded series
  - Drag-to-zoom functionality
  - Reference line showing ideal Zipf slope (-1)
  - Custom tooltips showing word details
  - Responsive design

- **Statistics Panel**: Real-time statistics
  - Aggregated statistics for selected texts
  - Individual text metrics (word count, unique words, Zipf exponent, R²)
  - Average Zipf exponent and R²

- **Word Table**: Detailed frequency data
  - Top N words by frequency
  - View by individual text or combined
  - Expected vs actual frequency with deviation percentage
  - Sortable by rank or frequency

## Prerequisites

- Node.js 16+ and npm
- Backend API running at `http://localhost:8000` (or configure via `REACT_APP_API_URL`)

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure if needed:

```bash
cp .env.example .env
```

Default API URL is `http://localhost:8000`.

## Development

```bash
npm start
```

The app will open at `http://localhost:3000`.

## Production Build

```bash
npm run build
```

Optimized files will be in the `build/` directory.

## Testing

```bash
npm test
```

## Tech Stack

- React 18 with TypeScript
- Recharts for data visualization
- CSS-in-JS styling
- Responsive design

## Component Structure

```
src/
├── components/
│   ├── TextSelector.tsx       # Multi-select text list with search/sort
│   ├── ZipfChart.tsx          # Interactive scatter plot with zoom
│   ├── WordTable.tsx          # Frequency data table
│   └── StatisticsPanel.tsx    # Aggregated and individual stats
├── api/
│   └── index.ts               # API client functions
├── types/
│   └── index.ts               # TypeScript interfaces
├── App.tsx                    # Main application
├── App.css                    # Styles
└── index.tsx                  # Entry point
```

## API Integration

The frontend communicates with the backend via REST API:

- `GET /api/texts` - List all available texts
- `GET /api/texts/{id}/zipf` - Get Zipf data for a specific text

## Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge) with ES2020 support.
