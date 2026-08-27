import * as api from '../api.js';
import { h, showToast, renderEmptyState } from '../utils.js';
import { getState, setState } from '../state.js';

export async function renderSlots(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Свободные слоты'), h('p', {}, 'Проверка доступного времени для записи')]),
    ])
  );

  if (!getState().services.length || !getState().staff.length) {
    try {
      const [services, staff] = await Promise.all([api.listServices(), api.listStaff()]);
      setState({ services, staff });
    } catch (err) {
      showToast(err.message);
    }
  }

  const { services, staff } = getState();

  const serviceSelect = h('select', { id: 'slots-service', class: 'select', required: true }, [
    h('option', { value: '' }, 'Выберите услугу'),
    ...services.map((s) => h('option', { value: s.id }, s.name)),
  ]);
  const staffSelect = h('select', { id: 'slots-staff', class: 'select' }, [
    h('option', { value: '' }, 'Любой мастер'),
    ...staff.map((s) => h('option', { value: s.id }, s.name)),
  ]);
  const dateInput = h('input', { id: 'slots-date', type: 'date', class: 'input', required: true });
  const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Найти слоты');

  const form = h('form', { class: 'form-grid form-grid--2col', novalidate: true }, [
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'slots-service' }, 'Услуга'), serviceSelect]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'slots-staff' }, 'Мастер'), staffSelect]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'slots-date' }, 'Дата'), dateInput]),
    h('div', { class: 'form-actions' }, [submitBtn]),
  ]);
  const resultEl = h('div', { class: 'slots-result' });

  container.appendChild(h('div', { class: 'card' }, [form]));
  container.appendChild(resultEl);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!serviceSelect.value || !dateInput.value) {
      showToast('Укажите услугу и дату.');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Поиск...';
    try {
      const data = await api.getAvailableSlots({
        service_id: Number(serviceSelect.value),
        date: dateInput.value,
        staff_id: staffSelect.value ? Number(staffSelect.value) : undefined,
      });
      resultEl.innerHTML = '';
      if (!data.available_slots.length) {
        renderEmptyState(resultEl, { icon: '🕒', title: 'Свободных слотов нет', text: 'Попробуйте другую дату или мастера.' });
      } else {
        resultEl.appendChild(
          h('div', { class: 'chip-list' }, data.available_slots.map((slot) => h('span', { class: 'chip chip--active' }, slot)))
        );
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Найти слоты';
    }
  });
}
