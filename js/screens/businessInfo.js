import * as api from '../api.js';
import { h, showToast, confirmModal, renderSkeletonCards, renderEmptyState, renderErrorState } from '../utils.js';

export async function renderBusinessInfo(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'О бизнесе'), h('p', {}, 'Ключ-значение: адрес, телефон, часы работы и т.д.')]),
    ])
  );

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
    const rows = items.map((item) =>
      h('tr', {}, [
        h('td', {}, h('code', {}, item.key)),
        h('td', {}, item.value),
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
