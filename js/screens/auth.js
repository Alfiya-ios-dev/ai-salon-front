import * as api from '../api.js';
import { h, showToast } from '../utils.js';
import { navigate } from '../router.js';
import { USE_MOCK_API } from '../config.js';

export function renderAuth(container) {
  let mode = 'login';

  function renderForm() {
    container.innerHTML = '';

    const emailInput = h('input', { id: 'auth-email', type: 'email', name: 'email', class: 'input', required: true, autocomplete: 'email' });
    const passwordInput = h('input', { id: 'auth-password', type: 'password', name: 'password', class: 'input', required: true, autocomplete: mode === 'login' ? 'current-password' : 'new-password' });
    const businessNameInput = h('input', { id: 'auth-business-name', type: 'text', name: 'business_name', class: 'input' });
    const businessPhoneInput = h('input', { id: 'auth-business-phone', type: 'tel', name: 'business_phone_number', class: 'input' });

    const fields = [
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'auth-email' }, 'Email'), emailInput]),
      h('div', { class: 'field' }, [
        h('label', { class: 'field__label', for: 'auth-password' }, 'Пароль'),
        passwordInput,
        mode === 'register' ? h('span', { class: 'field__hint' }, 'Минимум 8 символов') : null,
      ]),
    ];
    if (mode === 'register') {
      fields.push(
        h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'auth-business-name' }, 'Название бизнеса'), businessNameInput]),
        h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'auth-business-phone' }, 'Телефон бизнеса'), businessPhoneInput])
      );
    }

    const submitBtn = h('button', { type: 'submit', class: 'btn btn--primary btn--block' }, mode === 'login' ? 'Войти' : 'Зарегистрироваться');

    const switchBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn--link',
        onClick: () => {
          mode = mode === 'login' ? 'register' : 'login';
          renderForm();
        },
      },
      mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'
    );

    const form = h('form', { class: 'form-grid', novalidate: true }, [...fields, h('div', { class: 'form-actions' }, [submitBtn])]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Подождите...';
      try {
        if (mode === 'login') {
          await api.login({ email: emailInput.value, password: passwordInput.value });
        } else {
          await api.register({
            email: emailInput.value,
            password: passwordInput.value,
            business_name: businessNameInput.value,
            business_phone_number: businessPhoneInput.value,
          });
        }
        navigate('#/bookings');
      } catch (err) {
        showToast(err.message || 'Не удалось выполнить операцию.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
      }
    });

    const card = h('div', { class: 'auth-card' }, [
      h('div', { class: 'auth-card__logo', 'aria-hidden': 'true' }, 'S'),
      h('h1', { class: 'auth-card__title' }, mode === 'login' ? 'Вход в кабинет' : 'Регистрация бизнеса'),
      h('p', { class: 'auth-card__subtitle' }, 'Панель управления бьюти-салоном'),
      USE_MOCK_API
        ? h('div', { class: 'mock-banner' }, [
            h('span', { 'aria-hidden': 'true' }, '🧪'),
            h('span', {}, 'Backend временно недоступен — работает mock-режим. Демо-вход: demo@salon.test / demo12345'),
          ])
        : null,
      form,
      h('div', { class: 'auth-card__switch' }, [switchBtn]),
    ]);

    container.appendChild(h('div', { class: 'auth-page' }, [card]));
  }

  renderForm();
}
