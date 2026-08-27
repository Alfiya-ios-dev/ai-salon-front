// Общее для api.js (реальный backend) и mock-api.js (мок) хранение токена/сессии.
// Вынесено в отдельный модуль, чтобы избежать циклического импорта api.js <-> mock-api.js.

const TOKEN_KEY = 'salon_token';
const TENANT_ID_KEY = 'salon_tenant_id';
const BUSINESS_NAME_KEY = 'salon_business_name';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession({ access_token, tenant_id, business_name }) {
  localStorage.setItem(TOKEN_KEY, access_token);
  localStorage.setItem(TENANT_ID_KEY, String(tenant_id));
  localStorage.setItem(BUSINESS_NAME_KEY, business_name);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TENANT_ID_KEY);
  localStorage.removeItem(BUSINESS_NAME_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function handleUnauthorized() {
  clearSession();
  window.dispatchEvent(new CustomEvent('auth:expired'));
  window.location.hash = '#/auth';
}
