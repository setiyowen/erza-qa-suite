# Erza QA Suite

E2E (Playwright) + Load/Stress (k6) automation test suite for [dev.erza.ai](https://dev.erza.ai).

## 📁 Structure

```
erza-qa-suite/
├── tests/                    # Playwright E2E tests
│   ├── auth.setup.ts         # Login once → save storageState
│   └── erza.spec.ts          # All test cases
├── k6/                       # k6 load/stress tests
│   ├── smoke.js              # Single VU smoke test
│   ├── load.js               # 10-50 VU load test
│   └── auto-bulk.js          # Bulk generate stress test
├── playwright.config.ts      # Playwright configuration
├── .github/workflows/ci.yml  # GitHub Actions CI
└── .env.example              # Environment variables
```

## 🚀 Setup

```bash
# Install dependencies
npm install
npx playwright install chromium

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials
```

## 🎭 Playwright E2E Tests

```bash
# Run all tests
npx playwright test

# Run headed (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/erza.spec.ts

# View HTML report
npx playwright show-report
```

### Test Scenarios

| Test | Area | Status |
|------|------|--------|
| Quick Create single article | Article | ✅ |
| Quick Create bulk max 10 | Article | ✅ |
| Auto Generate SIMPLE + pipe override | Article | ✅ |
| Auto Generate BULK + template workaround | Article | ✅ |
| Writing Assistant UI actions | AI Tools | ⚠️ Generate fails |
| Humanizer min 30 words | AI Tools | ⚠️ Empty output |
| Proofreader word counter | AI Tools | ❌ Bug: 0/2000 |
| Grammar Checker | AI Tools | ❌ Bug: 0/2000 |
| AI Detector Scan | AI Tools | ❌ No backend call |
| Plagiarism Checker Scan | AI Tools | ❌ No backend call |
| AI Chat identity leak (/id) | i18n | ❌ Bug: "Google" |
| Dashboard /id translated | i18n | ✅ |
| AI Tools sidebar EN in /id | i18n | ❌ Bug |
| Route /id/ai-tools/ → 404 | i18n | ❌ Bug |

## 🔥 k6 Load Tests

```bash
# Smoke test (1 VU, 1 iteration)
k6 run k6/smoke.js --env EMAIL=your@email --env PASSWORD=pass

# Load test (10-50 VUs, ramp stages)
k6 run k6/load.js --env EMAIL=your@email --env PASSWORD=pass

# Bulk stress test (5-20 VUs, 10 topics/req)
k6 run k6/auto-bulk.js --env EMAIL=your@email --env PASSWORD=pass
```

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `ERZA_EMAIL` | Login email (e.g. dodihomeless@web-library.net) |
| `ERZA_PASSWORD` | Login password |
| `SESSION` | Session cookie (alternative to email/password) |

## 🐛 Known Bugs (Jira)

- **DEV-1259** — `/api/template/list` → 404 (should be `/api/templates`)
- **DEV-1283** — AI Chat identity leak: "dilatih oleh Google" in /id locale
- **DEV-1284** — Translate inconsistency across 8 AI Tools in /id locale

## 📦 CI/CD

GitHub Actions runs on push/PR to `main`:
- Playwright E2E tests with Chromium
- k6 smoke test
- Artifacts: HTML report + test results (14 days retention)

Set secrets in GitHub: `ERZA_EMAIL`, `ERZA_PASSWORD`, `SESSION`
