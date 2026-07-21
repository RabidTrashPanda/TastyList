import { categories, flatItems, itemKey } from './catalog.js';
import {
  createEmptyState,
  createProfile,
  exportProfile,
  exportState,
  getOrCreateItem,
  importProfile,
  importState,
  loadState,
  normalizeProfile,
  saveState,
  touchProfile
} from './storage.js';
import { compareProfiles, describeItem } from './compare.js';
import { decodeShareCode, encodeShareCode } from './share.js';
import { matchDish } from './dish.js';
import { nextPreference, preferenceLabel } from './preference.js';

let state = loadState();
const compareSelectionIds = [null, null, null];

const elements = {
  profileSelect: document.querySelector('#profile-select'),
  profileKind: document.querySelector('#profile-kind'),
  profileMenuName: document.querySelector('#profile-menu-name'),
  addProfile: document.querySelector('#add-profile'),
  renameProfile: document.querySelector('#rename-profile'),
  deleteProfile: document.querySelector('#delete-profile'),
  search: document.querySelector('#catalog-search'),
  categoryFilter: document.querySelector('#category-filter'),
  editor: document.querySelector('#editor'),
  profileEmpty: document.querySelector('#profile-empty'),
  profileTools: document.querySelector('#profile-tools'),
  printProfileSheet: document.querySelector('#print-profile-sheet'),
  compareSelectors: document.querySelector('#compare-selectors'),
  compareResults: document.querySelector('#compare-results'),
  dishInput: document.querySelector('#dish-input'),
  dishResults: document.querySelector('#dish-results'),
  toast: document.querySelector('#toast'),
  importFile: document.querySelector('#import-file'),
  importBackupFile: document.querySelector('#import-backup-file'),
  shareDialog: document.querySelector('#share-dialog'),
  shareCode: document.querySelector('#share-code'),
  importDialog: document.querySelector('#import-dialog'),
  importCode: document.querySelector('#import-code')
};

initialize();

function initialize() {
  populateCategoryFilter();
  bindEvents();
  const initialTab = ['profile', 'compare', 'dish-check'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'profile';
  activateTab(initialTab);
  renderAll();
}

function bindEvents() {
  elements.profileSelect.addEventListener('change', () => {
    state.activeProfileId = elements.profileSelect.value || null;
    persist();
    renderAll();
  });

  elements.addProfile.addEventListener('click', addProfile);
  document.querySelector('#empty-add-profile').addEventListener('click', addProfile);
  document.querySelector('#empty-import-profile').addEventListener('click', () => elements.importDialog.showModal());
  elements.renameProfile.addEventListener('click', renameActiveProfile);
  elements.deleteProfile.addEventListener('click', deleteActiveProfile);
  document.querySelector('#print-profile').addEventListener('click', printActiveProfile);

  for (const tab of document.querySelectorAll('[data-tab]')) {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  }
  elements.search.addEventListener('input', renderEditor);
  elements.categoryFilter.addEventListener('change', renderEditor);

  document.querySelector('#export-profile').addEventListener('click', exportActiveProfile);
  document.querySelector('#export-backup').addEventListener('click', exportBackup);
  document.querySelector('#import-profile').addEventListener('click', () => elements.importFile.click());
  document.querySelector('#import-backup').addEventListener('click', () => elements.importBackupFile.click());
  document.querySelector('#share-profile').addEventListener('click', openShareDialog);
  document.querySelector('#import-share').addEventListener('click', () => elements.importDialog.showModal());

  elements.importFile.addEventListener('change', handleProfileImport);
  elements.importBackupFile.addEventListener('change', handleBackupImport);
  document.querySelector('#copy-share-code').addEventListener('click', copyShareCode);
  document.querySelector('#confirm-import-code').addEventListener('click', importShareCode);
  document.querySelector('#run-dish-check').addEventListener('click', runDishCheck);
}

function activateTab(tabId) {
  for (const tab of document.querySelectorAll('[data-tab]')) {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  }

  for (const panel of document.querySelectorAll('.tab-panel')) {
    panel.hidden = panel.id !== tabId;
  }

  history.replaceState(null, '', `#${tabId}`);
}

function printActiveProfile() {
  const profile = getActiveProfile();
  if (!profile) {
    showToast('Select a profile first.');
    return;
  }

  elements.printProfileSheet.replaceChildren();

  const heading = document.createElement('header');
  const title = document.createElement('h1');
  title.textContent = `${profile.name} — TastyList profile`;
  const meta = document.createElement('p');
  meta.textContent = `${profile.kind === 'guest' ? 'Imported profile' : 'Local profile'} · Printed ${new Date().toLocaleDateString()}`;
  heading.append(title, meta);
  elements.printProfileSheet.append(heading);

  for (const [categoryName, category] of Object.entries(categories)) {
    const section = document.createElement('section');
    const categoryHeading = document.createElement('h2');
    categoryHeading.textContent = categoryName;
    section.append(categoryHeading);

    const table = document.createElement('table');
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of ['Food', 'Preference', 'Rating', 'Preparations', 'Notes']) {
      const cell = document.createElement('th');
      cell.textContent = label;
      headRow.append(cell);
    }
    head.append(headRow);
    table.append(head);

    const body = document.createElement('tbody');
    for (const catalogItem of [...category.items].sort((left, right) => left.name.localeCompare(right.name))) {
      const item = profile.items[itemKey(catalogItem.name)] ?? {
        tolerance: null,
        rating: 0,
        preparations: [],
        preparationPreferences: {},
        notes: ''
      };
      const row = document.createElement('tr');
      const values = [
        catalogItem.name,
        item.tolerance ? capitalize(item.tolerance) : 'Not rated',
        item.rating ? `${item.rating}/5` : '—',
        formatPreparationPreferences(item),
        item.notes || '—'
      ];
      for (const value of values) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      body.append(row);
    }
    table.append(body);
    section.append(table);
    elements.printProfileSheet.append(section);
  }

  document.querySelector('.profile-menu')?.removeAttribute('open');
  window.print();
}

