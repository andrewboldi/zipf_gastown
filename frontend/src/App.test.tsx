import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Zipf Law Visualization header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Zipf's Law Visualization/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders text selector component', () => {
  render(<App />);
  const selectorElement = screen.getByText(/Select Texts to Compare/i);
  expect(selectorElement).toBeInTheDocument();
});
