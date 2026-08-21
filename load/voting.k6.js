import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomUUID } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  scenarios: {
    peak_voting: {
      executor: 'constant-vus',
      vus: 200,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
};

const baseUrl = __ENV.VOTING_BASE_URL || 'http://127.0.0.1:3000';
const artistId = __ENV.VOTING_ARTIST_ID;

export default function votingLoadScenario() {
  if (!artistId) return;
  const response = http.post(
    `${baseUrl}/api/voting/request`,
    JSON.stringify({
      artistId,
      email: `load-${__VU}-${__ITER}-${randomUUID()}@example.test`,
      deviceId: randomUUID(),
      marketingOptIn: false,
    }),
    { headers: { 'content-type': 'application/json' } },
  );
  check(response, { 'request is not a server error': (res) => res.status < 500 });
  sleep(1);
}
