// Minimal Prompt Library: add, list, delete (localStorage persistence)
const STORAGE_KEY = 'promptLibrary.min.v1';

const form = document.getElementById('promptForm');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const listEl = document.getElementById('promptList');
const emptyEl = document.getElementById('emptyState');
const template = document.getElementById('promptTemplate');

/** @typedef {{id:string,title:string,content:string,createdAt:number}} Prompt */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
let prompts = load();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts)); } catch {}
}

function id() { return Math.random().toString(36).slice(2,10); }

function render() {
  listEl.innerHTML = '';
  if (!prompts.length) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';
  const frag = document.createDocumentFragment();
  for (const p of [...prompts].sort((a,b)=>b.createdAt - a.createdAt)) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = p.id;
    node.querySelector('.prompt-title').textContent = p.title;
    node.querySelector('.prompt-preview').textContent = p.content;
    frag.appendChild(node);
  }
  listEl.appendChild(frag);
}

function addPrompt(title, content) {
  const prompt = { id: id(), title: title.trim(), content: content.trim(), createdAt: Date.now() };
  prompts.push(prompt); save(); render();
}

function deletePrompt(pid) {
  const idx = prompts.findIndex(p=>p.id===pid);
  if (idx !== -1) { prompts.splice(idx,1); save(); render(); }
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title || !content) return;
  addPrompt(title, content);
  form.reset();
  titleInput.focus();
});

listEl.addEventListener('click', e => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  const card = btn.closest('.prompt-card');
  if (card && confirm('Delete this prompt?')) deletePrompt(card.dataset.id);
});

render();
