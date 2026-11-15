const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

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
