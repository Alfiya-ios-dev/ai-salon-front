// ============================================================================
// MOCK API — временная замена реального backend, пока http://5.42.126.134:8000
// недоступен. Повторяет сигнатуры функций js/api.js один в один, поэтому
// экраны (js/screens/*) не отличают mock от реального клиента.
//
// Хранилище: localStorage (ключ salon_mock_db) + оперативная копия в памяти.
// Данные переживают перезагрузку страницы, но существуют только в браузере.
//
// ВАЖНО про соответствие реальному backend (OpenAPI):
//  - services / staff / staff-schedule / bookings / prompts / business-info —
//    повторяют реальные схемы из openapi.json.
//  - staff.service_ids — этого поля НЕТ в текущем ответе реального backend
//    (проверено живым запросом: GET /staff и GET /services его не возвращают,
//    хотя договорённость с бэкендом была именно такая). В mock-режиме поле
//    присутствует, чтобы можно было полноценно разрабатывать UI назначения
//    услуг мастерам. Как только backend реально начнёт отдавать это поле —
//    ничего менять не нужно, просто выключить USE_MOCK_API.
//  - documents / stopCategories / managers — ЭКСПЕРИМЕНТАЛЬНЫЕ сущности.
//    В openapi.json им НЕТ соответствующих эндпоинтов (нет /documents,
//    /stop-categories, /managers, нет multipart/загрузки файлов вообще).
//    Это чисто визуальный/продуктовый мок для проектирования интерфейса.
//    Когда USE_MOCK_API=false, вызовы этих функций бросают понятную ошибку
//    (см. api.js) — их реальный контракт ещё предстоит согласовать с бэком.
// ============================================================================

import { ApiError, saveSession, clearSession } from './session.js';
import { MOCK_LATENCY_MIN, MOCK_LATENCY_MAX } from './config.js';

const DB_KEY = 'salon_mock_db';

