import '@testing-library/jest-dom';
import { beforeAll, vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock environment variables
beforeAll(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

  // Mock database environment variables
  vi.stubEnv('DB_HOST', 'localhost');
  vi.stubEnv('DB_USER', 'test');
  vi.stubEnv('DB_PASSWORD', 'test');
  vi.stubEnv('DB_NAME', 'test_db');
  vi.stubEnv('DB_PORT', '3306');

  // Mock JWT secret
  vi.stubEnv('JWT_SECRET', 'test-jwt-secret-for-testing');

  // Mock email settings
  vi.stubEnv('SMTP_USER', 'test@example.com');
  vi.stubEnv('SMTP_PASS', 'test-password');
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock File API
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  #data: Uint8Array;

  constructor(bits: any[], filename: string, options: any = {}) {
    this.name = filename;
    this.type = options.type || '';
    this.lastModified = Date.now();

    const enc = new TextEncoder();
    const chunks = (bits || []).map((b) => {
      if (typeof b === 'string') {
        return enc.encode(b);
      }
      if (b instanceof ArrayBuffer) {
        return new Uint8Array(b);
      }
      if (ArrayBuffer.isView(b)) {
        return new Uint8Array(b.buffer);
      }
      return new Uint8Array(0);
    });

    const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    this.#data = new Uint8Array(total);

    let offset = 0;
    for (const chunk of chunks) {
      this.#data.set(chunk, offset);
      offset += chunk.byteLength;
    }

    this.size = this.#data.byteLength;
  }

  arrayBuffer() {
    // Return a copy of the underlying buffer
    return Promise.resolve(this.#data.buffer.slice(0));
  }

  text() {
    // Decode the bytes as UTF-8 text
    return Promise.resolve(new TextDecoder().decode(this.#data));
  }
} as any;
// Mock FormData
global.FormData = class MockFormData {
  private data: Map<string, any[]> = new Map();

  append(key: string, value: any) {
    const arr = this.data.get(key) ?? [];
    arr.push(value);
    this.data.set(key, arr);
  }

  get(key: string) {
    const arr = this.data.get(key);
    return arr && arr.length ? arr[0] : null;
  }

  getAll(key: string) {
    return [...(this.data.get(key) ?? [])];
  }

  has(key: string) {
    return this.data.has(key);
  }

  delete(key: string) {
    this.data.delete(key);
  }

  forEach(callback: (value: any, key: string, form: any) => void) {
    this.data.forEach((values, key) => {
      values.forEach((v) => callback(v, key, this));
    });
  }
} as any;
// Mock URL constructor
global.URL = class MockURL {
  constructor(url: string) {
    this.href = url;
    this.pathname = url.split('?')[0];
    this.search = url.includes('?') ? '?' + url.split('?')[1] : '';
    this.hostname = 'localhost';
    this.protocol = 'http:';
    this.port = '3000';
  }
  href: string;
  pathname: string;
  search: string;
  hostname: string;
  protocol: string;
  port: string;
} as any;
