import * as api from '../api.js';
import { h, showToast, confirmModal, renderSkeletonCards, renderEmptyState, renderErrorState } from '../utils.js';
import { DEFAULT_LABELS, loadBusinessLabels } from '../state.js';

// Метки читаются как обычные business-info key/value записи (та же модель,
// что address/phone/working_hours — см. js/mock-api.js:104), но сохраняются
// одним атомарным PUT /api/v1/business-info (api.updateTenantSettings) —
// выделенный bulk-эндпоинт под именно эти 4 поля, см. TenantSettingsUpdate
// в openapi.json. Так все 4 метки уходят/применяются одним запросом, а не
// 4 отдельными PUT /business-info/{key}.
const LABEL_FIELDS = [
  { key: 'industry_type', label: 'Тип индустрии', hint: 'Например: beauty, auto_service, medical' },
  { key: 'staff_label_singular', label: 'Сотрудник (ед. число)', hint: 'Например: Мастер, Автомеханик, Врач' },
  { key: 'staff_label_plural', label: 'Сотрудники (мн. число)', hint: 'Например: Мастера, Автомеханики, Врачи' },
  { key: 'service_label', label: 'Услуга', hint: 'Например: Услуга, Ремонт, Приём' },
];

export async function renderBusinessInfo(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'О бизнесе'), h('p', {}, 'Терминология для мульти-индустри интерфейса и произвольные данные (адрес, телефон и т.д.)')]),
    ])
  );

  // ---- Терминология (industry_type, staff_label_*, service_label) ----
  const labelInputs = {};
  const termFields = LABEL_FIELDS.map(({ key, label, hint }) => {
    const input = h('input', { id: `binfo-label-${key}`, type: 'text', class: 'input', value: DEFAULT_LABELS[key] ?? '' });
    labelInputs[key] = input;
    return h('div', { class: 'field' }, [
      h('label', { class: 'field__label', for: `binfo-label-${key}` }, label),
      input,
      h('span', { class: 'field__hint' }, hint),
    ]);
  });
  const termSubmitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Сохранить терминологию');
  const termForm = h('form', { class: 'form-grid form-grid--2col', novalidate: true }, [
    ...termFields,
    h('div', { class: 'form-actions', style: 'grid-column: 1 / -1' }, [termSubmitBtn]),
  ]);
  container.appendChild(
    h('div', { class: 'card' }, [
      h('h2', { class: 'section-title', style: 'margin-top:0' }, 'Терминология'),
      h('p', { class: 'field__hint' }, 'Эти подписи используются в меню и формах вместо жёстко заданных "Мастера"/"Услуга".'),
      termForm,
    ])
  );

  function fillTerminologyForm(items) {
    const map = new Map(items.map((item) => [item.key, item.value]));
    LABEL_FIELDS.forEach(({ key }) => {
      labelInputs[key].value = map.get(key) ?? DEFAULT_LABELS[key] ?? '';
    });
  }

  termForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    termSubmitBtn.disabled = true;
    try {
      const payload = Object.fromEntries(
        LABEL_FIELDS.map(({ key }) => [key, labelInputs[key].value.trim()]).filter(([, value]) => value !== '')
      );
      await api.updateTenantSettings(payload);
      showToast('Терминология обновлена.', 'success');
      await loadBusinessLabels();
      await load();
    } catch (err) {
      showToast(err.message);
    } finally {
      termSubmitBtn.disabled = false;
    }
  });

  // ---- Произвольные записи business-info (ключ-значение) ----
  const keyInput = h('input', { id: 'binfo-key', type: 'text', class: 'input', required: true, maxlength: '100' });
  const valueInput = h('input', { id: 'binfo-value', type: 'text', class: 'input', required: true });
  const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Сохранить');
  const form = h('form', { class: 'form-grid form-grid--2col', novalidate: true }, [
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'binfo-key' }, 'Ключ'), keyInput, h('span', { class: 'field__hint' }, 'Например: address, phone, working_hours')]),
    h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'binfo-value' }, 'Значение'), valueInput]),
    h('div', { class: 'form-actions', style: 'grid-column: 1 / -1' }, [submitBtn]),
  ]);

  const listEl = h('div', {});
  container.appendChild(h('div', { class: 'card' }, [h('h2', { class: 'section-title', style: 'margin-top:0' }, 'Добавить / обновить (upsert)'), form]));
  container.appendChild(listEl);

  async function load() {
    renderSkeletonCards(listEl, 3);
    try {
      const items = await api.listBusinessInfo();
      fillTerminologyForm(items);
      renderList(items);
    } catch (err) {
      renderErrorState(listEl, { text: err.message, onRetry: load });
    }
  }

  function renderList(items) {
    listEl.innerHTML = '';
    if (!items.length) {
      renderEmptyState(listEl, { icon: '🏢', title: 'Данные не заданы' });
      return;
    }
    const tableWrap = h('div', { class: 'table-wrap' });
    // data-label — подпись для мобильной карточной раскладки .table (см.
    // components.css); должна совпадать с текстом соответствующего <th>.
    const rows = items.map((item) =>
      h('tr', {}, [
        h('td', { 'data-label': 'Ключ' }, h('code', {}, item.key)),
        h('td', { 'data-label': 'Значение' }, item.value),
        h('td', {}, [
          h('button', {
            class: 'btn btn--small btn--secondary',
            onClick: () => { keyInput.value = item.key; valueInput.value = item.value; window.scrollTo({ top: 0, behavior: 'smooth' }); },
          }, 'Изменить'),
          h('button', {
            class: 'btn btn--small btn--danger',
            onClick: async () => {
              const ok = await confirmModal(`Удалить «${item.key}»?`, { title: 'Удалить запись', confirmLabel: 'Удалить', danger: true });
              if (!ok) return;
              try {
                await api.deleteBusinessInfo(item.key);
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
        h('thead', {}, [h('tr', {}, [h('th', { scope: 'col' }, 'Ключ'), h('th', { scope: 'col' }, 'Значение'), h('th', { scope: 'col' }, '')])]),
        h('tbody', {}, rows),
      ])
    );
    listEl.appendChild(tableWrap);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    try {
      await api.upsertBusinessInfo(keyInput.value.trim(), valueInput.value.trim());
      showToast('Сохранено.', 'success');
      form.reset();
      await load();
    } catch (err) {
      showToast(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  await load();
}
