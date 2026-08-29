import { h } from '../utils.js';

// Общий рендер для публичных разделов (about/news/reviews/guides/terms/support),
// пока для них нет реального контента — единая карточка-заглушка поверх
// фирменного градиента .outlet--public (см. layout.css/pages.css).
export function renderPublicPlaceholder(container, { title }) {
  container.appendChild(
    h('div', { class: 'public-page' }, [
      h('div', { class: 'card public-page__card' }, [
        h('h1', { class: 'public-page__title' }, `Раздел: ${title}`),
        h('p', { class: 'public-page__text' }, 'Информация наполняется...'),
      ]),
    ])
  );
}
