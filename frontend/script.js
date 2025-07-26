const API_URL = 'http://localhost:5000/api/requests';

async function submitRequest(request) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return await response.json();
}

async function fetchRequests() {
  const response = await fetch(API_URL);
  return await response.json();
}