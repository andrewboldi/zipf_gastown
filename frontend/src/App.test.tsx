import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Zipf Law Visualization header', () => {
  render(<App />);
  const headerElement = screen.getByRole('heading', { level: 1 });
  expect(headerElement).toHaveTextContent(/Zipf's Law Visualization/i);
});

test('renders loading state initially', () => {
  render(<App />);
  const loadingElement = screen.getByText(/Loading texts.../i);
  expect(loadingElement).toBeInTheDocument();
});

test('renders info panel about Zipf law', () => {
  render(<App />);
  const infoElement = screen.getByText(/About Zipf's Law/i);
  expect(infoElement).toBeInTheDocument();
});
