import { isAuthenticated as sessionIsAuthenticated } from './session.js';
import * as api from './api.js';

const listeners = new Set();

// Дефолты — статичные тексты, которые были в UI до появления мульти-индустри
// терминологии. Пока /api/v1/business-info не ответил (или не содержит этих
// ключей), интерфейс выглядит так же, как раньше — ничего не "мигает" и не
// показывает пустые подписи.
export const DEFAULT_LABELS = {
  industry_type: null,
  staff_label_singular: 'Мастер',
  staff_label_plural: 'Мастера',
  service_label: 'Услуга',
};

const state = {
  tenantId: localStorage.getItem('salon_tenant_id') || null,
  businessName: localStorage.getItem('salon_business_name') || null,
  staff: [],
  services: [],
  bookings: [],
  labels: { ...DEFAULT_LABELS },
  labelsLoaded: false,
};

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isAuthenticated() {
  return sessionIsAuthenticated();
}

export function getLabels() {
  return state.labels;
}

// Метки хранятся в business-info как обычные key/value записи (та же модель,
// что address/phone/working_hours), поэтому читаем их через уже имеющийся
// api.listBusinessInfo() и вытаскиваем 4 известных ключа, а не через
// отдельный "плоский" эндпоинт.
export async function loadBusinessLabels() {
  try {
    const items = await api.listBusinessInfo();
    const map = new Map(items.map((item) => [item.key, item.value]));
    setState({
      labels: {
        industry_type: map.get('industry_type') ?? DEFAULT_LABELS.industry_type,
        staff_label_singular: map.get('staff_label_singular') || DEFAULT_LABELS.staff_label_singular,
        staff_label_plural: map.get('staff_label_plural') || DEFAULT_LABELS.staff_label_plural,
        service_label: map.get('service_label') || DEFAULT_LABELS.service_label,
      },
      labelsLoaded: true,
    });
  } catch {
    // Тихий fallback на дефолтные подписи — отсутствие меток не должно
    // мешать работе остального приложения.
    setState({ labelsLoaded: true });
  }
}

// Общий сброс сессии: и для истечения токена (событие auth:expired), и для
// ручного выхода из main.js — иначе после logout/login под другим бизнесом
// labelsLoaded остался бы true и метки прежнего тенанта "прилипли" бы к меню.
export function resetSessionState() {
  setState({
    tenantId: null,
    businessName: null,
    staff: [],
    services: [],
    bookings: [],
    labels: { ...DEFAULT_LABELS },
    labelsLoaded: false,
  });
}

window.addEventListener('auth:expired', resetSessionState);
