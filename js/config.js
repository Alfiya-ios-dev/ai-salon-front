// Централизованный переключатель источника данных.
// true  -> все функции api.js работают через js/mock-api.js (in-memory + localStorage).
// false -> api.js обращается к реальному backend по BASE_URL.
// Экраны ничего не знают об этом флаге — они всегда импортируют js/api.js.
//
// Backend снова доступен (проверено: GET /openapi.json и /docs отвечают 200),
// поэтому для этапа "реальная интеграция Auth" флаг выключен. Если backend
// снова ляжет — верните true, остальной код менять не нужно.
export const USE_MOCK_API = false;

export const BASE_URL = 'http://5.42.126.134:8000';

// Таймаut одного запроса к API, мс. При превышении запрос отменяется через
// AbortController и пользователь видит понятное сообщение вместо зависшей кнопки.
export const REQUEST_TIMEOUT_MS = 15000;

// Имитация сетевой задержки в mock-режиме, мс (используется только когда
// USE_MOCK_API === true).
export const MOCK_LATENCY_MIN = 300;
export const MOCK_LATENCY_MAX = 700;
