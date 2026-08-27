// Централизованный переключатель источника данных.
// true  -> все функции api.js работают через js/mock-api.js (in-memory + localStorage).
// false -> api.js обращается к реальному backend по BASE_URL.
// Экраны ничего не знают об этом флаге — они всегда импортируют js/api.js.
export const USE_MOCK_API = true;

export const BASE_URL = 'http://5.42.126.134:8000';

// Имитация сетевой задержки в mock-режиме, мс.
export const MOCK_LATENCY_MIN = 300;
export const MOCK_LATENCY_MAX = 700;
