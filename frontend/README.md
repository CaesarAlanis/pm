# Kanban Studio

## Run

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test:unit
```

For end-to-end tests, start the backend Docker container first so the app is
available at `http://localhost:8000`:

```bash
../scripts/start-mac.sh
```

Then run:

```bash
npm run test:e2e
```
