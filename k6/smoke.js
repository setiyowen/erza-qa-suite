/**
 * k6 Smoke Test - Single Quick Create & Auto Generate
 * Run: k6 run k6/smoke.js --env SESSION=<session_cookie>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = 'https://dev.erza.ai';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 10s max
    http_req_failed: ['rate<0.1'],
  },
};

export function setup() {
  // Login via Better Auth API
  const loginRes = http.post(
    `${BASE}/api/auth/sign-in/email`,
    JSON.stringify({
      email: __ENV.EMAIL || 'dodihomeless@web-library.net',
      password: __ENV.PASSWORD || '',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, { 'login 200': (r) => r.status === 200 });

  // Extract session cookie
  const cookies = loginRes.headers['Set-Cookie'] || '';
  const session = cookies.match(/better-auth\.session_token=([^;]+)/);
  return { sessionCookie: session ? session[1] : __ENV.SESSION || '' };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Cookie: `better-auth.session_token=${data.sessionCookie}`,
  };

  // Test 1: Quick Create API
  console.log('--- Quick Create Single ---');
  const qcRes = http.post(
    `${BASE}/api/article/generate`,
    JSON.stringify({
      topic: 'Tips olahraga pagi',
      template: null,
    }),
    { headers, timeout: '30s' }
  );
  check(qcRes, {
    'quick-create status 200': (r) => r.status === 200,
    'quick-create has content': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (body.content || body.result || body.generationId);
      } catch {
        return false;
      }
    },
  });

  sleep(2);

  // Test 2: Template list API (known bug: /api/template/list → 404)
  console.log('--- Template List (known bug) ---');
  const tplRes = http.get(`${BASE}/api/template/list?limit=999&source=article-editor`, {
    headers,
  });
  check(tplRes, {
    'template/list → 404 (known bug DEV-1259)': (r) => r.status === 404,
  });

  // Correct endpoint
  const tplRes2 = http.get(`${BASE}/api/templates`, { headers });
  check(tplRes2, {
    'templates → 200 (correct endpoint)': (r) => r.status === 200,
  });

  sleep(2);

  // Test 3: Auto Generate API
  console.log('--- Auto Generate Single ---');
  const agRes = http.post(
    `${BASE}/api/auto-generate`,
    JSON.stringify({
      topic: 'Cara makan sehat',
      site: '', // default WordPress Site
      status: 'draft',
      schedule: 'now',
    }),
    { headers, timeout: '30s' }
  );
  check(agRes, {
    'auto-generate status 200': (r) => r.status === 200,
    'auto-generate has generationId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.generationId;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
