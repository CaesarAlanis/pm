import "@testing-library/jest-dom";

Element.prototype.scrollIntoView = () => {};

// Mock crypto.randomUUID for tests
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      ...globalThis.crypto,
      randomUUID: () => Math.random().toString(36).slice(2, 10),
    },
  });
}
