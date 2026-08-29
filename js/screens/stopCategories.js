// ЭКСПЕРИМЕНТАЛЬНАЯ СТРАНИЦА: в реальном openapi.json нет эндпоинтов
// /stop-categories. Работает только через js/mock-api.js.
import * as api from '../api.js';
import {
  h,
  showToast,
  confirmModal,
  renderSkeletonCards,
  renderEmptyState,
  renderErrorState,
  renderNotImplementedState,
  isNotImplementedError,
} from '../utils.js';

export async function renderStopCategories(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Стоп-категории'), h('p', {}, 'Темы, которые бот не должен обсуждать или предлагать')]),
    ])
  );

  container.appendChild(
    h('div', { class: 'mock-banner' }, [
      h('span', { 'aria-hidden': 'true' }, '🧪'),
      h('span', {}, 'Экспериментальный раздел: контракт со stop-категориями с backend ещё не согласован, страница работает только в mock-режиме.'),
    ])
  );

  const nameInput = h('input', { id: 'stop-name', type: 'text', class: 'input', required: true });
  const descInput = h('textarea', { id: 'stop-description', class: 'textarea' });
  const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Добавить категорию');

  const form = h('form', { class: 'form-grid', novalidate: true }, [
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'stop-name' }, 'Название'), nameInput]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'stop-description' }, 'Описание'), descInput]),
    h('div', { class: 'form-actions' }, [submitBtn]),
  ]);

  const listEl = h('div', { class: 'data-list' });
  container.appendChild(h('div', { class: 'card' }, [h('h2', { class: 'section-title', style: 'margin-top:0' }, 'Новая стоп-категория'), form]));
  container.appendChild(listEl);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    try {
      await api.createStopCategory({ name: nameInput.value.trim(), description: descInput.value.trim() });
      showToast('Категория добавлена.', 'success');
      form.reset();
      await load();
    } catch (err) {
      showToast(isNotImplementedError(err) ? 'Раздел «Стоп-категории» пока в разработке на сервере.' : err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  function renderList(items) {
    listEl.innerHTML = '';
    if (!items.length) {
      renderEmptyState(listEl, { icon: '🚫', title: 'Стоп-категорий пока нет' });
      return;
    }
    items.forEach((item) => {
      const activeSwitch = h('label', { class: 'switch' }, [
        h('span', { class: 'switch__control' }, [
          h('input', {
            type: 'checkbox',
            checked: !!item.is_active,
            'aria-label': `Активность категории ${item.name}`,
            onChange: async (e) => {
              const is_active = e.target.checked;
              try {
                await api.updateStopCategory(item.id, { is_active });
                showToast(is_active ? 'Категория включена.' : 'Категория выключена.', 'success');
              } catch (err) {
                e.target.checked = !is_active;
                showToast(isNotImplementedError(err) ? 'Раздел «Стоп-категории» пока в разработке на сервере.' : err.message);
              }
            },
          }),
          h('span', { class: 'switch__track', 'aria-hidden': 'true' }),
        ]),
        item.is_active ? 'Активна' : 'Выключена',
      ]);

      listEl.appendChild(
        h('div', { class: 'data-card' }, [
          h('div', { class: 'data-card__row' }, [h('span', { class: 'data-card__title' }, item.name), activeSwitch]),
          item.description ? h('div', { class: 'data-card__meta' }, item.description) : null,
          h('div', { class: 'data-card__actions' }, [
            h('button', {
              class: 'btn btn--small btn--danger',
              onClick: async () => {
                const ok = await confirmModal(`Удалить категорию «${item.name}»?`, { title: 'Удалить категорию', confirmLabel: 'Удалить', danger: true });
                if (!ok) return;
                try {
                  await api.deleteStopCategory(item.id);
                  showToast('Удалено.', 'success');
                  await load();
                } catch (err) {
                  showToast(isNotImplementedError(err) ? 'Раздел «Стоп-категории» пока в разработке на сервере.' : err.message);
                }
              },
            }, 'Удалить'),
          ]),
        ])
      );
    });
  }

  function setFormDisabled(disabled) {
    submitBtn.disabled = disabled;
    submitBtn.title = disabled ? 'Раздел пока в разработке на сервере' : '';
  }

  async function load() {
    renderSkeletonCards(listEl, 3);
    try {
      const items = await api.listStopCategories();
      setFormDisabled(false);
      renderList(items);
    } catch (err) {
      if (isNotImplementedError(err)) {
        setFormDisabled(true);
        renderNotImplementedState(listEl, { text: 'Стоп-категории пока не поддерживаются backend. Мы уже работаем над этим.' });
      } else {
        renderErrorState(listEl, { text: err.message, onRetry: load });
      }
    }
  }

  await load();
}
