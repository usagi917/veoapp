import '@testing-library/jest-dom';

// Polyfills for tests
if (!('createObjectURL' in URL)) {
  // @ts-ignore
  URL.createObjectURL = () => 'blob:test-url';
}

// Provide a basic TextEncoder/Decoder in case environment lacks it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).TextEncoder ||= require('util').TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).TextDecoder ||= require('util').TextDecoder;

