const getApiBase = () => {
  let envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl || !envUrl.trim()) {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      return 'https://medilo.onrender.com/api/v1';
    }
    return '/api/v1';
  }

  let clean = envUrl.trim().replace(/\/+$/, '');

  // Strip accidental documentation/swagger or auth paths if copied from browser address bar
  clean = clean
    .replace(/\/api\/docs.*$/i, '')
    .replace(/\/docs.*$/i, '')
    .replace(/\/swagger.*$/i, '');

  if (!clean) {
    return 'https://medilo.onrender.com/api/v1';
  }

  if (clean.endsWith('/api/v1')) return clean;
  if (clean.endsWith('/api')) return `${clean}/v1`;
  return `${clean}/api/v1`;
};

const API_BASE = getApiBase();

const TOKEN_KEY = 'medilo_auth_token';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

export const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const apiRequest = async (path, options = {}) => {
  const { method = 'GET', body, headers = {}, idempotencyKey } = options;
  const token = getStoredToken();

  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }
  if (idempotencyKey) {
    reqHeaders['Idempotency-Key'] = idempotencyKey;
  }

  const targetUrl = `${API_BASE}${path}`;
  let response;
  try {
    response = await fetch(targetUrl, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (netErr) {
    throw new Error(
      `Unable to reach backend API at '${targetUrl}'. Please verify your backend server is awake and VITE_API_BASE_URL is properly configured.`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = {};

  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => '');
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}: ${text.slice(0, 120)}`);
    }
    throw new Error(
      `API endpoint '${targetUrl}' returned HTML instead of JSON. Ensure VITE_API_BASE_URL in your hosting settings points to your deployed backend (e.g. https://your-backend.onrender.com) and the service is active.`
    );
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.code = payload?.error?.code || 'API_ERROR';
    err.details = payload?.error?.details;
    throw err;
  }

  return payload;
};

export const buildQueryString = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
};

export const formatMoney = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
