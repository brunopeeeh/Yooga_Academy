import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom não implementa scroll; o shell chama window.scrollTo a cada navegação.
Object.defineProperty(window, 'scrollTo', {
  value: () => {},
  writable: true,
});

afterEach(() => {
  cleanup();
});
