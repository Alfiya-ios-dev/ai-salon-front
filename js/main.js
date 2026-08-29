import { registerRoute, initRouter, navigate } from './router.js';
import { isAuthenticated, getState, subscribe, loadBusinessLabels, resetSessionState } from './state.js';
import { logout } from './api.js';
import { USE_MOCK_API } from './config.js';
import { h } from './utils.js';
import { getNavGroups, getBottomNavItems, pageTitleFor, PUBLIC_NAV_ITEMS, PUBLIC_ROUTE_PATHS } from './nav.js';

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
import { renderAbout } from './screens/about.js';
import { renderNews } from './screens/news.js';
import { renderReviews } from './screens/reviews.js';
import { renderGuides } from './screens/guides.js';
import { renderTerms } from './screens/terms.js';
import { renderSupport } from './screens/support.js';

const sidebar = document.getElementById('sidebar');
const header = document.getElementById('app-header');
const publicHeader = document.getElementById('public-header');
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
  getNavGroups().forEach((group) => {
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
  getBottomNavItems().forEach((item) => {
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
  getNavGroups().forEach((group) => {
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

function renderPublicHeader(currentPath) {
  publicHeader.innerHTML = '';
  publicHeader.appendChild(
    h('div', { class: 'public-header__inner' }, [
      h('a', { href: '#/auth', class: 'public-header__logo' }, [
        h('span', { class: 'public-header__logo-mark', 'aria-hidden': 'true' }, '↗'),
        'the dalfy bot',
      ]),
      h(
        'nav',
        { class: 'public-header__nav', 'aria-label': 'Публичные разделы' },
        PUBLIC_NAV_ITEMS.map((item) =>
          h(
            'a',
            {
              href: item.path,
              class: `public-header__link ${currentPath === item.path ? 'public-header__link--active' : ''}`,
              'aria-current': currentPath === item.path ? 'page' : undefined,
            },
            item.label
          )
        )
      ),
    ])
  );
}

function doLogout() {
  logout();
  resetSessionState();
  closeDrawer();
  navigate('#/auth');
  renderChrome();
}

function renderChrome() {
  const authed = isAuthenticated();
  const currentPath = window.location.hash.replace(/^#/, '') || '/auth';
  const hashPath = `#${currentPath}`;
  const isPublicPage = PUBLIC_ROUTE_PATHS.includes(hashPath);

  // .outlet--public снимает padding/max-width у #outlet и подкладывает
  // фирменный градиент — публичные страницы должны быть full-bleed, без
  // белых полей, в отличие от внутренних админ-экранов (см. layout.css).
  outlet.classList.toggle('outlet--public', isPublicPage);

  if (isPublicPage) {
    header.classList.add('hidden');
    bottomNav.classList.add('hidden');
    sidebar.classList.add('hidden');
    header.innerHTML = '';
    bottomNav.innerHTML = '';
    sidebar.innerHTML = '';
    closeDrawer();

    publicHeader.classList.remove('hidden');
    renderPublicHeader(hashPath);
    return;
  }

  publicHeader.classList.add('hidden');
  publicHeader.innerHTML = '';

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

  // Метки терминологии ("Мастера" -> staff_label_plural и т.д.) подтягиваем
  // один раз за сессию: loadBusinessLabels() выставляет labelsLoaded=true,
  // после чего эта ветка больше не сработает.
  if (!getState().labelsLoaded) {
    loadBusinessLabels();
  }

  renderSidebar(hashPath);
  renderBottomNav(hashPath);
  renderDrawer(hashPath);
  renderHeader(hashPath);
  closeDrawer();
}

// Обновляет только содержимое меню/шапки под текущий hash, БЕЗ closeDrawer() —
// в отличие от renderChrome() это безопасно вызывать в фоне (например, когда
// подгрузились/поменялись labels), не выталкивая пользователя из открытой
// мобильной шторки меню посреди взаимодействия.
function refreshChromeLabels() {
  if (!isAuthenticated()) return;
  const currentPath = window.location.hash.replace(/^#/, '') || '/auth';
  const hashPath = `#${currentPath}`;
  // На публичных страницах (в т.ч. когда авторизованный пользователь просто
  // открыл /about) внутренний chrome скрыт и рендерится через renderChrome(),
  // не через этот путь — перерисовывать его здесь незачем.
  if (PUBLIC_ROUTE_PATHS.includes(hashPath)) return;
  renderSidebar(hashPath);
  renderBottomNav(hashPath);
  renderDrawer(hashPath);
  renderHeader(hashPath);
}

// loadBusinessLabels() дергается из renderChrome() выше (после логина/на
// старте) и из формы терминологии в "О бизнесе" (после сохранения) — оба
// раза state.js:setState() уведомит эту подписку, и меню/шапка подхватят
// новые подписи без навигации.
subscribe(refreshChromeLabels);

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

registerRoute('/about', renderAbout, { public: true });
registerRoute('/news', renderNews, { public: true });
registerRoute('/reviews', renderReviews, { public: true });
registerRoute('/guides', renderGuides, { public: true });
registerRoute('/terms', renderTerms, { public: true });
registerRoute('/support', renderSupport, { public: true });

initRouter(outlet, { onNavigate: renderChrome });
window.addEventListener('auth:expired', renderChrome);
renderChrome();

if (USE_MOCK_API) {
  // eslint-disable-next-line no-console
  console.info('[salon-admin] Mock-режим включён (USE_MOCK_API=true в js/config.js). Демо-доступ: demo@salon.test / demo12345');
}
