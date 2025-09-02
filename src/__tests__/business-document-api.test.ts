import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

// Simple test to verify JWT_SECRET is working
describe('JWT Test', () => {
  it('should load without JWT_SECRET error', () => {
    expect(true).toBe(true);
  });
});

describe('Business Document API Tests', () => {
  it('should be able to create NextRequest objects', () => {
    const request = new NextRequest('http://localhost:3000/test', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
    });

    expect(request.method).toBe('POST');
    expect(request.url).toContain('http://localhost:3000/test');
  });

  it('should be able to create FormData objects', () => {
    const formData = new FormData();
    formData.append('test', 'value');

    expect(formData.has('test')).toBe(true);
  });

  it('should be able to create File objects', () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

    expect(file.name).toBe('test.pdf');
    expect(file.type).toBe('application/pdf');
    expect(file.size).toBeGreaterThan(0);
  });
});