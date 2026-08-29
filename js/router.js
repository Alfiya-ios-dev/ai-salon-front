import { isAuthenticated } from './state.js';

const routes = [];
let outlet = null;
let onNavigate = null;

export function registerRoute(pattern, render, { public: isPublic = false } = {}) {
  const paramNames = [];
  const regexStr = pattern
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        paramNames.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, render, isPublic });
}

export function initRouter(outletEl, { onNavigate: navCallback } = {}) {
  outlet = outletEl;
  onNavigate = navCallback;
  window.addEventListener('hashchange', resolve);
  resolve();
}

export function navigate(hash) {
  window.location.hash = hash;
}

function currentPath() {
  return window.location.hash.replace(/^#/, '') || '/auth';
}

function findRoute(path) {
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) return { route, match };
  }
  return null;
}

function resolve() {
  const path = currentPath();
  const authed = isAuthenticated();
  const found = findRoute(path);

  // Публичность решает route.isPublic, а не жёстко зашитый "/auth" — так
  // /about, /news и другие публичные страницы тоже доступны без логина.
  // Неизвестный путь (found === null) для неавторизованного считаем
  // непубличным и уводим на /auth, как и раньше.
  if (!authed && !(found && found.route.isPublic) && path !== '/auth') {
    window.location.hash = '#/auth';
    return;
  }
  if (authed && path === '/auth') {
    window.location.hash = '#/bookings';
    return;
  }

  if (!found) {
    outlet.innerHTML = '<p class="empty-state">Страница не найдена.</p>';
    return;
  }

  const { route, match } = found;
  const params = {};
  route.paramNames.forEach((name, i) => (params[name] = match[i + 1]));
  outlet.innerHTML = '';
  route.render(outlet, params);
  if (onNavigate) onNavigate(path);
}
