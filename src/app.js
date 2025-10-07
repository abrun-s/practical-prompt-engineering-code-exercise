// Prompt Library Application
// Features: CRUD (Create, Read, Delete) for prompts, localStorage persistence,
// search, copy to clipboard, export JSON, toast notifications, theme switch.

const STORAGE_KEY = 'promptLibrary.v1';
const THEME_KEY = 'promptLibrary.theme';

/** @typedef {{ id:string; title:string; content:string; createdAt:number }} Prompt */

const els = {
	form: document.getElementById('promptForm'),
	title: document.getElementById('title'),
	content: document.getElementById('content'),
	list: document.getElementById('promptList'),
	empty: document.getElementById('emptyState'),
	search: document.getElementById('searchBox'),
	template: document.getElementById('promptItemTemplate'),
	toast: document.getElementById('toast'),
	exportBtn: document.getElementById('exportBtn'),
	themeSwitch: document.getElementById('themeSwitch'),
	resetBtn: document.getElementById('resetBtn'),
};

let prompts = loadPrompts();

function loadPrompts() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(p => p && p.id && p.title && typeof p.content === 'string');
	} catch (e) {
		console.warn('Failed to parse prompts', e);
		return [];
	}
}

function persist() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
	} catch (e) {
		console.error('Persist error', e);
		showToast('Saving failed (storage full?)');
	}
}

function nanoid(size = 10) {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let id = '';
	const arr = crypto.getRandomValues(new Uint8Array(size));
	for (let n of arr) id += chars[n % chars.length];
	return id;
}

function formatDate(ts) {
	const d = new Date(ts);
	return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function showToast(msg, timeout = 2400) {
	if (!els.toast) return;
	els.toast.textContent = msg;
	els.toast.classList.add('show');
	clearTimeout(showToast._t);
	showToast._t = setTimeout(() => els.toast.classList.remove('show'), timeout);
}

function render() {
	els.list.innerHTML = '';
	const q = (els.search.value || '').trim().toLowerCase();
	const filtered = q ? prompts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)) : prompts;
	if (!filtered.length) {
		els.empty.hidden = false;
		return;
	}
	els.empty.hidden = true;
	const frag = document.createDocumentFragment();
	for (const p of filtered.sort((a,b) => b.createdAt - a.createdAt)) {
		const node = els.template.content.firstElementChild.cloneNode(true);
		node.dataset.id = p.id;
		const titleEl = node.querySelector('.prompt-title');
		const contentEl = node.querySelector('.prompt-content');
		const timeEl = node.querySelector('.timestamp');
		titleEl.textContent = p.title;
		contentEl.textContent = p.content;
		timeEl.textContent = formatDate(p.createdAt);
		timeEl.dateTime = new Date(p.createdAt).toISOString();
		frag.appendChild(node);
	}
	els.list.appendChild(frag);
}

function addPrompt(title, content) {
	const prompt = { id: nanoid(), title: title.trim(), content: content.trim(), createdAt: Date.now() };
	prompts.push(prompt);
	persist();
	render();
	showToast('Prompt saved');
	return prompt;
}

function deletePrompt(id) {
	const idx = prompts.findIndex(p => p.id === id);
	if (idx === -1) return;
	const [removed] = prompts.splice(idx, 1);
	persist();
	render();
	showToast('Deleted: ' + removed.title);
}

function copyPrompt(id) {
	const p = prompts.find(p => p.id === id);
	if (!p) return;
	navigator.clipboard.writeText(p.content).then(() => showToast('Copied to clipboard'), () => showToast('Copy failed'));
}

function exportPrompts() {
	const blob = new Blob([JSON.stringify(prompts, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'prompts-export-' + new Date().toISOString().slice(0,10) + '.json';
	document.body.appendChild(a);
	a.click();
	setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
	showToast('Export downloaded');
}

function handleListClick(e) {
	const btn = e.target.closest('button');
	if (!btn) return;
	const card = btn.closest('.prompt-card');
	if (!card) return;
	const id = card.dataset.id;
	if (btn.classList.contains('delete-btn')) {
		if (confirm('Delete this prompt?')) deletePrompt(id);
	} else if (btn.classList.contains('copy-btn')) {
		copyPrompt(id);
	}
}

function loadTheme() {
	const stored = localStorage.getItem(THEME_KEY);
	if (stored === 'light') {
		document.documentElement.classList.add('light');
		els.themeSwitch.checked = false;
	}
}

function toggleTheme() {
	const isDark = els.themeSwitch.checked;
	document.documentElement.classList.toggle('light', !isDark);
	localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
}

// Event listeners
els.form?.addEventListener('submit', e => {
	e.preventDefault();
	const title = els.title.value.trim();
	const content = els.content.value.trim();
	if (!title || !content) return showToast('Title & content required');
	addPrompt(title, content);
	els.form.reset();
	els.title.focus();
});

els.resetBtn?.addEventListener('click', () => {
	showToast('Form cleared');
});

els.list?.addEventListener('click', handleListClick);
els.search?.addEventListener('input', render);
els.exportBtn?.addEventListener('click', exportPrompts);
els.themeSwitch?.addEventListener('change', toggleTheme);

// Keyboard accessibility: delete with Del key when card focused
els.list?.addEventListener('keydown', e => {
	if (e.key === 'Delete') {
		const card = document.activeElement.closest?.('.prompt-card');
		if (card && confirm('Delete this prompt?')) deletePrompt(card.dataset.id);
	}
});

function initFocusableCards() {
	els.list.querySelectorAll('.prompt-card').forEach(card => {
		card.tabIndex = 0; // make focusable
	});
}

// Mutation observer to ensure newly rendered cards are focusable
const observer = new MutationObserver(() => initFocusableCards());
observer.observe(els.list, { childList: true });

// Initial boot
loadTheme();
render();
initFocusableCards();

// Expose for debugging (optional)
window.__prompts = prompts;
window.__addPrompt = addPrompt;
window.__deletePrompt = deletePrompt;
