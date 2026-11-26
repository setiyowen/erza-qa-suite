/**
 * k6 Load Test - Concurrent Article Generation
 * Simulates 10-50 VUs creating articles simultaneously
 * Run: k6 run k6/load.js --env SESSION=<session_cookie>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = 'https://dev.erza.ai';

const errorRate = new Rate('errors');
const generateDuration = new Trend('generate_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up to 10 VUs
    { duration: '1m', target: 20 },   // hold 20 VUs
    { duration: '30s', target: 50 },  // spike to 50
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<15000'], // 15s p95
    http_req_failed: ['rate<0.3'],      // allow 30% failure (dev env)
    errors: ['rate<0.5'],
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

const topics = [
  'Tips olahraga pagi untuk pemula',
  'Resep masakan sehat rendah kalori',
  'Cara meningkatkan produktivitas kerja',
  'Panduan investasi untuk mahasiswa',
  'Manfaat tidur yang cukup untuk kesehatan',
  'Teknik meditasi untuk mengurangi stres',
  'Cara belajar bahasa asing dengan efektif',
  'Tips perjalanan hemat ke Asia Tenggara',
  'Panduan lengkap membuat website sendiri',
  'Strategi pemasaran digital untuk UMKM',
];

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Cookie: `better-auth.session_token=${data.sessionCookie}`,
  };

  const topic = topics[Math.floor(Math.random() * topics.length)];
  const start = Date.now();

  const res = http.post(
    `${BASE}/api/article/generate`,
    JSON.stringify({ topic }),
    { headers, timeout: '30s' }
  );

  const dur = Date.now() - start;
  generateDuration.add(dur);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'has content': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (body.content || body.result || body.generationId);
      } catch {
        return false;
      }
    },
    'under 15s': () => dur < 15000,
  });

  if (!ok) errorRate.add(1);
  else errorRate.add(0);

  sleep(Math.random() * 2 + 1); // 1-3s between requests
}
