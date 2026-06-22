import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 100,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'], // Error rate should be less than 5%
    http_req_duration: ['p(95)<3000'], // 95% of requests should complete within 3 seconds
  },
};

export default function () {
  // Use the BASE_URL environment variable, defaulting to the GitHub Pages deployment
  const url = __ENV.BASE_URL || 'https://pramithm.github.io/TrackBack-Web-PDD/';
  const res = http.get(url);

  check(res, {
    'is status 200': (r) => r.status === 200,
    'body size is valid': (r) => r.body.length > 100,
  });

  sleep(1);
}
