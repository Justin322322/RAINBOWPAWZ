import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Simple Test', () => {
  it('should work with jest-dom matchers', () => {
    render(<div>Hello World</div>);

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should handle disabled elements', () => {
    render(<button disabled>Click me</button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
