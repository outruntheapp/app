# Running tests

## Quick start

From the **outrun_poc** directory:

```bash
cd outrun_poc
npm test
```

Runs all tests once and exits.

## What runs

- **Test runner:** Jest (see `jest.config.js`).
- **Tests:** Any file under `__tests__/` matching `*.test.js`.
- **Current suite:** `__tests__/polyline.test.js` – unit tests for `@googlemaps/polyline-codec` (encode/decode and round-trip).

No API keys or environment variables are required for the current tests.

## Other useful commands

- **Watch mode** (re-run on file changes):
  ```bash
  npm test -- --watch
  ```
- **Single run with coverage:**
  ```bash
  npm test -- --coverage
  ```

## Notes

- Jest uses `jsdom` and `jest.setup.js` (which loads `@testing-library/jest-dom`).
- Tests are matched by `**/__tests__/**/*.test.js`; add new test files under `__tests__/` with a `.test.js` suffix.
