'use strict';

document.documentElement.classList.add('js');

// Navigation remains usable without JavaScript, and collapses on small screens.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-nav');
const sectionLinks = [...navigation.querySelectorAll('a[href^="#"]')];
const closeMenu = () => {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('span').textContent = '＋';
};
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.querySelector('span').textContent = open ? '−' : '＋';
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
window.matchMedia('(min-width: 681px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

const sections = sectionLinks.map(link => document.querySelector(link.getAttribute('href')));
let framePending = false;
const updateNavigation = () => {
  framePending = false;
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 170) current = section;
  }
  sectionLinks.forEach(link => {
    if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
};
window.addEventListener('scroll', () => {
  if (!framePending) {
    framePending = true;
    requestAnimationFrame(updateNavigation);
  }
}, { passive: true });
window.addEventListener('resize', updateNavigation);
updateNavigation();

// Search and year selection can be combined; every publication is static HTML.
const filters = document.querySelector('.filters');
const filterButtons = [...filters.querySelectorAll('button')];
const search = document.querySelector('#paper-search');
const papers = [...document.querySelectorAll('.paper')];
const status = document.querySelector('#filter-status');
const count = document.querySelector('#paper-count');
const emptyState = document.querySelector('#empty-state');
const morePublications = document.querySelector('#more-publications');
const publicationSummary = document.querySelector('#publications-summary');
const collapsePublications = document.querySelector('#collapse-publications');
const normalize = text => text.normalize('NFKD').toLowerCase().trim();
const searchTexts = papers.map(paper => normalize(paper.textContent));
const topicPapers = {
  reliability: [2, 4, 5],
  adaptation: [0, 3],
  reasoning: [1, 2, 6]
};
const topicNames = {
  reliability: 'Evaluation & reliability',
  adaptation: 'Efficient adaptation',
  reasoning: 'Structured reasoning'
};
let selectedYear = 'all';
let selectedTopic = null;
let searchTimer;
const hasActiveFilters = () => selectedYear !== 'all' || Boolean(selectedTopic) || Boolean(normalize(search.value));
const updatePublicationDisclosure = () => {
  const matching = papers.filter(paper => !paper.hidden);
  const extra = matching.filter(paper => morePublications.contains(paper));
  const visible = matching.filter(paper => morePublications.open || !morePublications.contains(paper)).length;
  const filtered = hasActiveFilters();
  morePublications.hidden = extra.length === 0;
  publicationSummary.hidden = filtered;
  collapsePublications.hidden = filtered || !morePublications.open;
  publicationSummary.querySelector('.more-publications-label').textContent = morePublications.open ? 'Show fewer publications' : 'More publications';
  publicationSummary.querySelector('.more-publications-count').textContent = `${extra.length} ${extra.length === 1 ? 'paper' : 'papers'}`;
  const totalLabel = `${String(matching.length).padStart(2, '0')} ${matching.length === 1 ? 'PAPER' : 'PAPERS'}`;
  count.textContent = visible === matching.length ? totalLabel : `${String(visible).padStart(2, '0')} / ${totalLabel}`;
  status.textContent = `${visible} publications shown${selectedYear === 'all' ? '' : ` for ${selectedYear}`}${selectedTopic ? ` about ${selectedTopic}` : ''}${search.value.trim() ? ` matching “${search.value.trim()}”` : ''}.${visible < matching.length ? ` Expand More publications to view ${extra.length} more.` : ''}`;
};
const applyFilters = () => {
  const terms = normalize(search.value).split(/\s+/).filter(Boolean);
  let visible = 0;
  papers.forEach((paper, index) => {
    const matchesYear = selectedYear === 'all' || paper.dataset.year === selectedYear;
    const matchesText = terms.every(term => searchTexts[index].includes(term));
    const matchesTopic = !selectedTopic || topicPapers[selectedTopic].includes(index);
    paper.hidden = !(matchesYear && matchesText && matchesTopic);
    if (!paper.hidden) visible += 1;
  });
  filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.year === selectedYear)));
  emptyState.hidden = visible > 0;
  document.querySelector('#topic-filter').hidden = !selectedTopic;
  document.querySelector('#topic-name').textContent = selectedTopic ? topicNames[selectedTopic] : '';
  morePublications.open = hasActiveFilters();
  updatePublicationDisclosure();
};
morePublications.addEventListener('toggle', updatePublicationDisclosure);
collapsePublications.addEventListener('click', () => {
  morePublications.open = false;
  updatePublicationDisclosure();
  publicationSummary.focus({ preventScroll: true });
  publicationSummary.scrollIntoView({ block: 'center' });
});
const resetFilters = () => {
  selectedYear = 'all';
  selectedTopic = null;
  search.value = '';
  clearTimeout(searchTimer);
  applyFilters();
};
filters.addEventListener('click', event => {
  const button = event.target.closest('button[data-year]');
  if (!button) return;
  selectedYear = button.dataset.year;
  selectedTopic = null;
  applyFilters();
});
search.addEventListener('input', () => {
  selectedTopic = null;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 120);
});
search.addEventListener('search', applyFilters);
document.querySelector('#reset-filters').addEventListener('click', () => {
  resetFilters();
  search.focus();
});
document.querySelector('#clear-topic').addEventListener('click', resetFilters);
document.querySelectorAll('[data-topic]').forEach(link => {
  link.addEventListener('click', () => {
    resetFilters();
    selectedTopic = link.dataset.topic;
    applyFilters();
  });
});
filters.hidden = false;
document.querySelector('.paper-search').hidden = false;
applyFilters();

document.querySelector('#current-year').textContent = String(new Date().getFullYear());
