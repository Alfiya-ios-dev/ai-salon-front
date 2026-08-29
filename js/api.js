// Единая точка входа для всех экранов. Сами страницы (js/screens/*) всегда
// импортируют только этот файл и не знают, обслуживает ли их реальный
// backend или js/mock-api.js — переключение централизовано здесь, через
// USE_MOCK_API из js/config.js.
import { BASE_URL, USE_MOCK_API, REQUEST_TIMEOUT_MS } from './config.js';
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

// FastAPI отдаёт ошибки в двух формах:
//  - {"detail": "строка"}                          — обычный HTTPException (401/403/404/...)
//  - {"detail": [{"loc":[...], "msg":"...", ...}]}  — 422 Validation Error, detail это МАССИВ
// (см. схемы HTTPValidationError/ValidationError в openapi.json). Обе формы
// нужно разбирать явно, иначе 422 покажет пользователю "[object Object]".
function parseErrorMessage(status, data) {
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) {
    const parts = data.detail.map((item) => {
      const field = Array.isArray(item.loc) ? item.loc.filter((p) => p !== 'body').join('.') : '';
      return field ? `${field}: ${item.msg}` : item.msg;
    });
    if (parts.length) return parts.join('; ');
  }
  return FALLBACK_MESSAGES[status] || `Ошибка запроса (${status}).`;
}

