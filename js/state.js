import { isAuthenticated as sessionIsAuthenticated } from './session.js';

const listeners = new Set();

const state = {
  tenantId: localStorage.getItem('salon_tenant_id') || null,
  businessName: localStorage.getItem('salon_business_name') || null,
  staff: [],
  services: [],
  bookings: [],
};

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isAuthenticated() {
  return sessionIsAuthenticated();
}

window.addEventListener('auth:expired', () => {
  setState({ tenantId: null, businessName: null, staff: [], services: [], bookings: [] });
});
