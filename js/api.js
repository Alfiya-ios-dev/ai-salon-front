// Единая точка входа для всех экранов. Сами страницы (js/screens/*) всегда
// импортируют только этот файл и не знают, обслуживает ли их реальный
// backend или js/mock-api.js — переключение централизовано здесь, через
// USE_MOCK_API из js/config.js.
import { BASE_URL, USE_MOCK_API } from './config.js';
import { ApiError, getToken, saveSession, clearSession, handleUnauthorized } from './session.js';
import * as mock from './mock-api.js';

const FALLBACK_MESSAGES = {
  400: 'Некорректный запрос.',
  401: 'Сессия истекла, авторизуйтесь заново.',
  403: 'Доступ запрещён.',
  404: 'Не найдено.',
  409: 'Конфликт данных.',
  422: 'Ошибка валидации данных.',
  500: 'Ошибка сервера. Попробуйте позже.',
};

function buildQuery(params) {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.set(key, value);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

async function request(path, { method = 'GET', body, query, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Нет соединения с сервером. Проверьте интернет.', 0, null);
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : FALLBACK_MESSAGES[response.status] || `Ошибка запроса (${response.status}).`;

    if (response.status === 401) {
      handleUnauthorized();
    }

    throw new ApiError(message, response.status, data);
  }

  return data;
}

// ---- Реальные реализации (используются, когда USE_MOCK_API === false) ----

function realRegister({ email, password, business_name, business_phone_number }) {
  return request('/api/v1/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, business_name, business_phone_number },
  }).then((data) => {
    saveSession(data);
    return data;
  });
}

function realLogin({ email, password }) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  }).then((data) => {
    saveSession(data);
    return data;
  });
}

function realListBookings({ status, dialog_id, staff_id } = {}) {
  return request('/api/v1/bookings', { query: { status, dialog_id, staff_id } });
}
function realGetBooking(bookingId) {
  return request(`/api/v1/bookings/${bookingId}`);
}
function realCreateBooking(payload) {
  return request('/api/v1/bookings', { method: 'POST', body: payload });
}
function realUpdateBookingStatus(bookingId, status) {
  return request(`/api/v1/bookings/${bookingId}`, { method: 'PATCH', body: { status } });
}

function realListServices() {
  return request('/api/v1/services');
}
function realCreateService(payload) {
  return request('/api/v1/services', { method: 'POST', body: payload });
}
function realDeleteService(serviceId) {
  return request(`/api/v1/services/${serviceId}`, { method: 'DELETE' });
}

function realListStaff() {
  return request('/api/v1/staff');
}
function realCreateStaff(payload) {
  return request('/api/v1/staff', { method: 'POST', body: payload });
}
function realUpdateStaff(staffId, payload) {
  return request(`/api/v1/staff/${staffId}`, { method: 'PATCH', body: payload });
}
function realAssignServiceToStaff(staffId, serviceId) {
  return request(`/api/v1/staff/${staffId}/services/${serviceId}`, { method: 'POST' });
}
function realUnassignServiceFromStaff(staffId, serviceId) {
  return request(`/api/v1/staff/${staffId}/services/${serviceId}`, { method: 'DELETE' });
}

function realListStaffSchedule(staffId) {
  return request(`/api/v1/staff/${staffId}/schedule`);
}
function realCreateStaffScheduleDay(staffId, payload) {
  return request(`/api/v1/staff/${staffId}/schedule`, { method: 'POST', body: payload });
}
function realDeleteStaffScheduleDay(staffId, scheduleId) {
  return request(`/api/v1/staff/${staffId}/schedule/${scheduleId}`, { method: 'DELETE' });
}

function realGetAvailableSlots({ service_id, date, staff_id } = {}) {
  return request('/api/v1/slots/available', { query: { service_id, date, staff_id } });
}

function realGetPrompts() {
  return request('/api/v1/prompts');
}
function realUpdatePrompts(payload) {
  return request('/api/v1/prompts', { method: 'PUT', body: payload });
}

function realListBusinessInfo() {
  return request('/api/v1/business-info');
}
function realCreateBusinessInfo(payload) {
  return request('/api/v1/business-info', { method: 'POST', body: payload });
}
function realGetBusinessInfo(key) {
  return request(`/api/v1/business-info/${encodeURIComponent(key)}`);
}
function realUpsertBusinessInfo(key, value) {
  return request(`/api/v1/business-info/${encodeURIComponent(key)}`, { method: 'PUT', body: { value } });
}
function realDeleteBusinessInfo(key) {
  return request(`/api/v1/business-info/${encodeURIComponent(key)}`, { method: 'DELETE' });
}