function delay() {
  const ms = MOCK_LATENCY_MIN + Math.random() * (MOCK_LATENCY_MAX - MOCK_LATENCY_MIN);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function isoDaysFromNow(days, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateOnly(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seedDb() {
  return {
    users: [
      {
        email: 'demo@salon.test',
        password: 'demo12345',
        tenant_id: 1,
        business_name: 'Salon Demo (Mock)',
        business_phone_number: '+996 700 000 000',
      },
    ],
    services: [
      { id: 1, category: 'Волосы', name: 'Стрижка женская', price: 1800, duration_minutes: 60, description: 'Стрижка любой сложности, укладка в подарок.' },
      { id: 2, category: 'Волосы', name: 'Стрижка мужская', price: 1200, duration_minutes: 40, description: 'Классическая и модельная стрижка.' },
      { id: 3, category: 'Волосы', name: 'Окрашивание', price: 4500, duration_minutes: 150, description: 'Однотонное окрашивание, краска включена.' },
      { id: 4, category: 'Ногти', name: 'Маникюр классический', price: 1500, duration_minutes: 60, description: 'Обработка + покрытие гель-лак.' },
      { id: 5, category: 'Ногти', name: 'Педикюр', price: 2000, duration_minutes: 75, description: null },
      { id: 6, category: 'Лицо', name: 'Чистка лица', price: 3200, duration_minutes: 90, description: 'Ультразвуковая чистка + маска.' },
      { id: 7, category: 'Ресницы', name: 'Наращивание ресниц 2D', price: 2800, duration_minutes: 120, description: null },
    ],
    staff: [
      { id: 1, name: 'Айгуль Task', role: 'Топ-стилист', is_active: true, service_ids: [1, 2, 3] },
      { id: 2, name: 'Динара Асанова', role: 'Мастер маникюра', is_active: true, service_ids: [4, 5] },
      { id: 3, name: 'Нурлан Беков', role: 'Барбер', is_active: true, service_ids: [2] },
      { id: 4, name: 'Салтанат Ким', role: 'Косметолог', is_active: false, service_ids: [6, 7] },
    ],
    schedule: [
      { id: 1, staff_id: 1, date: dateOnly(0), start_time: '10:00', end_time: '19:00' },
      { id: 2, staff_id: 1, date: dateOnly(1), start_time: '10:00', end_time: '19:00' },
      { id: 3, staff_id: 1, date: dateOnly(2), start_time: '10:00', end_time: '15:00' },
      { id: 4, staff_id: 2, date: dateOnly(0), start_time: '09:00', end_time: '18:00' },
      { id: 5, staff_id: 2, date: dateOnly(1), start_time: '09:00', end_time: '18:00' },
      { id: 6, staff_id: 3, date: dateOnly(0), start_time: '11:00', end_time: '20:00' },
      { id: 7, staff_id: 3, date: dateOnly(3), start_time: '11:00', end_time: '20:00' },
      { id: 8, staff_id: 4, date: dateOnly(2), start_time: '10:00', end_time: '16:00' },
    ],
    bookings: [
      { id: 1, dialog_id: 5821, staff_id: 1, service_id: 1, client_name: 'Жанна Осмонова', client_phone: '+996 555 111 222', booking_datetime: isoDaysFromNow(0, 12, 0), status: 'подтверждена', created_at: isoDaysFromNow(-2) },
      { id: 2, dialog_id: 5822, staff_id: 2, service_id: 4, client_name: 'Бермет Токтосунова', client_phone: '+996 555 222 333', booking_datetime: isoDaysFromNow(0, 14, 30), status: 'новая', created_at: isoDaysFromNow(-1) },
      { id: 3, dialog_id: null, staff_id: 3, service_id: 2, client_name: 'Азамат Уулу', client_phone: '+996 555 333 444', booking_datetime: isoDaysFromNow(1, 11, 0), status: 'новая', created_at: nowIso() },
      { id: 4, dialog_id: 5830, staff_id: 1, service_id: 3, client_name: 'Гүлнара Абдиева', client_phone: '+996 555 444 555', booking_datetime: isoDaysFromNow(2, 10, 0), status: 'подтверждена', created_at: isoDaysFromNow(-3) },
      { id: 5, dialog_id: 5834, staff_id: 4, service_id: 6, client_name: 'Айым Садыкова', client_phone: '+996 555 555 666', booking_datetime: isoDaysFromNow(-1, 16, 0), status: 'отменена', created_at: isoDaysFromNow(-5) },
      { id: 6, dialog_id: null, staff_id: 2, service_id: 5, client_name: 'Салтанат Нурова', client_phone: '+996 555 666 777', booking_datetime: isoDaysFromNow(3, 13, 0), status: 'новая', created_at: isoDaysFromNow(-1) },
    ],
    prompts: {
      id: 1,
      system_prompt: 'Ты — вежливый администратор бьюти-салона в WhatsApp. Помогай клиентам выбрать услугу, мастера и время визита. Отвечай кратко и дружелюбно, на русском языке.',
      upsell_scripts: 'Если клиент записывается на стрижку — предложи окрашивание или укладку со скидкой 10%. Если на маникюр — предложи добавить педикюр.',
      objection_handling: 'Если клиент говорит "дорого" — расскажи о составе услуги и качестве материалов, предложи более доступную услугу из той же категории.',
      updated_at: isoDaysFromNow(-4),
    },
    businessInfo: [
      { key: 'address', value: 'г. Бишкек, ул. Чуй 123, 2 этаж' },
      { key: 'phone', value: '+996 700 000 000' },
      { key: 'working_hours', value: 'Пн-Сб 09:00–20:00, Вс — выходной' },
      { key: 'instagram', value: '@salon_demo_kg' },
    ],
    documents: [
      { id: 1, title: 'Прайс-лист 2026', category: 'Прайс-лист', file_name: 'price-list-2026.pdf', file_size_kb: 245, uploaded_at: isoDaysFromNow(-10), status: 'active', description: 'Актуальные цены на все услуги.' },
      { id: 2, title: 'Правила отмены записи', category: 'Политика', file_name: 'cancellation-policy.pdf', file_size_kb: 88, uploaded_at: isoDaysFromNow(-30), status: 'active', description: null },
      { id: 3, title: 'FAQ для бота', category: 'FAQ', file_name: 'bot-faq.docx', file_size_kb: 132, uploaded_at: isoDaysFromNow(-60), status: 'archived', description: 'Устаревшая версия, заменена на v2.' },
    ],
    stopCategories: [
      { id: 1, name: 'Медицинские консультации', description: 'Бот не должен давать медицинские советы или диагнозы.', is_active: true, created_at: isoDaysFromNow(-40) },
      { id: 2, name: 'Обсуждение конкурентов', description: 'Не сравнивать цены и качество с другими салонами.', is_active: true, created_at: isoDaysFromNow(-40) },
      { id: 3, name: 'Скидки свыше 30%', description: 'Бот не может обещать скидку больше согласованного лимита.', is_active: true, created_at: isoDaysFromNow(-20) },
      { id: 4, name: 'Персональные данные третьих лиц', description: 'Запрет на обсуждение данных других клиентов.', is_active: false, created_at: isoDaysFromNow(-15) },
    ],
    managers: [
      { id: 1, full_name: 'Медина Орозова', email: 'medina@salon.test', role: 'owner', is_active: true, last_login_at: isoDaysFromNow(0, 9, 15), created_at: isoDaysFromNow(-120) },
      { id: 2, full_name: 'Тимур Жумабеков', email: 'timur@salon.test', role: 'admin', is_active: true, last_login_at: isoDaysFromNow(-1, 18, 0), created_at: isoDaysFromNow(-90) },
      { id: 3, full_name: 'Аида Бекова', email: 'aida@salon.test', role: 'manager', is_active: false, last_login_at: isoDaysFromNow(-14, 10, 0), created_at: isoDaysFromNow(-70) },
    ],
    seq: { service: 8, staffMember: 5, schedule: 9, booking: 7, document: 4, stopCategory: 5, manager: 4 },
  };
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // повреждённые данные — пересоздаём
  }
  const fresh = seedDb();
  persist(fresh);
  return fresh;
}

function persist(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

let db = loadDb();

function save() {
  persist(db);
}

function nextId(key) {
  const id = db.seq[key];
  db.seq[key] += 1;
  return id;
}

function notFound(message) {
  return new ApiError(message, 404, { detail: message });
}

// ---- Auth ----
export async function register({ email, password, business_name, business_phone_number }) {
  await delay();
  if (db.users.some((u) => u.email === email)) {
    throw new ApiError('Пользователь с таким email уже существует.', 422, { detail: 'Пользователь с таким email уже существует.' });
  }
  const tenant_id = db.users.length + 1;
  db.users.push({ email, password, tenant_id, business_name, business_phone_number });
  save();
  const data = { access_token: `mock-token-${tenant_id}-${Date.now()}`, token_type: 'bearer', tenant_id, business_name };
  // Сессию НЕ сохраняем здесь — как и реальный backend, register() просто
  // возвращает ответ, а экран авторизации сам решает, сохранять ли токен
  // (см. js/screens/auth.js: не считаем, что access_token гарантирован).
  return data;
}

export async function login({ email, password }) {
  await delay();
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) {
    throw new ApiError('Неверный email или пароль.', 401, { detail: 'Неверный email или пароль.' });
  }
  const data = {
    access_token: `mock-token-${user.tenant_id}-${Date.now()}`,
    token_type: 'bearer',
    tenant_id: user.tenant_id,
    business_name: user.business_name,
  };
  saveSession(data);
  return data;
}

export function logout() {
  clearSession();
}

// ---- Bookings ----
export async function listBookings({ status, dialog_id, staff_id } = {}) {
  await delay();
  return db.bookings
    .filter((b) => (status ? b.status === status : true))
    .filter((b) => (dialog_id !== undefined && dialog_id !== null ? b.dialog_id === Number(dialog_id) : true))
    .filter((b) => (staff_id !== undefined && staff_id !== null ? b.staff_id === Number(staff_id) : true))
    .slice()
    .sort((a, b) => new Date(b.booking_datetime) - new Date(a.booking_datetime));
}

export async function getBooking(bookingId) {
  await delay();
  const booking = db.bookings.find((b) => b.id === Number(bookingId));
  if (!booking) throw notFound('Booking not found');
  return booking;
}

export async function createBooking(payload) {
  await delay();
  const booking = { id: nextId('booking'), created_at: nowIso(), status: 'новая', dialog_id: payload.dialog_id ?? null, ...payload };
  db.bookings.push(booking);
  save();
  return booking;
}

export async function updateBookingStatus(bookingId, status) {
  await delay();
  const booking = db.bookings.find((b) => b.id === Number(bookingId));
  if (!booking) throw notFound('Booking not found');
  booking.status = status;
  save();
  return booking;
}

// ---- Services ----
export async function listServices() {
  await delay();
  return db.services.slice();
}

export async function createService(payload) {
  await delay();
  const service = { id: nextId('service'), ...payload };
  db.services.push(service);
  save();
  return service;
}

export async function deleteService(serviceId) {
  await delay();
  const idx = db.services.findIndex((s) => s.id === Number(serviceId));
  if (idx === -1) throw notFound('Service not found');
  db.services.splice(idx, 1);
  db.staff.forEach((s) => {
    s.service_ids = (s.service_ids || []).filter((id) => id !== Number(serviceId));
  });
  save();
  return null;
}

// ---- Staff ----
export async function listStaff() {
  await delay();
  return db.staff.slice();
}

export async function createStaff(payload) {
  await delay();
  const staff = { id: nextId('staffMember'), is_active: true, service_ids: [], ...payload };
  db.staff.push(staff);
  save();
  return staff;
}

export async function updateStaff(staffId, payload) {
  await delay();
  const staff = db.staff.find((s) => s.id === Number(staffId));
  if (!staff) throw notFound('Staff not found');
  Object.assign(staff, payload);
  save();
  return staff;
}

export async function assignServiceToStaff(staffId, serviceId) {
  await delay();
  const staff = db.staff.find((s) => s.id === Number(staffId));
  if (!staff) throw notFound('Staff not found');
  if (!db.services.some((s) => s.id === Number(serviceId))) throw notFound('Service not found');
  staff.service_ids = staff.service_ids || [];
  if (!staff.service_ids.includes(Number(serviceId))) staff.service_ids.push(Number(serviceId));
  save();
  return { staff_id: Number(staffId), service_id: Number(serviceId) };
}

export async function unassignServiceFromStaff(staffId, serviceId) {
  await delay();
  const staff = db.staff.find((s) => s.id === Number(staffId));
  if (!staff) throw notFound('Staff not found');
  staff.service_ids = (staff.service_ids || []).filter((id) => id !== Number(serviceId));
  save();
  return null;
}

// ---- Staff schedule ----
export async function listStaffSchedule(staffId) {
  await delay();
  return db.schedule.filter((d) => d.staff_id === Number(staffId)).slice();
}

export async function createStaffScheduleDay(staffId, payload) {
  await delay();
  const day = { id: nextId('schedule'), staff_id: Number(staffId), ...payload };
  db.schedule.push(day);
  save();
  return day;
}

export async function deleteStaffScheduleDay(staffId, scheduleId) {
  await delay();
  const idx = db.schedule.findIndex((d) => d.id === Number(scheduleId) && d.staff_id === Number(staffId));
  if (idx === -1) throw notFound('Schedule entry not found');
  db.schedule.splice(idx, 1);
  save();
  return null;
}

// ---- Slots ----
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export async function getAvailableSlots({ service_id, date, staff_id } = {}) {
  await delay();
  const service = db.services.find((s) => s.id === Number(service_id));
  const duration = service ? service.duration_minutes : 60;

  const candidateStaffIds = staff_id
    ? [Number(staff_id)]
    : db.staff.filter((s) => s.is_active && (s.service_ids || []).includes(Number(service_id))).map((s) => s.id);

  const slotsSet = new Set();
  candidateStaffIds.forEach((sid) => {
    const day = db.schedule.find((d) => d.staff_id === sid && d.date === date);
    if (!day) return;
    const dayBookings = db.bookings.filter(
      (b) => b.staff_id === sid && b.booking_datetime.slice(0, 10) === date && b.status !== 'отменена'
    );
    let cursor = timeToMinutes(day.start_time);
    const end = timeToMinutes(day.end_time);
    while (cursor + duration <= end) {
      const slotStart = cursor;
      const overlaps = dayBookings.some((b) => {
        const bStart = new Date(b.booking_datetime).getHours() * 60 + new Date(b.booking_datetime).getMinutes();
        return slotStart < bStart + duration && bStart < slotStart + duration;
      });
      if (!overlaps) slotsSet.add(minutesToTime(slotStart));
      cursor += 30;
    }
  });

  return {
    service_id: Number(service_id),
    date,
    staff_id: staff_id ? Number(staff_id) : null,
    available_slots: Array.from(slotsSet).sort(),
  };
}

// ---- Sales prompts ----
export async function getPrompts() {
  await delay();
  return { ...db.prompts };
}

export async function updatePrompts(payload) {
  await delay();
  db.prompts = { ...db.prompts, ...payload, updated_at: nowIso() };
  save();
  return { ...db.prompts };
}

// ---- Business info ----
export async function listBusinessInfo() {
  await delay();
  return db.businessInfo.slice();
}

export async function createBusinessInfo({ key, value }) {
  await delay();
  if (db.businessInfo.some((i) => i.key === key)) {
    throw new ApiError('Ключ уже существует.', 422, { detail: 'Ключ уже существует.' });
  }
  const item = { key, value };
  db.businessInfo.push(item);
  save();
  return item;
}

export async function getBusinessInfo(key) {
  await delay();
  const item = db.businessInfo.find((i) => i.key === key);
  if (!item) throw notFound('Business info not found');
  return item;
}

export async function upsertBusinessInfo(key, value) {
  await delay();
  let item = db.businessInfo.find((i) => i.key === key);
  if (item) {
    item.value = value;
  } else {
    item = { key, value };
    db.businessInfo.push(item);
  }
  save();
  return item;
}

// Мок-эквивалент реального bulk PUT /api/v1/business-info (TenantSettingsUpdate):
// в mock-хранилище нет отдельной модели под 4 метки терминологии, поэтому
// просто апсертим те же ключи через уже существующий key/value стор.
export async function updateTenantSettings(payload) {
  await delay();
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null);
  for (const [key, value] of entries) {
    const item = db.businessInfo.find((i) => i.key === key);
    if (item) item.value = value;
    else db.businessInfo.push({ key, value });
  }
  save();
  return Object.fromEntries(db.businessInfo.filter((i) => i.key in payload).map((i) => [i.key, i.value]));
}

export async function deleteBusinessInfo(key) {
  await delay();
  const idx = db.businessInfo.findIndex((i) => i.key === key);
  if (idx === -1) throw notFound('Business info not found');
  db.businessInfo.splice(idx, 1);
  save();
  return null;
}

// ============================================================================
// ЭКСПЕРИМЕНТАЛЬНЫЕ СУЩНОСТИ — нет в openapi.json реального backend.
// Только для визуальной разработки; контракт не согласован.
// ============================================================================

// ---- Documents (mock-only) ----
export async function listDocuments() {
  await delay();
  return db.documents.slice();
}

export async function createDocument(payload) {
  await delay();
  const doc = { id: nextId('document'), uploaded_at: nowIso(), status: 'active', ...payload };
  db.documents.push(doc);
  save();
  return doc;
}

export async function deleteDocument(documentId) {
  await delay();
  const idx = db.documents.findIndex((d) => d.id === Number(documentId));
  if (idx === -1) throw notFound('Document not found');
  db.documents.splice(idx, 1);
  save();
  return null;
}

// ---- Stop-categories (mock-only) ----
export async function listStopCategories() {
  await delay();
  return db.stopCategories.slice();
}

export async function createStopCategory(payload) {
  await delay();
  const item = { id: nextId('stopCategory'), is_active: true, created_at: nowIso(), ...payload };
  db.stopCategories.push(item);
  save();
  return item;
}

export async function updateStopCategory(id, payload) {
  await delay();
  const item = db.stopCategories.find((i) => i.id === Number(id));
  if (!item) throw notFound('Stop-category not found');
  Object.assign(item, payload);
  save();
  return item;
}

export async function deleteStopCategory(id) {
  await delay();
  const idx = db.stopCategories.findIndex((i) => i.id === Number(id));
  if (idx === -1) throw notFound('Stop-category not found');
  db.stopCategories.splice(idx, 1);
  save();
  return null;
}

// ---- Managers (mock-only) ----
export async function listManagers() {
  await delay();
  return db.managers.slice();
}

export async function createManager(payload) {
  await delay();
  const manager = { id: nextId('manager'), is_active: true, created_at: nowIso(), last_login_at: null, ...payload };
  db.managers.push(manager);
  save();
  return manager;
}

export async function updateManager(id, payload) {
  await delay();
  const manager = db.managers.find((m) => m.id === Number(id));
  if (!manager) throw notFound('Manager not found');
  Object.assign(manager, payload);
  save();
  return manager;
}

export async function deleteManager(id) {
  await delay();
  const idx = db.managers.findIndex((m) => m.id === Number(id));
  if (idx === -1) throw notFound('Manager not found');
  db.managers.splice(idx, 1);
  save();
  return null;
}

export function resetMockDb() {
  db = seedDb();
  save();
}
