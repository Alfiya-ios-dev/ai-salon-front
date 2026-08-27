import * as api from '../api.js';
import { h, showToast, renderSkeletonCards, renderEmptyState, renderErrorState } from '../utils.js';
import { getState, setState } from '../state.js';
import { navigate } from '../router.js';

export async function renderStaff(container) {
  container.appendChild(
    h('div', { class: 'page-header' }, [
      h('div', { class: 'page-header__text' }, [h('h1', {}, 'Мастера'), h('p', {}, 'Сотрудники и услуги, которые они выполняют')]),
    ])
  );

  const formCard = h('div', { class: 'card' }, [h('h2', { class: 'section-title', style: 'margin-top:0' }, 'Новый сотрудник')]);
  const listEl = h('div', { class: 'data-list' });
  container.appendChild(formCard);
  container.appendChild(listEl);

  function renderForm() {
    const nameInput = h('input', { id: 'staff-name', type: 'text', class: 'input', required: true });
    const roleInput = h('input', { id: 'staff-role', type: 'text', class: 'input', required: true, placeholder: 'например, Мастер по волосам' });
    const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Добавить сотрудника');

    const form = h('form', { class: 'form-grid form-grid--2col', novalidate: true }, [
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'staff-name' }, 'Имя'), nameInput]),
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'staff-role' }, 'Роль'), roleInput]),
      h('div', { class: 'form-actions', style: 'grid-column: 1 / -1' }, [submitBtn]),
    ]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      try {
        await api.createStaff({ name: nameInput.value.trim(), role: roleInput.value.trim() });
        showToast('Сотрудник добавлен.', 'success');
        await load();
      } catch (err) {
        showToast(err.message);
      } finally {
        submitBtn.disabled = false;
      }
    });

    while (formCard.children.length > 1) formCard.removeChild(formCard.lastChild);
    formCard.appendChild(form);
  }

  function renderList() {
    const { staff, services } = getState();
    listEl.innerHTML = '';
    if (!staff.length) {
      renderEmptyState(listEl, { icon: '🧑‍💼', title: 'Сотрудников пока нет', text: 'Добавьте первого мастера формой выше.' });
      return;
    }

    staff.forEach((member) => {
      const assignedIds = new Set(member.service_ids ?? []);

      const activeSwitch = h('label', { class: 'switch' }, [
        h('span', { class: 'switch__control' }, [
          h('input', {
            type: 'checkbox',
            checked: !!member.is_active,
            'aria-label': `Активность сотрудника ${member.name}`,
            onChange: async (e) => {
              const is_active = e.target.checked;
              try {
                const updated = await api.updateStaff(member.id, { is_active });
                setState({ staff: getState().staff.map((s) => (s.id === member.id ? { ...s, ...updated } : s)) });
                showToast(is_active ? 'Сотрудник активен.' : 'Сотрудник деактивирован.', 'success');
              } catch (err) {
                e.target.checked = !is_active;
                showToast(err.message);
              }
            },
          }),
          h('span', { class: 'switch__track', 'aria-hidden': 'true' }),
        ]),
        member.is_active ? 'Активен' : 'Отключён',
      ]);

      const servicesList = h('div', { class: 'chip-list' });
      if (!services.length) {
        servicesList.appendChild(h('span', { class: 'field__hint' }, 'Нет доступных услуг.'));
      } else {
        services.forEach((service) => {
          const checked = assignedIds.has(service.id);
          const inputId = `assign-${member.id}-${service.id}`;
          const chip = h(
            'label',
            { class: `chip ${checked ? 'chip--active' : ''}`, for: inputId },
            [
              h('input', {
                id: inputId,
                type: 'checkbox',
                checked,
                onChange: async (e) => {
                  const wantAssigned = e.target.checked;
                  try {
                    if (wantAssigned) {
                      await api.assignServiceToStaff(member.id, service.id);
                    } else {
                      await api.unassignServiceFromStaff(member.id, service.id);
                    }
                    const nextIds = wantAssigned
                      ? [...assignedIds, service.id]
                      : [...assignedIds].filter((id) => id !== service.id);
                    setState({
                      staff: getState().staff.map((s) => (s.id === member.id ? { ...s, service_ids: nextIds } : s)),
                    });
                    renderList();
                  } catch (err) {
                    e.target.checked = !wantAssigned;
                    showToast(err.message);
                  }
                },
              }),
              service.name,
            ]
          );
          servicesList.appendChild(chip);
        });
      }

      listEl.appendChild(
        h('div', { class: 'data-card' }, [
          h('div', { class: 'data-card__row' }, [
            h('span', { class: 'data-card__title' }, `${member.name}`),
            h('span', { class: 'badge badge--neutral' }, member.role),
          ]),
          activeSwitch,
          h('div', { class: 'field__label' }, 'Услуги'),
          servicesList,
          h('div', { class: 'data-card__actions' }, [
            h('button', { class: 'btn btn--small btn--secondary', onClick: () => navigate(`#/staff/${member.id}/schedule`) }, 'Расписание'),
          ]),
        ])
      );
    });
  }

  async function load() {
    renderSkeletonCards(listEl, 3);
    try {
      const [staff, services] = await Promise.all([api.listStaff(), api.listServices()]);
      setState({ staff, services });
      renderForm();
      renderList();
    } catch (err) {
      renderErrorState(listEl, { text: err.message, onRetry: load });
    }
  }

  renderForm();
  await load();
}
