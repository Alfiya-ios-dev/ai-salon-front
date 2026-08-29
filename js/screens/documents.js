// Реальный backend принимает RAG-файлы через multipart/form-data
// (POST /api/v1/documents/upload — см. realUploadDocument в js/api.js).
// Если на момент вызова эндпоинта ещё нет, api.js кидает ApiError(status:501)
// и страница мягко откатывается на renderNotImplementedState() ниже — так что
// код тут не завязан на то, действительно ли backend уже задеплоил upload.
import * as api from '../api.js';
import { USE_MOCK_API } from '../config.js';
import {
  h,
  showToast,
  confirmModal,
  renderSkeletonCards,
  renderEmptyState,
  renderErrorState,
  renderNotImplementedState,
  isNotImplementedError,
  formatDateTime,
} from '../utils.js';

const CATEGORIES = ['Прайс-лист', 'Политика', 'FAQ', 'Инструкция', 'Другое'];
const STATUS_BADGE = { active: 'success', archived: 'neutral' };
const STATUS_LABEL = { active: 'активен', archived: 'в архиве' };

export async function renderDocuments(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Документы'), h('p', {}, 'База знаний, на которую опирается бот')]),
    ])
  );

  const titleInput = h('input', { id: 'doc-title', type: 'text', class: 'input', required: true });
  const categorySelect = h('select', { id: 'doc-category', class: 'select' }, CATEGORIES.map((c) => h('option', { value: c }, c)));
  const fileInput = h('input', { id: 'doc-file', type: 'file', class: 'input', required: !USE_MOCK_API });
  const descInput = h('textarea', { id: 'doc-description', class: 'textarea' });
  const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Добавить документ');

  const form = h('form', { class: 'form-grid form-grid--2col', novalidate: true }, [
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'doc-title' }, 'Название'), titleInput]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'doc-category' }, 'Категория'), categorySelect]),
    h('div', { class: 'field' }, [
      h('label', { class: 'field__label', for: 'doc-file' }, 'Файл'),
      fileInput,
      h('span', { class: 'field__hint' }, USE_MOCK_API ? 'Загрузка эмулируется локально, файл никуда не отправляется.' : 'Файл загружается в базу знаний бота (RAG).'),
    ]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'doc-description' }, 'Описание')]),
    h('div', { class: 'field', style: 'grid-column: 1 / -1' }, [descInput]),
    h('div', { class: 'form-actions', style: 'grid-column: 1 / -1' }, [submitBtn]),
  ]);

  const listEl = h('div', { class: 'data-list' });
  container.appendChild(h('div', { class: 'card' }, [h('h2', { class: 'section-title', style: 'margin-top:0' }, 'Новый документ'), form]));
  container.appendChild(listEl);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0] || null;
    if (!USE_MOCK_API && !file) {
      showToast('Выберите файл для загрузки.');
      return;
    }
    submitBtn.disabled = true;
    try {
      await api.createDocument({
        title: titleInput.value.trim(),
        category: categorySelect.value,
        description: descInput.value.trim() || null,
        file,
      });
      showToast('Документ добавлен.', 'success');
      form.reset();
      await load();
    } catch (err) {
      showToast(isNotImplementedError(err) ? 'Раздел «Документы» пока в разработке на сервере.' : err.message);
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
      // Поля file_name/file_size_kb/uploaded_at/status подтверждены только
      // для mock-схемы (js/mock-api.js:443) — реальный ответ /api/v1/documents
      // не проверен (нет доступа к живому openapi.json), поэтому рендерим
      // защитно, с fallback вместо падения на отсутствующем поле.
      const ext = doc.file_name ? doc.file_name.split('.').pop().slice(0, 3).toUpperCase() : '📄';
      listEl.appendChild(
        h('div', { class: 'data-card' }, [
          h('div', { class: 'data-card__row' }, [
            h('div', { style: 'display:flex;align-items:center;gap:12px' }, [
              h('span', { class: 'doc-icon', 'aria-hidden': 'true' }, ext),
              h('span', { class: 'data-card__title' }, doc.title),
            ]),
            doc.status ? h('span', { class: `badge badge--${STATUS_BADGE[doc.status] || 'neutral'}` }, STATUS_LABEL[doc.status] || doc.status) : null,
          ]),
          h('div', { class: 'data-card__meta' }, [doc.category, doc.file_name, doc.file_size_kb != null ? `${doc.file_size_kb} КБ` : null].filter(Boolean).join(' · ')),
          doc.uploaded_at ? h('div', { class: 'data-card__meta' }, `Загружен: ${formatDateTime(doc.uploaded_at)}`) : null,
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
                  showToast(isNotImplementedError(err) ? 'Раздел «Документы» пока в разработке на сервере.' : err.message);
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
      const documents = await api.listDocuments();
      setFormDisabled(false);
      renderList(documents);
    } catch (err) {
      if (isNotImplementedError(err)) {
        setFormDisabled(true);
        renderNotImplementedState(listEl, { text: 'Документы и загрузка файлов пока не поддерживаются backend. Мы уже работаем над этим.' });
      } else {
        renderErrorState(listEl, { text: err.message, onRetry: load });
      }
    }
  }

  await load();
}
