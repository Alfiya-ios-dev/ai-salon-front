// ЭКСПЕРИМЕНТАЛЬНАЯ СТРАНИЦА: в реальном openapi.json нет эндпоинтов для
// документов и нет загрузки файлов вообще (ни одного multipart/form-data
// эндпоинта). Работает только через js/mock-api.js. См. комментарий в начале
// mock-api.js.
import * as api from '../api.js';
import { h, showToast, confirmModal, renderSkeletonCards, renderEmptyState, renderErrorState, formatDateTime } from '../utils.js';

const CATEGORIES = ['Прайс-лист', 'Политика', 'FAQ', 'Инструкция', 'Другое'];
const STATUS_BADGE = { active: 'success', archived: 'neutral' };
const STATUS_LABEL = { active: 'активен', archived: 'в архиве' };

export async function renderDocuments(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Документы'), h('p', {}, 'База знаний, на которую опирается бот')]),
    ])
  );

  container.appendChild(
    h('div', { class: 'mock-banner' }, [
      h('span', { 'aria-hidden': 'true' }, '🧪'),
      h('span', {}, 'Экспериментальный раздел: эндпоинтов для документов и загрузки файлов ещё нет в реальном backend, страница работает только в mock-режиме.'),
    ])
  );

  const titleInput = h('input', { id: 'doc-title', type: 'text', class: 'input', required: true });
  const categorySelect = h('select', { id: 'doc-category', class: 'select' }, CATEGORIES.map((c) => h('option', { value: c }, c)));
  const fileInput = h('input', { id: 'doc-file', type: 'file', class: 'input' });
  const descInput = h('textarea', { id: 'doc-description', class: 'textarea' });
  const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Добавить документ');

  const form = h('form', { class: 'form-grid form-grid--2col', novalidate: true }, [
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'doc-title' }, 'Название'), titleInput]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'doc-category' }, 'Категория'), categorySelect]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'doc-file' }, 'Файл'), fileInput, h('span', { class: 'field__hint' }, 'Загрузка эмулируется локально, файл никуда не отправляется.')]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'doc-description' }, 'Описание')]),
    h('div', { class: 'field', style: 'grid-column: 1 / -1' }, [descInput]),
    h('div', { class: 'form-actions', style: 'grid-column: 1 / -1' }, [submitBtn]),
  ]);

  const listEl = h('div', { class: 'data-list' });
  container.appendChild(h('div', { class: 'card' }, [h('h2', { class: 'section-title', style: 'margin-top:0' }, 'Новый документ'), form]));
  container.appendChild(listEl);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    submitBtn.disabled = true;
    try {
      await api.createDocument({
        title: titleInput.value.trim(),
        category: categorySelect.value,
        file_name: file ? file.name : 'без файла',
        file_size_kb: file ? Math.max(1, Math.round(file.size / 1024)) : 0,
        description: descInput.value.trim() || null,
      });
      showToast('Документ добавлен.', 'success');
      form.reset();
      await load();
    } catch (err) {
      showToast(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  function renderList(documents) {
    listEl.innerHTML = '';
    if (!documents.length) {
      renderEmptyState(listEl, { icon: '📄', title: 'Документов пока нет' });
      return;
    }
    documents.forEach((doc) => {
      listEl.appendChild(
        h('div', { class: 'data-card' }, [
          h('div', { class: 'data-card__row' }, [
            h('div', { style: 'display:flex;align-items:center;gap:12px' }, [
              h('span', { class: 'doc-icon', 'aria-hidden': 'true' }, doc.file_name.split('.').pop().slice(0, 3).toUpperCase()),
              h('span', { class: 'data-card__title' }, doc.title),
            ]),
            h('span', { class: `badge badge--${STATUS_BADGE[doc.status] || 'neutral'}` }, STATUS_LABEL[doc.status] || doc.status),
          ]),
          h('div', { class: 'data-card__meta' }, `${doc.category} · ${doc.file_name} · ${doc.file_size_kb} КБ`),
          h('div', { class: 'data-card__meta' }, `Загружен: ${formatDateTime(doc.uploaded_at)}`),
          doc.description ? h('div', { class: 'data-card__meta' }, doc.description) : null,
          h('div', { class: 'data-card__actions' }, [
            h('button', {
              class: 'btn btn--small btn--danger',
              onClick: async () => {
                const ok = await confirmModal(`Удалить документ «${doc.title}»?`, { title: 'Удалить документ', confirmLabel: 'Удалить', danger: true });
                if (!ok) return;
                try {
                  await api.deleteDocument(doc.id);
                  showToast('Документ удалён.', 'success');
                  await load();
                } catch (err) {
                  showToast(err.message);
                }
              },
            }, 'Удалить'),
          ]),
        ])
      );
    });
  }

  async function load() {
    renderSkeletonCards(listEl, 3);
    try {
      const documents = await api.listDocuments();
      renderList(documents);
    } catch (err) {
      renderErrorState(listEl, { text: err.message, onRetry: load });
    }
  }

  await load();
}
