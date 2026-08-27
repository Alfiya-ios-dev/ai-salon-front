import * as api from '../api.js';
import { h, showToast, renderSkeletonCards, renderErrorState, formatDateTime } from '../utils.js';

export async function renderPrompts(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Sales-промпты бота'), h('p', {}, 'Как бот ведёт диалог и продаёт услуги')]),
    ])
  );

  const bodyEl = h('div', {});
  container.appendChild(bodyEl);

  async function load() {
    renderSkeletonCards(bodyEl, 3);
    try {
      const data = await api.getPrompts();
      renderForm(data);
    } catch (err) {
      renderErrorState(bodyEl, { text: err.message, onRetry: load });
    }
  }

  function renderForm(data) {
    bodyEl.innerHTML = '';

    const systemPromptInput = h('textarea', { id: 'prompt-system', class: 'textarea prompt-field', required: true });
    systemPromptInput.value = data.system_prompt;
    const upsellInput = h('textarea', { id: 'prompt-upsell', class: 'textarea prompt-field' });
    upsellInput.value = data.upsell_scripts;
    const objectionInput = h('textarea', { id: 'prompt-objection', class: 'textarea prompt-field' });
    objectionInput.value = data.objection_handling;

    const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Сохранить');

    const form = h('form', { class: 'form-grid', novalidate: true }, [
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'prompt-system' }, 'Системный промпт'), systemPromptInput]),
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'prompt-upsell' }, 'Скрипты допродаж'), upsellInput]),
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'prompt-objection' }, 'Работа с возражениями'), objectionInput]),
      h('div', { class: 'form-actions' }, [submitBtn, h('span', { class: 'field__hint' }, `Обновлено: ${formatDateTime(data.updated_at)}`)]),
    ]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      try {
        const updated = await api.updatePrompts({
          system_prompt: systemPromptInput.value.trim(),
          upsell_scripts: upsellInput.value,
          objection_handling: objectionInput.value,
        });
        showToast('Промпты сохранены.', 'success');
        renderForm(updated);
      } catch (err) {
        showToast(err.message);
      } finally {
        submitBtn.disabled = false;
      }
    });

    bodyEl.appendChild(h('div', { class: 'card' }, [form]));
  }

  await load();
}
