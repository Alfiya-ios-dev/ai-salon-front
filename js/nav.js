import { getLabels } from './state.js';

// Пункты меню строятся функциями (а не статичными константами), потому что
// подпись раздела "Мастера" зависит от терминологии бизнеса
// (staff_label_plural из /api/v1/business-info) и может поменяться после
// логина или сохранения настроек — см. state.js:loadBusinessLabels().
export function getNavGroups() {
  const { staff_label_plural } = getLabels();
  return [
    {
      label: 'Операции',
      items: [
        { path: '#/bookings', label: 'Бронирования', icon: '📅' },
        { path: '#/slots', label: 'Свободные слоты', icon: '🕒' },
      ],
    },
    {
      label: 'Каталог',
      items: [
        { path: '#/services', label: 'Услуги', icon: '💇' },
        { path: '#/staff', label: staff_label_plural, icon: '🧑‍💼' },
        { path: '#/schedule', label: 'Графики работы', icon: '🗓️' },
      ],
    },
    {
      label: 'Ассистент-бот',
      items: [
        { path: '#/prompts', label: 'Промпты', icon: '💬' },
        { path: '#/stop-categories', label: 'Стоп-категории', icon: '🚫' },
        { path: '#/documents', label: 'Документы', icon: '📄' },
      ],
    },
    {
      label: 'Организация',
      items: [
        { path: '#/managers', label: 'Менеджеры', icon: '👥' },
        { path: '#/business-info', label: 'О бизнесе', icon: '🏢' },
      ],
    },
  ];
}

export function getBottomNavItems() {
  const { staff_label_plural } = getLabels();
  return [
    { path: '#/bookings', label: 'Брони', icon: '📅' },
    { path: '#/services', label: 'Услуги', icon: '💇' },
    { path: '#/staff', label: staff_label_plural, icon: '🧑‍💼' },
    { path: '#/schedule', label: 'Графики', icon: '🗓️' },
  ];
}

export function pageTitleFor(path) {
  const allItems = getNavGroups().flatMap((g) => g.items);
  const exact = allItems.find((i) => i.path === path);
  if (exact) return exact.label;
  if (path.startsWith('#/staff/')) return 'Графики работы';
  return 'dalfy';
}

// Пункты меню .public-header (main.js) — по ТЗ ровно эти 4, без "Отзывы" и
// "Техподдержка". Те две страницы всё ещё существуют и остаются доступны по
// прямой ссылке (см. PUBLIC_ROUTE_PATHS ниже) — просто не показаны в шапке.
export const PUBLIC_NAV_ITEMS = [
  { path: '#/about', label: 'О нас' },
  { path: '#/news', label: 'Новости' },
  { path: '#/guides', label: 'Инструкция' },
  { path: '#/terms', label: 'Оферты' },
];

// Все публичные (доступные без логина) пути — независимый от PUBLIC_NAV_ITEMS
// список, используется router.js/main.js для решения "не редиректить на
// /auth" / "показать public-header". Нарочно не выводится из PUBLIC_NAV_ITEMS,
// иначе урезание меню молча закрыло бы /reviews и /support для гостей.
export const PUBLIC_ROUTE_PATHS = ['#/auth', '#/about', '#/news', '#/reviews', '#/guides', '#/terms', '#/support'];
