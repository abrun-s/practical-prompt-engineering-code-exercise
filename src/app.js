// Minimal Prompt Library + 5-Star Rating (add, list, delete, rate)
const STORAGE_KEY = 'promptLibrary.min.v2'; // bumped version for rating integration

const form = document.getElementById('promptForm');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const listEl = document.getElementById('promptList');
const emptyEl = document.getElementById('emptyState');
const template = document.getElementById('promptTemplate');

/** @typedef {{id:string,title:string,content:string,createdAt:number,rating?:number}} Prompt */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(p => ({ ...p, rating: typeof p.rating === 'number' ? clampRating(p.rating) : 0 }));
  } catch { return []; }
}
let prompts = load();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts)); } catch {}
}

function id() { return Math.random().toString(36).slice(2,10); }
function clampRating(n){ n = Number(n); return (n>=0 && n<=5) ? n : 0; }

function makeStarButtons(current){
  const frag = document.createDocumentFragment();
  for(let i=1;i<=5;i++){
    const btn = document.createElement('button');
    btn.className = 'star' + (i<=current?' filled':'');
    btn.type = 'button';
    btn.dataset.star = String(i);
    btn.setAttribute('role','radio');
    btn.setAttribute('aria-label', i + ' star' + (i>1?'s':''));
    btn.setAttribute('aria-checked', i===current ? 'true':'false');
    btn.textContent = '★';
    // Only the selected (or first if none) is tabbable
    btn.tabIndex = (current ? (i===current?0:-1) : (i===1?0:-1));
    frag.appendChild(btn);
  }
  return frag;
}

function render() {
  listEl.innerHTML = '';
  if (!prompts.length) { emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';
  const frag = document.createDocumentFragment();
  // sort by rating desc then createdAt desc
  for (const p of [...prompts].sort((a,b)=> (b.rating||0)-(a.rating||0) || b.createdAt - a.createdAt)) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = p.id;
    node.querySelector('.prompt-title').textContent = p.title;
    node.querySelector('.prompt-preview').textContent = p.content;
    const ratingContainer = node.querySelector('.rating');
    ratingContainer.innerHTML = '';
    ratingContainer.appendChild(makeStarButtons(p.rating||0));
    enhanceRating(ratingContainer, p.id);
    frag.appendChild(node);
  }
  listEl.appendChild(frag);
}

function addPrompt(title, content) {
  const prompt = { id: id(), title: title.trim(), content: content.trim(), createdAt: Date.now(), rating:0 };
  prompts.push(prompt); save(); render();
}

function deletePrompt(pid) {
  const idx = prompts.findIndex(p=>p.id===pid);
  if (idx !== -1) { prompts.splice(idx,1); save(); render(); }
}

function setRating(id, value){
  const p = prompts.find(p=>p.id===id); if(!p) return;
  const newVal = (p.rating === value) ? 0 : clampRating(value); // toggle off if same
  p.rating = newVal; save(); // re-render only that card for simplicity
  render();
}

function enhanceRating(container, pid){
  // Click handling
  container.addEventListener('click', e => {
    const star = e.target.closest('.star');
    if(!star) return;
    setRating(pid, Number(star.dataset.star));
  });
  // Keyboard (radiogroup style)
  container.addEventListener('keydown', e => {
    const stars = [...container.querySelectorAll('.star')];
    const current = stars.find(s => s.getAttribute('aria-checked')==='true');
    let idx = stars.indexOf(current);
    const key = e.key;
    if(['ArrowLeft','ArrowDown'].includes(key)){ e.preventDefault(); idx = Math.max(0, idx-1); setRating(pid, idx+1); stars[idx].focus(); }
    else if(['ArrowRight','ArrowUp'].includes(key)){ e.preventDefault(); idx = Math.min(stars.length-1, idx+1); setRating(pid, idx+1); stars[idx].focus(); }
    else if(key==='Home'){ e.preventDefault(); setRating(pid,1); stars[0].focus(); }
    else if(key==='End'){ e.preventDefault(); setRating(pid,5); stars[4].focus(); }
    else if(/^[1-5]$/.test(key)){ e.preventDefault(); setRating(pid, Number(key)); stars[Number(key)-1].focus(); }
    else if(key==='0'){ e.preventDefault(); setRating(pid,0); container.focus(); }
  });
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
  if (btn) {
    const card = btn.closest('.prompt-card');
    if (card && confirm('Delete this prompt?')) deletePrompt(card.dataset.id);
  }
});

render();