function renderAll() {
  renderProfileControls();
  renderEditor();
  renderCompareSelectors();
  renderCompareResults();
  runDishCheck(false);
}

function renderProfileControls() {
  const profiles = getProfiles();
  elements.profileSelect.replaceChildren();

  for (const profile of profiles) {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.name;
    option.selected = profile.id === state.activeProfileId;
    elements.profileSelect.append(option);
  }

  const active = getActiveProfile();
  if (profiles.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No profiles';
    option.value = '';
    elements.profileSelect.append(option);
  }
  elements.profileSelect.disabled = profiles.length === 0;
  elements.profileKind.textContent = active ? (active.kind === 'guest' ? 'Imported profile' : 'Local profile') : 'No profile';
  elements.profileMenuName.textContent = active?.name ?? 'No profile';
  elements.renameProfile.disabled = !active;
  elements.deleteProfile.disabled = !active;
  document.querySelector('#print-profile').disabled = !active;
}

function renderEditor() {
  const profile = getActiveProfile();
  elements.editor.replaceChildren();
  elements.profileEmpty.hidden = Boolean(profile);
  elements.profileTools.hidden = !profile;

  if (!profile) {
    return;
  }

  const query = elements.search.value.trim().toLowerCase();
  const categoryFilter = elements.categoryFilter.value;
  const hasCatalogFilter = Boolean(query || categoryFilter);

  if (!hasCatalogFilter) {
    return;
  }

  let visibleCount = 0;

  for (const [categoryName, category] of Object.entries(categories)) {
    if (categoryFilter && categoryFilter !== categoryName) {
      continue;
    }

    const visibleItems = category.items
      .filter(item => {
        const haystack = [item.name, ...(item.aliases ?? [])].join(' ').toLowerCase();
        return !query || haystack.includes(query);
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    if (visibleItems.length === 0) {
      continue;
    }

    const section = document.createElement('section');
    section.className = 'catalog-section';

    const heading = document.createElement('h2');
    heading.textContent = categoryName;
    section.append(heading);

    for (const catalogItem of visibleItems) {
      visibleCount += 1;
      section.append(buildEditorRow(profile, catalogItem, category.preps));
    }

    elements.editor.append(section);
  }

  if (visibleCount === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-message';
    empty.textContent = 'No matches';
    elements.editor.append(empty);
  }
}

function buildEditorRow(profile, catalogItem, preparations) {
  const catalogItemKey = itemKey(catalogItem.name);
  const item = profile.items[catalogItemKey] ?? {
    tolerance: null,
    rating: 0,
    preparations: [],
    preparationPreferences: {},
    notes: ''
  };
  const row = document.createElement('article');
  row.className = 'food-card';

  const header = document.createElement('div');
  header.className = 'food-card__header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'food-card__title';
  const title = document.createElement('h3');
  title.textContent = catalogItem.name;
  titleWrap.append(title);

  if (catalogItem.note) {
    const note = document.createElement('p');
    note.textContent = catalogItem.note;
    titleWrap.append(note);
  }

  const overall = createPreferenceButton(
    item.tolerance,
    `Overall preference for ${catalogItem.name}`,
    'Overall',
    nextValue => {
      const storedItem = getOrCreateItem(profile, catalogItemKey);
      storedItem.tolerance = nextValue;
      if (nextValue === 'refuse') {
        storedItem.rating = 0;
      }
      touchProfile(profile);
      persist();
      renderEditor();
      renderCompareResults();
    }
  );

  const rating = document.createElement('div');
  rating.className = 'rating';
  rating.setAttribute('aria-label', `Rating for ${catalogItem.name}`);
  rating.classList.toggle('is-disabled', item.tolerance === 'refuse');
  for (let value = 1; value <= 5; value += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '★';
    button.className = item.rating >= value ? 'is-active' : '';
    button.disabled = item.tolerance === 'refuse';
    button.setAttribute('aria-label', `${value} star${value === 1 ? '' : 's'}`);
    button.addEventListener('click', () => {
      const storedItem = getOrCreateItem(profile, catalogItemKey);
      storedItem.rating = storedItem.rating === value ? 0 : value;
      touchProfile(profile);
      persist();
      renderEditor();
      renderCompareResults();
    });
    rating.append(button);
  }

  header.append(titleWrap, overall, rating);
  row.append(header);

  const prepList = document.createElement('div');
  prepList.className = 'preference-strip';
  prepList.setAttribute('aria-label', `Preparation preferences for ${catalogItem.name}`);
  for (const preparation of preparations) {
    const value = item.preparationPreferences?.[preparation] ?? null;
    const control = createPreferenceButton(
      value,
      `${preparation} preference for ${catalogItem.name}`,
      preparation,
      nextValue => {
        const storedItem = getOrCreateItem(profile, catalogItemKey);
        storedItem.preparationPreferences ??= {};
        if (nextValue) {
          storedItem.preparationPreferences[preparation] = nextValue;
        } else {
          delete storedItem.preparationPreferences[preparation];
        }
        storedItem.preparations = Object.keys(storedItem.preparationPreferences);
        touchProfile(profile);
        persist();
        renderEditor();
        renderCompareResults();
      }
    );
    control.classList.add('preference-button--preparation');
    control.textContent = preparation;
    control.title = `${preparation}: ${value ? preferenceLabel(value) : 'uses overall'}. Click to cycle.`;
    prepList.append(control);
  }
  row.append(prepList);

  const notes = document.createElement('label');
  notes.className = 'notes-field';
  const notesLabel = document.createElement('span');
  notesLabel.textContent = 'Notes';
  const input = document.createElement('textarea');
  input.rows = 1;
  input.maxLength = 500;
  input.value = item.notes;
  input.placeholder = '';
  input.addEventListener('input', () => resizeNotes(input));
  input.addEventListener('change', () => {
    const storedItem = getOrCreateItem(profile, catalogItemKey);
    storedItem.notes = input.value.trim();
    touchProfile(profile);
    persist();
  });
  notes.append(notesLabel, input);
  row.append(notes);
  resizeNotes(input);

  return row;
}

function resizeNotes(input) {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
}

function createPreferenceButton(value, ariaLabel, emptyLabel, onChange) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'preference-button';
  button.dataset.preference = value ?? 'unset';
  button.textContent = value ? preferenceLabel(value) : emptyLabel;
  button.setAttribute('aria-label', `${ariaLabel}: ${preferenceLabel(value)}`);
  button.title = 'Click to cycle: enjoy, tolerate, refuse, unset';
  button.addEventListener('click', () => onChange(nextPreference(value)));
  return button;
}

function renderCompareSelectors() {
  const profiles = getProfiles();
  const profileIds = profiles.map(profile => profile.id);
  const activeProfile = getActiveProfile();

  if (!profileIds.includes(compareSelectionIds[0])) {
    compareSelectionIds[0] = activeProfile?.id ?? profileIds[0] ?? null;
  }

  if (!profileIds.includes(compareSelectionIds[1]) || compareSelectionIds[1] === compareSelectionIds[0]) {
    compareSelectionIds[1] = profileIds.find(id => id !== compareSelectionIds[0]) ?? null;
  }

  if (!profileIds.includes(compareSelectionIds[2])
      || compareSelectionIds.slice(0, 2).includes(compareSelectionIds[2])) {
    compareSelectionIds[2] = null;
  }

  elements.compareSelectors.replaceChildren();

  for (let index = 0; index < 3; index += 1) {
    const label = document.createElement('label');
    label.textContent = index === 2 ? 'Optional third profile' : `Profile ${index + 1}`;

    const select = document.createElement('select');
    select.dataset.compareIndex = String(index);
    if (index === 2) {
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = 'None';
      select.append(blank);
    }

    for (const profile of profiles) {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      select.append(option);
    }

    select.value = compareSelectionIds[index] ?? '';
    select.addEventListener('change', () => {
      compareSelectionIds[index] = select.value || null;
      renderCompareResults();
    });
    label.append(select);
    elements.compareSelectors.append(label);
  }
}

function renderCompareResults() {
  const selected = [...elements.compareSelectors.querySelectorAll('select')]
    .map(select => state.profiles[select.value])
    .filter(Boolean)
    .filter((profile, index, all) => all.findIndex(item => item.id === profile.id) === index);

  elements.compareResults.replaceChildren();

  if (selected.length < 2) {
    elements.compareResults.append(createMessage('Two profiles required'));
    return;
  }

  const rows = compareProfiles(selected, flatItems);
  if (rows.length === 0) {
    elements.compareResults.append(createMessage('No rated foods'));
    return;
  }

  const table = document.createElement('table');
  table.className = 'compare-table';

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const heading of ['Food', ...selected.map(profile => profile.name)]) {
    const cell = document.createElement('th');
    cell.textContent = heading;
    headRow.append(cell);
  }
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  let currentClassification = null;
  for (const row of rows) {
    if (row.classification !== currentClassification) {
      currentClassification = row.classification;
      const groupRow = document.createElement('tr');
      groupRow.className = 'compare-table__group';
      const groupCell = document.createElement('th');
      groupCell.colSpan = selected.length + 1;
      groupCell.textContent = classificationLabel(row.classification);
      groupRow.append(groupCell);
      body.append(groupRow);
    }

    const tr = document.createElement('tr');
    tr.dataset.classification = row.classification;
    const name = document.createElement('th');
    name.scope = 'row';
    name.textContent = row.name;
    tr.append(name);

    for (const item of row.values) {
      const cell = document.createElement('td');
      cell.textContent = describeItem(item);
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(body);
  elements.compareResults.append(table);
}

function runDishCheck(showEmptyMessage = true) {
  const profile = getActiveProfile();
  elements.dishResults.replaceChildren();

  if (!profile) {
    if (showEmptyMessage) elements.dishResults.append(createMessage('No active profile'));
    return;
  }

  const text = elements.dishInput.value.trim();
  if (!text) {
    return;
  }

  const matches = matchDish(text, profile, flatItems);
  if (matches.length === 0) {
    elements.dishResults.append(createMessage('No matches'));
    return;
  }

  const order = ['refuse', 'tolerate', 'love', 'like', 'unrated'];
  const labels = {
    refuse: 'Dealbreakers',
    tolerate: 'Only tolerated',
    love: 'Likely favorites',
    like: 'Liked foods',
    unrated: 'Not rated yet'
  };

  for (const classification of order) {
    const group = matches.filter(match => match.classification === classification);
    if (group.length === 0) continue;

    const section = document.createElement('section');
    section.className = `dish-group dish-group--${classification}`;
    const heading = document.createElement('h3');
    heading.textContent = labels[classification];
    section.append(heading);

    const list = document.createElement('ul');
    for (const match of group) {
      const item = document.createElement('li');
      item.textContent = match.name;
      if (match.anomalyNote) {
        const note = document.createElement('small');
        note.textContent = ` — ${match.anomalyNote}`;
        item.append(note);
      }
      list.append(item);
    }
    section.append(list);
    elements.dishResults.append(section);
  }
}

function addProfile() {
  const name = prompt('Profile name');
  if (!name?.trim()) return;

  const profile = createProfile(name, 'local');
  state.profiles[profile.id] = profile;
  state.activeProfileId = profile.id;
  persist();
  renderAll();
  showToast(`Created ${profile.name}.`);
}

function renameActiveProfile() {
  const profile = getActiveProfile();
  if (!profile) return;

  const name = prompt('New profile name', profile.name);
  if (!name?.trim()) return;

  profile.name = name.trim().slice(0, 60);
  touchProfile(profile);
  persist();
  renderAll();
}

function deleteActiveProfile() {
  const profile = getActiveProfile();
  if (!profile || !confirm(`Delete ${profile.name} from this browser?`)) return;

  delete state.profiles[profile.id];
  state.activeProfileId = Object.keys(state.profiles)[0] ?? null;
  persist();
  renderAll();
  showToast('Profile deleted.');
}

function exportActiveProfile() {
  const profile = getActiveProfile();
  if (!profile) return showToast('Select a profile first.');

  downloadText(`${fileSafe(profile.name)}.tastylist.json`, exportProfile(profile));
}

function exportBackup() {
  downloadText('tastylist-backup.json', exportState(state));
}

async function handleProfileImport(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  try {
    const profile = importProfile(await file.text());
    state.profiles[profile.id] = profile;
    state.activeProfileId = profile.id;
    persist();
    renderAll();
    showToast(`Imported ${profile.name}.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function handleBackupImport(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  if (!confirm('Replace all profiles in this browser with this backup?')) return;

  try {
    state = importState(await file.text());
    persist();
    renderAll();
    showToast('Backup restored.');
  } catch {
    showToast('That backup could not be read.');
  }
}

function openShareDialog() {
  const profile = getActiveProfile();
  if (!profile) return showToast('Select a profile first.');

  elements.shareCode.value = encodeShareCode(profile);
  elements.shareDialog.showModal();
}

async function copyShareCode() {
  await navigator.clipboard.writeText(elements.shareCode.value);
  showToast('Share code copied.');
}

function importShareCode() {
  try {
    const source = decodeShareCode(elements.importCode.value);
    const profile = normalizeProfile({
      ...source,
      id: undefined,
      kind: 'guest'
    });
    if (!profile) throw new Error('The profile data is invalid.');
    profile.id = globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}`;
    profile.kind = 'guest';
    state.profiles[profile.id] = profile;
    state.activeProfileId = profile.id;
    persist();
    elements.importCode.value = '';
    elements.importDialog.close();
    renderAll();
    showToast(`Imported ${profile.name}.`);
  } catch (error) {
    showToast(error.message);
  }
}

function populateCategoryFilter() {
  for (const category of Object.keys(categories)) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    elements.categoryFilter.append(option);
  }
}

function getProfiles() {
  return Object.values(state.profiles)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getActiveProfile() {
  return state.activeProfileId ? state.profiles[state.activeProfileId] ?? null : null;
}

function persist() {
  state = saveState(state);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createMessage(text) {
  const paragraph = document.createElement('p');
  paragraph.className = 'empty-message';
  paragraph.textContent = text;
  return paragraph;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function classificationLabel(value) {
  return {
    conflict: 'Conflicts',
    sharedLike: 'Shared likes',
    sharedDislike: 'Shared dislikes',
    mixed: 'Mixed or incomplete'
  }[value];
}


function fileSafe(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'profile';
}

function formatPreparationPreferences(item) {
  const entries = Object.entries(item.preparationPreferences ?? {})
    .sort(([left], [right]) => left.localeCompare(right));

  if (entries.length === 0) {
    return '—';
  }

  return entries
    .map(([name, value]) => `${name}: ${preferenceLabel(value)}`)
    .join(', ');
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
