export const NAV_GROUPS = [
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
      { path: '#/staff', label: 'Мастера', icon: '🧑‍💼' },
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

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export const BOTTOM_NAV_ITEMS = [
  { path: '#/bookings', label: 'Брони', icon: '📅' },
  { path: '#/services', label: 'Услуги', icon: '💇' },
  { path: '#/staff', label: 'Мастера', icon: '🧑‍💼' },
  { path: '#/schedule', label: 'Графики', icon: '🗓️' },
];

export function pageTitleFor(path) {
  const exact = ALL_NAV_ITEMS.find((i) => i.path === path);
  if (exact) return exact.label;
  if (path.startsWith('#/staff/')) return 'Графики работы';
  return 'Salon Admin';
}
