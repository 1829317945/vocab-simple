/* ═══════════════════════════════════════
   State
═══════════════════════════════════════ */
let words = [];
let selPos = new Set();

/* ═══════════════════════════════════════
   Storage operations (using Promises for MV3)
═══════════════════════════════════════ */
async function loadWords() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_WORDS' });
    words = (res && res.words) ? res.words : [];
  } catch (err) {
    console.error('Failed to load words via message, trying local storage:', err);
    const r = await chrome.storage.local.get(['vocab_words']);
    words = r.vocab_words || [];
  }
  render();
}

async function saveWords() {
  try {
    await chrome.runtime.sendMessage({ type: 'SAVE_WORDS', words });
  } catch (err) {
    console.error('Failed to save words via message, trying local storage:', err);
    await chrome.storage.local.set({ vocab_words: words });
  }
}

/* ═══════════════════════════════════════
   POS toggle
═══════════════════════════════════════ */
document.getElementById('pos-group').addEventListener('click', e => {
  const btn = e.target.closest('.pos-btn');
  if (!btn) return;
  
  const v = btn.dataset.v;
  if (selPos.has(v)) {
    selPos.delete(v);
    btn.classList.remove('on');
  } else {
    selPos.add(v);
    btn.classList.add('on');
  }
});

/* ═══════════════════════════════════════
   Add
═══════════════════════════════════════ */
async function addWord() {
  const wEl = document.getElementById('inp-word');
  const tEl = document.getElementById('inp-trans');
  const eEl = document.getElementById('inp-ex');

  const w = wEl.value.trim();
  const t = tEl.value.trim();
  const e = eEl.value.trim();

  if (!w) { wEl.focus(); showToast('请输入生词', true); return; }
  if (!t) { tEl.focus(); showToast('请输入翻译', true); return; }
  
  if (words.some(x => x.w.toLowerCase() === w.toLowerCase())) {
    showToast(`"${w}" 已存在`, true);
    wEl.select();
    return;
  }

  const newWord = {
    id: Date.now(),
    w,
    t,
    ex: e,
    pos: Array.from(selPos) // Ensure it's an array
  };

  words.unshift(newWord);

  await saveWords();
  
  // Clear inputs and reset UI
  wEl.value = ''; 
  tEl.value = ''; 
  eEl.value = '';
  selPos.clear();
  document.querySelectorAll('.pos-btn.on').forEach(b => b.classList.remove('on'));
  
  render();
  wEl.focus();
  showToast(`已添加 "${w}"`);
}

/* ═══════════════════════════════════════
   Delete
═══════════════════════════════════════ */
async function deleteWord(id) {
  words = words.filter(x => x.id !== id);
  await saveWords();
  render();
  showToast('已删除');
}

/* ═══════════════════════════════════════
   Render
═══════════════════════════════════════ */
function render() {
  const q = document.getElementById('search-inp').value.trim().toLowerCase();
  const el = document.getElementById('word-list');
  const cnt = document.getElementById('count-badge');

  cnt.textContent = `${words.length} 词`;

  const filtered = q
    ? words.filter(x =>
        x.w.toLowerCase().includes(q) ||
        x.t.toLowerCase().includes(q) ||
        (x.ex || '').toLowerCase().includes(q))
    : words;

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state">${q ? '没有匹配的单词' : '还没有生词<br>在上方输入后点添加'}</div>`;
    return;
  }

  el.innerHTML = filtered.map((x, i) => `
    <div class="card">
      <div class="card-num">${i + 1}</div>
      <div class="card-body">
        <div class="card-top">
          <span class="card-word">${esc(x.w)}</span>
          ${(x.pos || []).map(p => `<span class="tag">${esc(p)}</span>`).join('')}
        </div>
        <div class="card-trans">${esc(x.t)}</div>
        ${x.ex ? `<div class="card-ex">${esc(x.ex)}</div>` : ''}
      </div>
      <button class="del-btn" data-id="${x.id}" title="删除">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1 1l9 9M10 1l-9 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`).join('');

  // Re-bind delete events
  el.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = () => deleteWord(Number(btn.dataset.id));
  });
}

/* ═══════════════════════════════════════
   Toast
═══════════════════════════════════════ */
function showToast(msg, isErr) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (isErr ? ' err' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, 2200);
}

/* ═══════════════════════════════════════
   Escape
═══════════════════════════════════════ */
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ═══════════════════════════════════════
   Event Listeners
═══════════════════════════════════════ */
document.getElementById('inp-word').addEventListener('keydown', e => { 
  if (e.key === 'Enter') document.getElementById('inp-trans').focus(); 
});
document.getElementById('inp-trans').addEventListener('keydown', e => { 
  if (e.key === 'Enter') document.getElementById('inp-ex').focus(); 
});
document.getElementById('inp-ex').addEventListener('keydown', e => { 
  if (e.key === 'Enter') addWord(); 
});
document.getElementById('add-btn').addEventListener('click', addWord);
document.getElementById('search-inp').addEventListener('input', render);

/* ═══════════════════════════════════════
   Init
═══════════════════════════════════════ */
loadWords();
document.getElementById('inp-word').focus();
