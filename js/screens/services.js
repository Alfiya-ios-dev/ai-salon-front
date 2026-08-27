import * as api from '../api.js';
import { h, showToast, confirmModal, renderSkeletonCards, renderEmptyState, renderErrorState, formatMoney } from '../utils.js';
import { getState, setState } from '../state.js';

export async function renderServices(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Услуги'), h('p', {}, 'Каталог услуг салона и цены')]),
    ])
  );

  const formCard = h('div', { class: 'card' });
  const listEl = h('div', { class: 'data-list' });
  container.appendChild(formCard);
  container.appendChild(listEl);

  let editingService = null;

  function renderForm() {
    formCard.innerHTML = '';

    const categoryInput = h('input', { id: 'svc-category', type: 'text', class: 'input', value: editingService?.category ?? '' });
    const nameInput = h('input', { id: 'svc-name', type: 'text', class: 'input', required: true, value: editingService?.name ?? '' });
    const priceInput = h('input', { id: 'svc-price', type: 'number', class: 'input', required: true, min: '0', value: editingService?.price ?? '' });
    const durationInput = h('input', { id: 'svc-duration', type: 'number', class: 'input', required: true, min: '1', value: editingService?.duration_minutes ?? '' });
    const descInput = h('textarea', { id: 'svc-description', class: 'textarea' });
    descInput.value = editingService?.description ?? '';

    const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, editingService ? 'Сохранить изменения' : 'Добавить услугу');
    const cancelBtn = editingService
      ? h('button', { type: 'button', class: 'btn btn--secondary', onClick: () => { editingService = null; renderForm(); } }, 'Отменить')
      : null;

    const form = h('form', { class: 'form-grid form-grid--2col', novalidate: true }, [
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'svc-category' }, 'Категория'), categoryInput]),
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'svc-name' }, 'Название услуги'), nameInput]),
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'svc-price' }, 'Цена, сом'), priceInput]),
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'svc-duration' }, 'Длительность, мин'), durationInput]),
      h('div', { class: 'field', style: 'grid-column: 1 / -1' }, [h('label', { class: 'field__label', for: 'svc-description' }, 'Описание'), descInput]),
      h('div', { class: 'form-actions', style: 'grid-column: 1 / -1' }, [submitBtn, cancelBtn]),
    ]);

    if (editingService) {
      form.appendChild(
        h('p', { class: 'field__hint', style: 'grid-column: 1 / -1' }, 'Backend не поддерживает обновление услуги — сохранение удалит старую запись и создаст новую (re-create).')
      );
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        category: categoryInput.value.trim() || null,
        name: nameInput.value.trim(),
        price: Number(priceInput.value),
        duration_minutes: Number(durationInput.value),
        description: descInput.value.trim() || null,
      };
      submitBtn.disabled = true;
      try {
        if (editingService) {
          await api.deleteService(editingService.id);
          await api.createService(payload);
          showToast('Услуга обновлена (пересоздана).', 'success');
        } else {
          await api.createService(payload);
          showToast('Услуга добавлена.', 'success');
        }
        editingService = null;
        await load();
      } catch (err) {
        showToast(err.message);
      } finally {
        submitBtn.disabled = false;
      }
    });

    formCard.appendChild(h('h2', { class: 'section-title', style: 'margin-top:0' }, editingService ? 'Редактирование услуги' : 'Новая услуга'));
    formCard.appendChild(form);
  }

  function renderList() {
    const services = getState().services;
    listEl.innerHTML = '';
    if (!services.length) {
      renderEmptyState(listEl, { icon: '💇', title: 'Услуг пока нет', text: 'Добавьте первую услугу формой выше.' });
      return;
    }
    services.forEach((service) => {
      listEl.appendChild(
        h('div', { class: 'data-card' }, [
          h('div', { class: 'data-card__row' }, [
            h('span', { class: 'data-card__title' }, service.name),
            h('span', { class: 'badge badge--neutral' }, service.category || 'без категории'),
          ]),
          h('div', { class: 'data-card__meta' }, `${formatMoney(service.price)} · ${service.duration_minutes} мин`),
          service.description ? h('div', { class: 'data-card__meta' }, service.description) : null,
          h('div', { class: 'data-card__actions' }, [
            h('button', { class: 'btn btn--small btn--secondary', onClick: () => { editingService = service; renderForm(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Изменить'),
            h('button', { class: 'btn btn--small btn--danger', onClick: () => onDelete(service) }, 'Удалить'),
          ]),
        ])
      );
    });
  }

  async function onDelete(service) {
    const ok = await confirmModal(`Удалить услугу «${service.name}»? Действие необратимо.`, { title: 'Удалить услугу', confirmLabel: 'Удалить', danger: true });
    if (!ok) return;
    try {
      await api.deleteService(service.id);
      showToast('Услуга удалена.', 'success');
      await load();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function load() {
    renderSkeletonCards(listEl, 3);
    try {
      const services = await api.listServices();
      setState({ services });
      renderList();
    } catch (err) {
      renderErrorState(listEl, { text: err.message, onRetry: load });
    }
  }

  renderForm();
  await load();
}
