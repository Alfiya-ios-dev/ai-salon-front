// ЭКСПЕРИМЕНТАЛЬНАЯ СТРАНИЦА: в реальном openapi.json нет эндпоинтов
// /managers (пользователи самой админ-панели). Работает только через
// js/mock-api.js.
import * as api from '../api.js';
import { h, showToast, confirmModal, renderSkeletonCards, renderEmptyState, renderErrorState, formatDateTime } from '../utils.js';

const ROLES = ['owner', 'admin', 'manager'];
const ROLE_LABEL = { owner: 'Владелец', admin: 'Администратор', manager: 'Менеджер' };
const ROLE_BADGE = { owner: 'primary', admin: 'info', manager: 'neutral' };

export async function renderManagers(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Менеджеры'), h('p', {}, 'Кто имеет доступ к этой админ-панели')]),
    ])
  );

  container.appendChild(
    h('div', { class: 'mock-banner' }, [
      h('span', { 'aria-hidden': 'true' }, '🧪'),
      h('span', {}, 'Экспериментальный раздел: управление доступом менеджеров ещё не реализовано на backend, страница работает только в mock-режиме.'),
    ])
  );

  const nameInput = h('input', { id: 'mgr-name', type: 'text', class: 'input', required: true });
  const emailInput = h('input', { id: 'mgr-email', type: 'email', class: 'input', required: true });
  const roleSelect = h('select', { id: 'mgr-role', class: 'select' }, ROLES.map((r) => h('option', { value: r }, ROLE_LABEL[r])));
  const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Добавить менеджера');

  const form = h('form', { class: 'form-grid form-grid--2col', novalidate: true }, [
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'mgr-name' }, 'Имя'), nameInput]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'mgr-email' }, 'Email'), emailInput]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'mgr-role' }, 'Роль'), roleSelect]),
    h('div', { class: 'form-actions', style: 'grid-column: 1 / -1' }, [submitBtn]),
  ]);

  const listEl = h('div', { class: 'data-list' });
  container.appendChild(h('div', { class: 'card' }, [h('h2', { class: 'section-title', style: 'margin-top:0' }, 'Новый менеджер'), form]));
  container.appendChild(listEl);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    try {
      await api.createManager({ full_name: nameInput.value.trim(), email: emailInput.value.trim(), role: roleSelect.value });
      showToast('Менеджер добавлен.', 'success');
      form.reset();
      await load();
    } catch (err) {
      showToast(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  function renderList(managers) {
    listEl.innerHTML = '';
    if (!managers.length) {
      renderEmptyState(listEl, { icon: '👥', title: 'Менеджеров пока нет' });
      return;
    }
    const tableWrap = h('div', { class: 'table-wrap' });
    const rows = managers.map((m) =>
      h('tr', {}, [
        h('td', {}, m.full_name),
        h('td', {}, m.email),
        h('td', {}, h('span', { class: `badge badge--${ROLE_BADGE[m.role] || 'neutral'}` }, ROLE_LABEL[m.role] || m.role)),
        h('td', {}, m.is_active ? h('span', { class: 'badge badge--success' }, 'активен') : h('span', { class: 'badge badge--neutral' }, 'отключён')),
        h('td', {}, m.last_login_at ? formatDateTime(m.last_login_at) : '—'),
        h('td', {}, [
          h('button', {
            class: 'btn btn--small btn--secondary',
            onClick: async () => {
              const is_active = !m.is_active;
              try {
                await api.updateManager(m.id, { is_active });
                showToast(is_active ? 'Доступ включён.' : 'Доступ отключён.', 'success');
                await load();
              } catch (err) {
                showToast(err.message);
              }
            },
          }, m.is_active ? 'Отключить' : 'Включить'),
          h('button', {
            class: 'btn btn--small btn--danger',
            onClick: async () => {
              const ok = await confirmModal(`Удалить менеджера «${m.full_name}»?`, { title: 'Удалить менеджера', confirmLabel: 'Удалить', danger: true });
              if (!ok) return;
              try {
                await api.deleteManager(m.id);
                showToast('Удалено.', 'success');
                await load();
              } catch (err) {
                showToast(err.message);
              }
            },
          }, 'Удалить'),
        ]),
      ])
    );
    tableWrap.appendChild(
      h('table', { class: 'table' }, [
        h('thead', {}, [
          h('tr', {}, [
            h('th', { scope: 'col' }, 'Имя'),
            h('th', { scope: 'col' }, 'Email'),
            h('th', { scope: 'col' }, 'Роль'),
            h('th', { scope: 'col' }, 'Статус'),
            h('th', { scope: 'col' }, 'Последний вход'),
            h('th', { scope: 'col' }, ''),
          ]),
        ]),
        h('tbody', {}, rows),
      ])
    );
    listEl.appendChild(tableWrap);
  }

  async function load() {
    renderSkeletonCards(listEl, 3);
    try {
      const managers = await api.listManagers();
      renderList(managers);
    } catch (err) {
      renderErrorState(listEl, { text: err.message, onRetry: load });
    }
  }

  await load();
}