// ---- Переключатель real/mock ----

function pick(realFn, mockFn) {
  return (...args) => (USE_MOCK_API ? mockFn(...args) : realFn(...args));
}

// Функции без реального backend-эндпоинта (см. комментарий в mock-api.js).
// В реальном режиме явно сообщают, что бэкенд их не поддерживает, а не
// притворяются, что запрос ушёл.
function notImplementedOnBackend(name) {
  return () => {
    throw new ApiError(
      `«${name}» — экспериментальная функция без эндпоинта в реальном backend. Доступна только в mock-режиме.`,
      501,
      null
    );
  };
}

// ---- Auth ----
export const register = pick(realRegister, mock.register);
export const login = pick(realLogin, mock.login);
export function logout() {
  clearSession();
}

// ---- Bookings ----
export const listBookings = pick(realListBookings, mock.listBookings);
export const getBooking = pick(realGetBooking, mock.getBooking);
export const createBooking = pick(realCreateBooking, mock.createBooking);
export const updateBookingStatus = pick(realUpdateBookingStatus, mock.updateBookingStatus);

// ---- Services ----
export const listServices = pick(realListServices, mock.listServices);
export const createService = pick(realCreateService, mock.createService);
export const deleteService = pick(realDeleteService, mock.deleteService);

// ---- Staff ----
export const listStaff = pick(realListStaff, mock.listStaff);
export const createStaff = pick(realCreateStaff, mock.createStaff);
export const updateStaff = pick(realUpdateStaff, mock.updateStaff);
export const assignServiceToStaff = pick(realAssignServiceToStaff, mock.assignServiceToStaff);
export const unassignServiceFromStaff = pick(realUnassignServiceFromStaff, mock.unassignServiceFromStaff);

// ---- Staff schedule ----
export const listStaffSchedule = pick(realListStaffSchedule, mock.listStaffSchedule);
export const createStaffScheduleDay = pick(realCreateStaffScheduleDay, mock.createStaffScheduleDay);
export const deleteStaffScheduleDay = pick(realDeleteStaffScheduleDay, mock.deleteStaffScheduleDay);

// ---- Slots ----
export const getAvailableSlots = pick(realGetAvailableSlots, mock.getAvailableSlots);

// ---- Sales prompts ----
export const getPrompts = pick(realGetPrompts, mock.getPrompts);
export const updatePrompts = pick(realUpdatePrompts, mock.updatePrompts);

// ---- Business info ----
export const listBusinessInfo = pick(realListBusinessInfo, mock.listBusinessInfo);
export const createBusinessInfo = pick(realCreateBusinessInfo, mock.createBusinessInfo);
export const getBusinessInfo = pick(realGetBusinessInfo, mock.getBusinessInfo);
export const upsertBusinessInfo = pick(realUpsertBusinessInfo, mock.upsertBusinessInfo);
export const deleteBusinessInfo = pick(realDeleteBusinessInfo, mock.deleteBusinessInfo);

// ---- Экспериментальные сущности: только mock, нет реального backend ----
export const listDocuments = pick(notImplementedOnBackend('listDocuments'), mock.listDocuments);
export const createDocument = pick(notImplementedOnBackend('createDocument'), mock.createDocument);
export const deleteDocument = pick(notImplementedOnBackend('deleteDocument'), mock.deleteDocument);

export const listStopCategories = pick(notImplementedOnBackend('listStopCategories'), mock.listStopCategories);
export const createStopCategory = pick(notImplementedOnBackend('createStopCategory'), mock.createStopCategory);
export const updateStopCategory = pick(notImplementedOnBackend('updateStopCategory'), mock.updateStopCategory);
export const deleteStopCategory = pick(notImplementedOnBackend('deleteStopCategory'), mock.deleteStopCategory);

export const listManagers = pick(notImplementedOnBackend('listManagers'), mock.listManagers);
export const createManager = pick(notImplementedOnBackend('createManager'), mock.createManager);
export const updateManager = pick(notImplementedOnBackend('updateManager'), mock.updateManager);
export const deleteManager = pick(notImplementedOnBackend('deleteManager'), mock.deleteManager);

export const session = { getToken, saveSession, clearSession };
