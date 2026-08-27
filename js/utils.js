export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null && value !== false) {
      el.setAttribute(key, value === true ? '' : value);
    }
  }
  for (const child of [].concat(children)) {
    if (child === undefined || child === null || child === false) continue;
    el.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(child) : child);
  }
  return el;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ==================== Toast ====================
export function showToast(message, type = 'error') {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const toast = h('div', { class: `toast toast--${type}`, role: 'status' }, message);
  region.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ==================== Skeleton ====================
export function renderSkeletonCards(container, count = 3) {
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    container.appendChild(h('div', { class: 'skeleton skeleton-card', 'aria-hidden': 'true' }));
  }
}

// ==================== Empty / error states ====================
export function renderEmptyState(container, { icon = '🗂️', title = 'Пока пусто', text = '' } = {}) {
  container.innerHTML = '';
  container.appendChild(
    h('div', { class: 'state-block', role: 'status' }, [
      h('div', { class: 'state-block__icon' }, icon),
      h('div', { class: 'state-block__title' }, title),
      text ? h('div', { class: 'state-block__text' }, text) : null,
    ])
  );
}

export function renderErrorState(container, { title = 'Не удалось загрузить данные', text = '', onRetry } = {}) {
  container.innerHTML = '';
  container.appendChild(
    h('div', { class: 'state-block state-block--error', role: 'alert' }, [
      h('div', { class: 'state-block__icon' }, '⚠️'),
      h('div', { class: 'state-block__title' }, title),
      text ? h('div', { class: 'state-block__text' }, text) : null,
      onRetry ? h('button', { class: 'btn btn--secondary btn--small', onClick: onRetry }, 'Повторить') : null,
    ])
  );
}

// ==================== Modal ====================
export function openModal({ title, body, actions = [] }) {
  const root = document.getElementById('modal-root');
  const overlay = h('div', { class: 'modal-overlay', role: 'presentation' });
  const closeBtn = h('button', { class: 'btn btn--icon modal__close', 'aria-label': 'Закрыть' }, '✕');

  function close() {
    overlay.classList.remove('modal-overlay--open');
    setTimeout(() => overlay.remove(), 200);
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const actionsRow = h(
    'div',
    { class: 'form-actions' },
    actions.map((a) =>
      h(
        'button',
        {
          class: `btn ${a.variant === 'primary' ? 'btn--primary' : a.variant === 'danger' ? 'btn--danger' : 'btn--secondary'}`,
          onClick: async () => {
            await a.onClick?.();
            if (a.closeOnClick !== false) close();
          },
        },
        a.label
      )
    )
  );

  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    h('div', { class: 'modal__header' }, [h('h2', { class: 'modal__title' }, title), closeBtn]),
    body,
    actionsRow,
  ]);

  overlay.appendChild(modal);
  root.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('modal-overlay--open'));
  document.addEventListener('keydown', onKeydown);

  return { close };
}

export function confirmModal(message, { title = 'Подтвердите действие', confirmLabel = 'Подтвердить', danger = false } = {}) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: h('p', { class: 'modal__text' }, message),
      actions: [
        { label: 'Отмена', variant: 'secondary', onClick: () => resolve(false) },
        { label: confirmLabel, variant: danger ? 'danger' : 'primary', onClick: () => resolve(true) },
      ],
    });
  });
}

// ==================== Formatting ====================
export function formatMoney(value) {
  return `${Number(value).toLocaleString('ru-RU')} сом`;
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
