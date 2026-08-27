import * as api from '../api.js';
import { h } from '../utils.js';
import { navigate } from '../router.js';
import { USE_MOCK_API } from '../config.js';

// Backend не задаёт формат телефона в схеме (только minLength=5, maxLength=50),
// поэтому это чисто клиентская защита от опечаток, а не правило из OpenAPI.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{5,50}$/;

export function renderAuth(container) {
  let mode = 'login'; // 'login' | 'register'
  let isSubmitting = false;
  // Переживают renderForm() (пересоздание DOM формы), в отличие от alertBox,
  // который каждый раз создаётся заново.
  let pendingAlert = null;
  let pendingEmail = null;

  function renderForm() {
    container.innerHTML = '';

    const alertBox = h('div', { class: 'alert alert--error hidden', role: 'alert' });

    function showAlert(message) {
      alertBox.textContent = message;
      alertBox.classList.remove('hidden');
    }
    function hideAlert() {
      alertBox.classList.add('hidden');
      alertBox.textContent = '';
    }

    // ---- поля ----
    const emailInput = h('input', {
      id: 'auth-email',
      type: 'email',
      name: 'email',
      class: 'input',
      required: true,
      autocomplete: 'email',
      'aria-describedby': 'auth-email-error',
    });
    const emailError = h('span', { id: 'auth-email-error', class: 'field__error', role: 'alert' });

    const passwordInput = h('input', {
      id: 'auth-password',
      type: 'password',
      name: 'password',
      class: 'input',
      required: true,
      autocomplete: mode === 'login' ? 'current-password' : 'new-password',
      'aria-describedby': 'auth-password-error',
    });
    const passwordError = h('span', { id: 'auth-password-error', class: 'field__error', role: 'alert' });
    let passwordVisible = false;
    const toggleVisibilityBtn = h(
      'button',
      {
        type: 'button',
        class: 'input-group__toggle',
        'aria-label': 'Показать пароль',
        'aria-pressed': 'false',
        onClick: () => {
          passwordVisible = !passwordVisible;
          passwordInput.type = passwordVisible ? 'text' : 'password';
          toggleVisibilityBtn.textContent = passwordVisible ? '🙈' : '👁';
          toggleVisibilityBtn.setAttribute('aria-label', passwordVisible ? 'Скрыть пароль' : 'Показать пароль');
          toggleVisibilityBtn.setAttribute('aria-pressed', String(passwordVisible));
        },
      },
      '👁'
    );

    const businessNameInput = h('input', {
      id: 'auth-business-name',
      type: 'text',
      name: 'business_name',
      class: 'input',
      'aria-describedby': 'auth-business-name-error',
    });
    const businessNameError = h('span', { id: 'auth-business-name-error', class: 'field__error', role: 'alert' });

    const businessPhoneInput = h('input', {
      id: 'auth-business-phone',
      type: 'tel',
      name: 'business_phone_number',
      class: 'input',
      autocomplete: 'tel',
      'aria-describedby': 'auth-business-phone-error',
    });
    const businessPhoneError = h('span', { id: 'auth-business-phone-error', class: 'field__error', role: 'alert' });

    function setFieldError(input, errorEl, message) {
      errorEl.textContent = message || '';
      input.classList.toggle('input--error', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    // ---- валидация ----
    function validate() {
      let firstInvalid = null;
      hideAlert();

      const email = emailInput.value.trim();
      if (!email) {
        setFieldError(emailInput, emailError, 'Укажите email.');
        firstInvalid = firstInvalid || emailInput;
      } else if (!EMAIL_RE.test(email)) {
        setFieldError(emailInput, emailError, 'Похоже, email указан некорректно.');
        firstInvalid = firstInvalid || emailInput;
      } else {
        setFieldError(emailInput, emailError, '');
      }

      const password = passwordInput.value;
      if (!password) {
        setFieldError(passwordInput, passwordError, 'Укажите пароль.');
        firstInvalid = firstInvalid || passwordInput;
      } else if (mode === 'register' && password.length < 8) {
        setFieldError(passwordInput, passwordError, 'Минимум 8 символов.');
        firstInvalid = firstInvalid || passwordInput;
      } else {
        setFieldError(passwordInput, passwordError, '');
      }

      if (mode === 'register') {
        const businessName = businessNameInput.value.trim();
        if (!businessName) {
          setFieldError(businessNameInput, businessNameError, 'Укажите название бизнеса.');
          firstInvalid = firstInvalid || businessNameInput;
        } else {
          setFieldError(businessNameInput, businessNameError, '');
        }

        const phone = businessPhoneInput.value.trim();
        if (!phone) {
          setFieldError(businessPhoneInput, businessPhoneError, 'Укажите телефон бизнеса.');
          firstInvalid = firstInvalid || businessPhoneInput;
        } else if (!PHONE_RE.test(phone) || phone.replace(/\D/g, '').length < 5) {
          setFieldError(businessPhoneInput, businessPhoneError, 'Похоже, телефон указан некорректно.');
          firstInvalid = firstInvalid || businessPhoneInput;
        } else {
          setFieldError(businessPhoneInput, businessPhoneError, '');
        }
      }

      return !firstInvalid;
    }

    // ---- сборка формы ----
    const passwordFieldChildren = [
      h('label', { class: 'field__label', for: 'auth-password' }, 'Пароль'),
      h('div', { class: 'input-group' }, [passwordInput, toggleVisibilityBtn]),
      mode === 'register' ? h('span', { class: 'field__hint' }, 'Минимум 8 символов') : null,
      passwordError,
    ];

    const fields = [
      h('div', { class: 'field' }, [h('label', { class: 'field__label', for: 'auth-email' }, 'Email'), emailInput, emailError]),
      h('div', { class: 'field' }, passwordFieldChildren),
    ];
    if (mode === 'register') {
      fields.push(
        h('div', { class: 'field' }, [
          h('label', { class: 'field__label', for: 'auth-business-name' }, 'Название бизнеса'),
          businessNameInput,
          businessNameError,
        ]),
        h('div', { class: 'field' }, [
          h('label', { class: 'field__label', for: 'auth-business-phone' }, 'Телефон бизнеса'),
          businessPhoneInput,
          businessPhoneError,
        ])
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

    const form = h('form', { class: 'form-grid', novalidate: true }, [alertBox, ...fields, h('div', { class: 'form-actions' }, [submitBtn])]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return; // защита от повторной отправки (двойной Enter/клик)
      if (!validate()) return;

      isSubmitting = true;
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = mode === 'login' ? 'Входим...' : 'Регистрируем...';

      try {
        if (mode === 'login') {
          await api.login({ email: emailInput.value.trim(), password: passwordInput.value });
          navigate('#/bookings');
          return;
        }

        const response = await api.register({
          email: emailInput.value.trim(),
          password: passwordInput.value,
          business_name: businessNameInput.value.trim(),
          business_phone_number: businessPhoneInput.value.trim(),
        });

        // Не считаем, что access_token обязательно пришёл — обрабатываем
        // фактический ответ, а не то, что "должно" быть по схеме.
        if (response && response.access_token) {
          api.session.saveSession(response);
          navigate('#/bookings');
        } else {
          pendingEmail = emailInput.value.trim();
          pendingAlert = 'Регистрация прошла успешно. Войдите с указанными email и паролем.';
          mode = 'login';
          renderForm();
        }
      } catch (err) {
        showAlert(err.message || 'Не удалось выполнить операцию. Попробуйте ещё раз.');
      } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });

    const card = h('div', { class: 'auth-card' }, [
      h('div', { class: 'auth-card__logo', 'aria-hidden': 'true' }, 'S'),
      h('h1', { class: 'auth-card__title' }, mode === 'login' ? 'Вход в кабинет' : 'Регистрация бизнеса'),
      h('p', { class: 'auth-card__subtitle' }, 'Панель управления бьюти-салоном'),
      USE_MOCK_API
        ? h('div', { class: 'mock-banner' }, [
            h('span', { 'aria-hidden': 'true' }, '🧪'),
            h('span', {}, 'Backend недоступен — работает mock-режим. Демо-вход: demo@salon.test / demo12345'),
          ])
        : null,
      form,
      h('div', { class: 'auth-card__switch' }, [switchBtn]),
    ]);

    container.appendChild(h('div', { class: 'auth-page' }, [card]));

    if (pendingAlert) {
      showAlert(pendingAlert);
      pendingAlert = null;
    }
    if (pendingEmail) {
      emailInput.value = pendingEmail;
      pendingEmail = null;
    }

    if (emailInput.value) {
      passwordInput.focus();
    } else {
      emailInput.focus();
    }
  }

  renderForm();
}