/**
 * Базовый API-клиент. Все именованные функции ниже (login, listServices, ...)
 * построены на нём — экраны им пользуются напрямую только в исключительных
 * случаях (например, если понадобится вызвать ещё не обёрнутый эндпоинт).
 *
 * options:
 *   method   — HTTP-метод, по умолчанию GET
 *   body     — объект (уйдёт как JSON) или FormData (уйдёт как multipart,
 *              Content-Type для него нельзя выставлять руками — это делает браузер)
 *   query    — объект query-параметров, пустые/undefined/null отбрасываются
 *   auth     — добавлять ли Authorization: Bearer <token> (по умолчанию true)
 *   timeoutMs— переопределить таймаут запроса (по умолчанию REQUEST_TIMEOUT_MS)
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, query, auth = true, timeoutMs = REQUEST_TIMEOUT_MS } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers = {};
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Сервер не отвечает. Попробуйте ещё раз чуть позже.', 0, null);
    }
    throw new ApiError('Нет соединения с сервером. Проверьте интернет.', 0, null);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = parseErrorMessage(response.status, data);

    if (response.status === 401) {
      handleUnauthorized();
    }

    throw new ApiError(message, response.status, data);
  }

  return data;
}

// ---- Реальные реализации (используются, когда USE_MOCK_API === false) ----

function realRegister({ email, password, business_name, business_phone_number }) {
  return apiRequest('/api/v1/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, business_name, business_phone_number },
  });
}

function realLogin({ email, password }) {
  return apiRequest('/api/v1/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  }).then((data) => {
    saveSession(data);
    return data;
  });
}

function realListBookings({ status, dialog_id, staff_id } = {}) {
  return apiRequest('/api/v1/bookings', { query: { status, dialog_id, staff_id } });
}
function realGetBooking(bookingId) {
  return apiRequest(`/api/v1/bookings/${bookingId}`);
}
function realCreateBooking(payload) {
  return apiRequest('/api/v1/bookings', { method: 'POST', body: payload });
}
function realUpdateBookingStatus(bookingId, status) {
  return apiRequest(`/api/v1/bookings/${bookingId}`, { method: 'PATCH', body: { status } });
}

function realListServices() {
  return apiRequest('/api/v1/services');
}
function realCreateService(payload) {
  return apiRequest('/api/v1/services', { method: 'POST', body: payload });
}
function realDeleteService(serviceId) {
  return apiRequest(`/api/v1/services/${serviceId}`, { method: 'DELETE' });
}

function realListStaff() {
  return apiRequest('/api/v1/staff');
}
function realCreateStaff(payload) {
  return apiRequest('/api/v1/staff', { method: 'POST', body: payload });
}
function realUpdateStaff(staffId, payload) {
  return apiRequest(`/api/v1/staff/${staffId}`, { method: 'PATCH', body: payload });
}
function realAssignServiceToStaff(staffId, serviceId) {
  return apiRequest(`/api/v1/staff/${staffId}/services/${serviceId}`, { method: 'POST' });
}
function realUnassignServiceFromStaff(staffId, serviceId) {
  return apiRequest(`/api/v1/staff/${staffId}/services/${serviceId}`, { method: 'DELETE' });
}

function realListStaffSchedule(staffId) {
  return apiRequest(`/api/v1/staff/${staffId}/schedule`);
}
function realCreateStaffScheduleDay(staffId, payload) {
  return apiRequest(`/api/v1/staff/${staffId}/schedule`, { method: 'POST', body: payload });
}
function realDeleteStaffScheduleDay(staffId, scheduleId) {
  return apiRequest(`/api/v1/staff/${staffId}/schedule/${scheduleId}`, { method: 'DELETE' });
}

function realGetAvailableSlots({ service_id, date, staff_id } = {}) {
  return apiRequest('/api/v1/slots/available', { query: { service_id, date, staff_id } });
}

function realGetPrompts() {
  return apiRequest('/api/v1/prompts');
}
function realUpdatePrompts(payload) {
  return apiRequest('/api/v1/prompts', { method: 'PUT', body: payload });
}

function realListBusinessInfo() {
  return apiRequest('/api/v1/business-info');
}
function realCreateBusinessInfo(payload) {
  return apiRequest('/api/v1/business-info', { method: 'POST', body: payload });
}
function realGetBusinessInfo(key) {
  return apiRequest(`/api/v1/business-info/${encodeURIComponent(key)}`);
}
function realUpsertBusinessInfo(key, value) {
  return apiRequest(`/api/v1/business-info/${encodeURIComponent(key)}`, { method: 'PUT', body: { value } });
}
function realDeleteBusinessInfo(key) {
  return apiRequest(`/api/v1/business-info/${encodeURIComponent(key)}`, { method: 'DELETE' });
}

function realListDocuments() {
  return apiRequest('/api/v1/documents');
}
// RAG-файл — реальный upload через multipart/form-data, а не JSON с
// метаданными (как раньше в mock-режиме). apiRequest сам не проставляет
// Content-Type для FormData — это делает браузер вместе с multipart boundary.
function realUploadDocument({ title, category, description, file }) {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (category) formData.append('category', category);
  if (description) formData.append('description', description);
  return apiRequest('/api/v1/documents/upload', { method: 'POST', body: formData });
}
function realDeleteDocument(documentId) {
  return apiRequest(`/api/v1/documents/${documentId}`, { method: 'DELETE' });
}

function realListStopCategories() {
  return apiRequest('/api/v1/stop-categories');
}
function realCreateStopCategory(payload) {
  return apiRequest('/api/v1/stop-categories', { method: 'POST', body: payload });
}
function realDeleteStopCategory(id) {
  return apiRequest(`/api/v1/stop-categories/${id}`, { method: 'DELETE' });
}

function realListManagers() {
  return apiRequest('/api/v1/managers');
}
function realCreateManager(payload) {
  return apiRequest('/api/v1/managers', { method: 'POST', body: payload });
}
function realDeleteManager(id) {
  return apiRequest(`/api/v1/managers/${id}`, { method: 'DELETE' });
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
// Регистрация по схеме TokenResponse ДОЛЖНА вернуть access_token, но экран
// (js/screens/auth.js) всё равно не считает это гарантией и проверяет
// реальный ответ перед тем, как сохранять сессию — так безопаснее.
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

// ---- Документы (RAG-файлы) ----
export const listDocuments = pick(realListDocuments, mock.listDocuments);
// mock и real ждут разный payload: mock хранит уже посчитанные file_name/
// file_size_kb (см. js/mock-api.js:443), а real грузит настоящий File через
// multipart/form-data — поэтому здесь явный маппинг вместо generic pick().
export function createDocument({ title, category, description, file }) {
  if (USE_MOCK_API) {
    return mock.createDocument({
      title,
      category,
      description: description || null,
      file_name: file ? file.name : 'без файла',
      file_size_kb: file ? Math.max(1, Math.round(file.size / 1024)) : 0,
    });
  }
  return realUploadDocument({ title, category, description, file });
}
export const deleteDocument = pick(realDeleteDocument, mock.deleteDocument);

// ---- Стоп-категории ----
export const listStopCategories = pick(realListStopCategories, mock.listStopCategories);
export const createStopCategory = pick(realCreateStopCategory, mock.createStopCategory);
// Backend пока даёт только GET/POST/DELETE для стоп-категорий — PATCH/PUT
// для переключателя активности не специфицирован, поэтому это остаётся
// mock-only до появления эндпоинта.
export const updateStopCategory = pick(notImplementedOnBackend('updateStopCategory'), mock.updateStopCategory);
export const deleteStopCategory = pick(realDeleteStopCategory, mock.deleteStopCategory);

// ---- Менеджеры ----
export const listManagers = pick(realListManagers, mock.listManagers);
export const createManager = pick(realCreateManager, mock.createManager);
// Аналогично: включение/отключение доступа менеджера ждёт PATCH-эндпоинт.
export const updateManager = pick(notImplementedOnBackend('updateManager'), mock.updateManager);
export const deleteManager = pick(realDeleteManager, mock.deleteManager);

export const session = { getToken, saveSession, clearSession };
