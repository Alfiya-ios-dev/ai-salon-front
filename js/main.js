import { registerRoute, initRouter, navigate } from './router.js';
import { isAuthenticated, getState } from './state.js';
import { logout } from './api.js';
import { USE_MOCK_API } from './config.js';
import { h } from './utils.js';
import { NAV_GROUPS, BOTTOM_NAV_ITEMS, pageTitleFor } from './nav.js';

import { renderAuth } from './screens/auth.js';
import { renderBookings } from './screens/bookings.js';
import { renderServices } from './screens/services.js';
import { renderStaff } from './screens/staff.js';
import { renderSchedule } from './screens/schedule.js';
import { renderSlots } from './screens/slots.js';
import { renderPrompts } from './screens/prompts.js';
import { renderBusinessInfo } from './screens/businessInfo.js';
import { renderDocuments } from './screens/documents.js';
import { renderStopCategories } from './screens/stopCategories.js';
import { renderManagers } from './screens/managers.js';

const sidebar = document.getElementById('sidebar');
const header = document.getElementById('app-header');
const outlet = document.getElementById('outlet');
const bottomNav = document.getElementById('bottom-nav');
const drawerOverlay = document.getElementById('drawer-overlay');
const mobileDrawer = document.getElementById('mobile-drawer');

function closeDrawer() {
  drawerOverlay.classList.remove('drawer-overlay--open');
  mobileDrawer.classList.remove('mobile-drawer--open');
}

function openDrawer() {
  drawerOverlay.classList.add('drawer-overlay--open');
  mobileDrawer.classList.add('mobile-drawer--open');
}

function buildNavLink(item, currentPath, onClick) {
  const active = currentPath === item.path || (item.path === '#/schedule' && currentPath.startsWith('#/staff/') && currentPath.endsWith('/schedule'));
  return h(
    'a',
    {
      href: item.path,
      class: `nav-link ${active ? 'nav-link--active' : ''}`,
      'aria-current': active ? 'page' : undefined,
      onClick: () => onClick?.(),
    },
    [h('span', { class: 'nav-link__icon', 'aria-hidden': 'true' }, item.icon), item.label]
  );
}

function renderSidebar(currentPath) {
  sidebar.innerHTML = '';
  sidebar.appendChild(
    h('div', { class: 'sidebar__logo' }, [h('span', { class: 'sidebar__logo-mark' }, 'S'), 'Salon Admin'])
  );
  NAV_GROUPS.forEach((group) => {
    sidebar.appendChild(h('div', { class: 'sidebar__group-label' }, group.label));
    sidebar.appendChild(h('nav', { class: 'sidebar__nav' }, group.items.map((item) => buildNavLink(item, currentPath))));
  });
  sidebar.appendChild(
    h('div', { class: 'sidebar__footer' }, [
      h('button', { class: 'btn btn--secondary btn--block', onClick: doLogout }, 'Выйти'),
    ])
  );
}

function renderBottomNav(currentPath) {
  bottomNav.innerHTML = '';
  BOTTOM_NAV_ITEMS.forEach((item) => {
    const active = currentPath === item.path;
    bottomNav.appendChild(
      h('a', { href: item.path, class: `bottom-nav__item ${active ? 'bottom-nav__item--active' : ''}` }, [
        h('span', { class: 'bottom-nav__item-icon', 'aria-hidden': 'true' }, item.icon),
        item.label,
      ])
    );
  });
  bottomNav.appendChild(
    h(
      'button',
      { class: 'bottom-nav__item', onClick: openDrawer, 'aria-haspopup': 'true' },
      [h('span', { class: 'bottom-nav__item-icon', 'aria-hidden': 'true' }, '☰'), 'Ещё']
    )
  );
}

function renderDrawer(currentPath) {
  mobileDrawer.innerHTML = '';
  mobileDrawer.appendChild(
    h('div', { class: 'mobile-drawer__header' }, [
      h('span', { class: 'sidebar__logo' }, [h('span', { class: 'sidebar__logo-mark' }, 'S'), 'Salon Admin']),
      h('button', { class: 'btn btn--icon', onClick: closeDrawer, 'aria-label': 'Закрыть меню' }, '✕'),
    ])
  );
  NAV_GROUPS.forEach((group) => {
    mobileDrawer.appendChild(h('div', { class: 'sidebar__group-label' }, group.label));
    mobileDrawer.appendChild(
      h('nav', { class: 'sidebar__nav' }, group.items.map((item) => buildNavLink(item, currentPath, closeDrawer)))
    );
  });
  mobileDrawer.appendChild(
    h('div', { class: 'sidebar__footer' }, [
      h('button', { class: 'btn btn--secondary btn--block', onClick: doLogout }, 'Выйти'),
    ])
  );
}

function renderHeader(currentPath) {
  const { businessName } = getState();
  header.innerHTML = '';
  header.appendChild(
    h('div', { class: 'header__inner' }, [
      h('button', { class: 'header__menu-btn', onClick: openDrawer, 'aria-label': 'Открыть меню' }, '☰'),
      h('div', {}, [
        h('div', { class: 'header__title' }, pageTitleFor(currentPath)),
        businessName ? h('span', { class: 'header__business' }, businessName) : null,
      ]),
    ])
  );
}

function doLogout() {
  logout();
  closeDrawer();
  navigate('#/auth');
  renderChrome();
}

function renderChrome() {
  const authed = isAuthenticated();
  const currentPath = window.location.hash.replace(/^#/, '') || '/auth';
  const hashPath = `#${currentPath}`;

  header.classList.toggle('hidden', !authed);
  bottomNav.classList.toggle('hidden', !authed);
  sidebar.classList.toggle('hidden', !authed);

  if (!authed) {
    sidebar.innerHTML = '';
    header.innerHTML = '';
    bottomNav.innerHTML = '';
    closeDrawer();
    return;
  }

  renderSidebar(hashPath);
  renderBottomNav(hashPath);
  renderDrawer(hashPath);
  renderHeader(hashPath);
  closeDrawer();
}

drawerOverlay.addEventListener('click', closeDrawer);

registerRoute('/auth', renderAuth, { public: true });
registerRoute('/bookings', renderBookings);
registerRoute('/services', renderServices);
registerRoute('/staff', renderStaff);
registerRoute('/schedule', (el) => renderSchedule(el, {}));
registerRoute('/staff/:staffId/schedule', (el, params) => renderSchedule(el, { staffId: params.staffId }));
registerRoute('/slots', renderSlots);
registerRoute('/prompts', renderPrompts);
registerRoute('/business-info', renderBusinessInfo);
registerRoute('/documents', renderDocuments);
registerRoute('/stop-categories', renderStopCategories);
registerRoute('/managers', renderManagers);

initRouter(outlet, { onNavigate: renderChrome });
window.addEventListener('auth:expired', renderChrome);
renderChrome();

if (USE_MOCK_API) {
  // eslint-disable-next-line no-console
  console.info('[salon-admin] Mock-режим включён (USE_MOCK_API=true в js/config.js). Демо-доступ: demo@salon.test / demo12345');
}
