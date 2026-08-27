import * as api from '../api.js';
import { h, showToast, renderSkeletonCards, renderEmptyState, renderErrorState, formatDateTime } from '../utils.js';

const STATUSES = ['новая', 'подтверждена', 'отменена'];
const STATUS_BADGE = { новая: 'info', подтверждена: 'success', отменена: 'danger' };

export async function renderBookings(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Бронирования'), h('p', {}, 'Все записи клиентов из бота и панели')]),
    ])
  );

  const statusFilter = h('select', { class: 'select', 'aria-label': 'Фильтр по статусу' }, [
    h('option', { value: '' }, 'Все статусы'),
    ...STATUSES.map((s) => h('option', { value: s }, s)),
  ]);
  container.appendChild(h('div', { class: 'filter-bar' }, [statusFilter]));

  const bodyEl = h('div', {});
  container.appendChild(bodyEl);

  async function load() {
    renderSkeletonCards(bodyEl, 4);
    try {
      const bookings = await api.listBookings({ status: statusFilter.value || undefined });
      renderList(bookings);
    } catch (err) {
      renderErrorState(bodyEl, { text: err.message, onRetry: load });
    }
  }

  function renderList(bookings) {
    bodyEl.innerHTML = '';
    if (!bookings.length) {
      renderEmptyState(bodyEl, { icon: '📅', title: 'Бронирований нет', text: 'Здесь появятся записи клиентов.' });
      return;
    }

    const tableWrap = h('div', { class: 'table-wrap' });
    const thead = h('thead', {}, [
      h('tr', {}, [
        h('th', { scope: 'col' }, 'Клиент'),
        h('th', { scope: 'col' }, 'Телефон'),
        h('th', { scope: 'col' }, 'Дата и время'),
        h('th', { scope: 'col' }, 'Мастер / услуга'),
        h('th', { scope: 'col' }, 'Статус'),
      ]),
    ]);

    const rows = bookings.map((booking) => {
      const statusSelect = h(
        'select',
        {
          class: 'select',
          'aria-label': `Статус брони ${booking.client_name}`,
          onChange: async (e) => {
            const status = e.target.value;
            try {
              await api.updateBookingStatus(booking.id, status);
              showToast('Статус обновлён.', 'success');
              badge.className = `badge badge--${STATUS_BADGE[status]}`;
              badge.textContent = status;
            } catch (err) {
              showToast(err.message);
              e.target.value = booking.status;
            }
          },
        },
        STATUSES.map((s) => h('option', { value: s, selected: s === booking.status || undefined }, s))
      );

      const badge = h('span', { class: `badge badge--${STATUS_BADGE[booking.status]}` }, booking.status);

      return h('tr', {}, [
        h('td', {}, h('span', { class: 'booking-client' }, booking.client_name)),
        h('td', {}, booking.client_phone),
        h('td', {}, h('span', { class: 'booking-datetime' }, formatDateTime(booking.booking_datetime))),
        h('td', {}, `#${booking.staff_id} / #${booking.service_id}`),
        h('td', {}, [badge, statusSelect]),
      ]);
    });

    tableWrap.appendChild(h('table', { class: 'table' }, [thead, h('tbody', {}, rows)]));
    bodyEl.appendChild(tableWrap);
  }

  statusFilter.addEventListener('change', load);
  await load();
}
