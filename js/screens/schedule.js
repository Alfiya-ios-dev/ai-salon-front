import * as api from '../api.js';
import { h, showToast, confirmModal, renderSkeletonCards, renderEmptyState, renderErrorState } from '../utils.js';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = понедельник
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export async function renderSchedule(container, { staffId } = {}) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Графики работы'), h('p', {}, 'Рабочие дни и часы мастеров')]),
    ])
  );

  const staffSelect = h('select', { class: 'select', 'aria-label': 'Выбор мастера' });
  container.appendChild(h('div', { class: 'filter-bar' }, [staffSelect]));

  const weekWrap = h('div', {});
  const formCard = h('div', { class: 'card' }, [h('h2', { class: 'section-title', style: 'margin-top:0' }, 'Добавить рабочий день')]);
  const fullListEl = h('div', { class: 'data-list' });

  container.appendChild(weekWrap);
  container.appendChild(formCard);
  container.appendChild(h('h2', { class: 'section-title' }, 'Все дни в расписании'));
  container.appendChild(fullListEl);

  let currentStaffId = staffId ? Number(staffId) : null;
  let weekStart = startOfWeek(new Date());
  let staffList = [];
  let days = [];

  function renderWeek() {
    weekWrap.innerHTML = '';
    const label = `${toDateStr(weekStart)} — ${toDateStr(new Date(weekStart.getTime() + 6 * 86400000))}`;
    const nav = h('div', { class: 'week-nav' }, [
      h('button', { class: 'btn btn--small btn--secondary', onClick: () => { weekStart.setDate(weekStart.getDate() - 7); renderWeek(); } }, '← Пред. неделя'),
      h('span', { class: 'week-nav__label' }, label),
      h('button', { class: 'btn btn--small btn--secondary', onClick: () => { weekStart.setDate(weekStart.getDate() + 7); renderWeek(); } }, 'След. неделя →'),
    ]);

    const grid = h('div', { class: 'week-grid' });
    const todayStr = toDateStr(new Date());
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart.getTime() + i * 86400000);
      const dateStr = toDateStr(d);
      const dayEntries = days.filter((entry) => entry.date === dateStr);
      const isToday = dateStr === todayStr;
      grid.appendChild(
        h('div', { class: `week-day-card ${isToday ? 'week-day-card--today' : ''}` }, [
          h('div', {}, [
            h('div', { class: 'week-day-card__label' }, WEEKDAY_LABELS[i]),
            h('div', { class: 'week-day-card__date' }, dateStr.slice(5)),
          ]),
          dayEntries.length
            ? h(
                'div',
                { class: 'week-day-card__slots' },
                dayEntries.map((entry) =>
                  h('button', {
                    class: 'week-day-card__slot',
                    title: 'Удалить этот рабочий день',
                    onClick: () => onDeleteDay(entry),
                  }, `${entry.start_time}–${entry.end_time} ✕`)
                )
              )
            : h('span', { class: 'field__hint' }, 'выходной'),
        ])
      );
    }

    weekWrap.appendChild(nav);
    weekWrap.appendChild(grid);
  }

  function renderFullList() {
    fullListEl.innerHTML = '';
    if (!days.length) {
      renderEmptyState(fullListEl, { icon: '🗓️', title: 'Расписание не задано', text: 'Добавьте рабочий день формой выше.' });
      return;
    }
    days
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((entry) => {
        fullListEl.appendChild(
          h('div', { class: 'data-card' }, [
            h('div', { class: 'data-card__row' }, [
              h('span', { class: 'data-card__title' }, entry.date),
              h('span', { class: 'badge badge--primary' }, `${entry.start_time} — ${entry.end_time}`),
            ]),
            h('div', { class: 'data-card__actions' }, [
              h('button', { class: 'btn btn--small btn--danger', onClick: () => onDeleteDay(entry) }, 'Удалить'),
            ]),
          ])
        );
      });
  }

  async function onDeleteDay(entry) {
    const ok = await confirmModal(`Удалить рабочий день ${entry.date}?`, { title: 'Удалить день', confirmLabel: 'Удалить', danger: true });
    if (!ok) return;
    try {
      await api.deleteStaffScheduleDay(currentStaffId, entry.id);
      showToast('День удалён.', 'success');
      await loadDays();
    } catch (err) {
      showToast(err.message);
    }
  }

  function renderForm() {
    while (formCard.children.length > 1) formCard.removeChild(formCard.lastChild);
    const dateInput = h('input', { id: 'sched-date', type: 'date', class: 'input', required: true });
    const startInput = h('input', { id: 'sched-start', type: 'time', class: 'input', required: true });
    const endInput = h('input', { id: 'sched-end', type: 'time', class: 'input', required: true });
    const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Добавить день');

    const form = h('form', { class: 'form-grid form-grid--2col', novalidate: true }, [
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'sched-date' }, 'Дата'), dateInput]),
      h('div', {}),
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'sched-start' }, 'Начало'), startInput]),
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'sched-end' }, 'Конец'), endInput]),
      h('div', { class: 'form-actions', style: 'grid-column: 1 / -1' }, [submitBtn]),
    ]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentStaffId) {
        showToast('Сначала выберите мастера.');
        return;
      }
      submitBtn.disabled = true;
      try {
        await api.createStaffScheduleDay(currentStaffId, { date: dateInput.value, start_time: startInput.value, end_time: endInput.value });
        showToast('День добавлен.', 'success');
        await loadDays();
      } catch (err) {
        showToast(err.message);
      } finally {
        submitBtn.disabled = false;
      }
    });

    formCard.appendChild(form);
  }

  async function loadDays() {
    if (!currentStaffId) {
      days = [];
      renderWeek();
      renderFullList();
      return;
    }
    renderSkeletonCards(fullListEl, 3);
    try {
      days = await api.listStaffSchedule(currentStaffId);
      renderWeek();
      renderFullList();
    } catch (err) {
      renderErrorState(fullListEl, { text: err.message, onRetry: loadDays });
    }
  }

  async function init() {
    try {
      staffList = await api.listStaff();
    } catch (err) {
      showToast(err.message);
      staffList = [];
    }

    staffSelect.innerHTML = '';
    if (!staffList.length) {
      staffSelect.appendChild(h('option', { value: '' }, 'Нет сотрудников'));
    } else {
      if (!currentStaffId) currentStaffId = staffList[0].id;
      staffList.forEach((s) => {
        staffSelect.appendChild(h('option', { value: s.id, selected: s.id === currentStaffId || undefined }, `${s.name} · ${s.role}`));
      });
    }

    staffSelect.addEventListener('change', () => {
      currentStaffId = Number(staffSelect.value) || null;
      loadDays();
    });

    renderForm();
    await loadDays();
  }

  await init();
}
