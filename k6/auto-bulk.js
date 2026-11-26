/**
 * k6 Auto Generate Bulk Test
 * Stress: 10 topics per request, concurrent 5-20 VUs
 * Run: k6 run k6/auto-bulk.js --env SESSION=<session_cookie>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE = 'https://dev.erza.ai';
const bulkDuration = new Trend('bulk_generate_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<30000'], // 30s for bulk
    http_req_failed: ['rate<0.5'],
  },
};

export function setup() {
  const loginRes = http.post(
    `${BASE}/api/auth/sign-in/email`,
    JSON.stringify({
      email: __ENV.EMAIL || 'dodihomeless@web-library.net',
      password: __ENV.PASSWORD || '',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, { 'login 200': (r) => r.status === 200 });

  const cookies = loginRes.headers['Set-Cookie'] || '';
  const session = cookies.match(/better-auth\.session_token=([^;]+)/);
  return { sessionCookie: session ? session[1] : __ENV.SESSION || '' };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Cookie: `better-auth.session_token=${data.sessionCookie}`,
  };

  // Build 10 topics (max bulk)
  const topics = [];
  for (let i = 1; i <= 10; i++) {
    topics.push(`Topik olahraga sehat bagian ${i} - VU ${__VU}`);
  }

  const start = Date.now();
  const res = http.post(
    `${BASE}/api/auto-generate/bulk`,
    JSON.stringify({
      topics,
      site: '', // default WP site
      status: 'draft',
      schedule: 'later',
      minutes: 11,
    }),
    { headers, timeout: '45s' }
  );
  const dur = Date.now() - start;
  bulkDuration.add(dur);

  check(res, {
    'bulk status 200': (r) => r.status === 200,
    'bulk has generationId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (body.generationId || body.result);
      } catch {
        return false;
      }
    },
    'bulk under 30s': () => dur < 30000,
  });

  sleep(3); // cooldown between bulk requests
}
