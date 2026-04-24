/**
 * ═══════════════════════════════════════════════════
 * MASKA BUN — SALES DASHBOARD
 * script.js
 * ═══════════════════════════════════════════════════
 */

// ══════════════════════════════════════════
// 1. STATE — single source of truth
// ══════════════════════════════════════════

const STORAGE_KEY = 'maskabun_sales';
const ITEMS_KEY   = 'maskabun_items';
const CATS_KEY    = 'maskabun_cats';

/**
 * Load sales from localStorage (or seed with dummy data on first run).
 */
function loadSales() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);

  // ── Seed data: realistic sample transactions ──
  const now   = Date.now();
  const HOUR  = 3600000;
  const seed  = [
    { id: uid(), item: 'Maska Bun',      cat: 'Bun',   qty: 5,  price: 15, note: '',               ts: now - HOUR * 1   },
    { id: uid(), item: 'Chai',           cat: 'Drink', qty: 3,  price: 10, note: 'Morning batch',   ts: now - HOUR * 1.2 },
    { id: uid(), item: 'Chocolate Bun',  cat: 'Bun',   qty: 4,  price: 20, note: '',               ts: now - HOUR * 2   },
    { id: uid(), item: 'Dry Fruit Bun',  cat: 'Bun',   qty: 2,  price: 25, note: 'Special order',  ts: now - HOUR * 2.5 },
    { id: uid(), item: 'Butter Toast',   cat: 'Snack', qty: 6,  price: 12, note: '',               ts: now - HOUR * 3   },
    { id: uid(), item: 'Maska Bun',      cat: 'Bun',   qty: 8,  price: 15, note: '',               ts: now - HOUR * 4   },
    { id: uid(), item: 'Chai',           cat: 'Drink', qty: 5,  price: 10, note: '',               ts: now - HOUR * 4.5 },
    { id: uid(), item: 'Chocolate Bun',  cat: 'Bun',   qty: 3,  price: 20, note: 'Afternoon rush', ts: now - HOUR * 5   },
    { id: uid(), item: 'Maska Bun',      cat: 'Bun',   qty: 10, price: 15, note: '',               ts: now - HOUR * 6   },
    { id: uid(), item: 'Dry Fruit Bun',  cat: 'Bun',   qty: 1,  price: 25, note: '',               ts: now - HOUR * 7   },
    { id: uid(), item: 'Butter Toast',   cat: 'Snack', qty: 4,  price: 12, note: 'Evening batch',  ts: now - HOUR * 8   },
    { id: uid(), item: 'Chai',           cat: 'Drink', qty: 7,  price: 10, note: '',               ts: now - HOUR * 8.5 },
  ];
  saveSales(seed);
  return seed;
}

/** Persist sales array to localStorage. */
function saveSales(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ── App state ──
let sales    = loadSales();
let searchQ  = '';            // search query string
let currentPage = 1;
const PAGE_SIZE = 10;

// ── Utility: generate a unique ID ──
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ══════════════════════════════════════════
// 2. NAVIGATION
// ══════════════════════════════════════════

const SECTION_TITLES = {
  'overview':      'Overview',
  'transactions':  'Transactions',
  'add-sale':      'Add Sale',
  'manage-items':  'Manage Items & Categories',
  'analytics':     'Analytics',
};

/**
 * Switch the visible section and update active nav link.
 * @param {HTMLElement} el - The clicked nav-item element.
 */
function navigate(el) {
  const sectionId = el.dataset.section;
  if (!sectionId) return;

  // Deactivate all sections and nav items
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Activate target section
  const target = document.getElementById('section-' + sectionId);
  if (target) target.classList.add('active');

  // Activate matching nav item in sidebar
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.dataset.section === sectionId) n.classList.add('active');
  });

  // Update topbar title
  document.getElementById('topbarTitle').textContent = SECTION_TITLES[sectionId] || '';

  // Close sidebar on mobile
  closeSidebar();

  // Re-render whichever section is now active
  switch (sectionId) {
    case 'overview':      renderOverview();      break;
    case 'transactions':  renderTransactions();  break;
    case 'add-sale':      renderGlance();        break;
    case 'manage-items':  renderManageItems();   break;
    case 'analytics':     renderAnalytics();     break;
  }
}

// ══════════════════════════════════════════
// 3. SIDEBAR TOGGLE (mobile)
// ══════════════════════════════════════════

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ══════════════════════════════════════════
// 4. TOAST NOTIFICATION
// ══════════════════════════════════════════

let toastTimer = null;

/**
 * Show a brief toast message.
 * @param {string} msg
 */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ══════════════════════════════════════════
// 5. KPI COMPUTATION HELPERS
// ══════════════════════════════════════════

/** Compute aggregate metrics from the full sales array. */
function getKPIs(arr = sales) {
  const revenue      = arr.reduce((s, t) => s + t.price * t.qty, 0);
  const itemsSold    = arr.reduce((s, t) => s + t.qty, 0);
  const orders       = arr.length;
  const avg          = orders ? revenue / orders : 0;
  return { revenue, itemsSold, orders, avg };
}

/** Build an item-level quantity map: { itemName: totalQty } */
function getItemBreakdown(arr = sales) {
  const map = {};
  arr.forEach(t => {
    map[t.item] = (map[t.item] || 0) + t.qty;
  });
  return map;
}

/** Build a category-level revenue/qty map */
function getCategoryBreakdown(arr = sales) {
  const rev = {}, qty = {};
  arr.forEach(t => {
    rev[t.cat] = (rev[t.cat] || 0) + t.price * t.qty;
    qty[t.cat] = (qty[t.cat] || 0) + t.qty;
  });
  return { rev, qty };
}

// ══════════════════════════════════════════
// 6. OVERVIEW RENDER
// ══════════════════════════════════════════

function renderOverview() {
  const kpi = getKPIs();

  // Update KPI cards
  document.getElementById('kpiRevenue').textContent = `₹${kpi.revenue}`;
  document.getElementById('kpiOrders').textContent  = kpi.orders;
  document.getElementById('kpiItems').textContent   = kpi.itemsSold;
  document.getElementById('kpiAvg').textContent     = `₹${kpi.avg.toFixed(0)}`;

  // Delta labels (static context for demo)
  document.getElementById('kpiRevenueDelta').textContent = kpi.revenue > 0 ? '↑ Today' : 'No sales yet';
  document.getElementById('kpiRevenueDelta').className   = 'stat-delta ' + (kpi.revenue > 0 ? 'positive' : '');

  // Recent transactions (last 5)
  const recent = [...sales].sort((a, b) => b.ts - a.ts).slice(0, 5);
  const tbody  = document.getElementById('recentTableBody');

  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px;">No transactions yet.</td></tr>`;
  } else {
    tbody.innerHTML = recent.map(t => `
      <tr>
        <td>${t.item}</td>
        <td>${t.qty}</td>
        <td class="amount-cell">₹${t.price * t.qty}</td>
        <td>${formatTime(t.ts)}</td>
      </tr>
    `).join('');
  }

  // Top items (sorted by qty, top 5)
  const breakdown = getItemBreakdown();
  const topItems  = Object.entries(breakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxQty    = topItems.length ? topItems[0][1] : 1;
  const listEl    = document.getElementById('topItemsList');

  if (!topItems.length) {
    listEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text3);">No data.</div>`;
  } else {
    listEl.innerHTML = topItems.map(([name, qty], i) => `
      <div class="top-item-row">
        <span class="top-item-rank">#${i + 1}</span>
        <span class="top-item-name">${name}</span>
        <div class="top-item-bar-wrap">
          <div class="top-item-bar" style="width:${(qty / maxQty * 100).toFixed(0)}%"></div>
        </div>
        <span class="top-item-qty">${qty}</span>
      </div>
    `).join('');
  }
}

// ══════════════════════════════════════════
// 7. TRANSACTIONS RENDER + PAGINATION
// ══════════════════════════════════════════

/**
 * Returns filtered + sorted subset of sales.
 */
function getFilteredSales() {
  const catFilter  = document.getElementById('filterCategory').value;
  const sortOrder  = document.getElementById('filterSort').value;
  const q          = searchQ.toLowerCase();

  let arr = [...sales];

  // Filter by category
  if (catFilter) arr = arr.filter(t => t.cat === catFilter);

  // Filter by search query (item name or note)
  if (q) arr = arr.filter(t => t.item.toLowerCase().includes(q) || t.note.toLowerCase().includes(q));

  // Sort
  switch (sortOrder) {
    case 'newest':  arr.sort((a, b) => b.ts - a.ts);                  break;
    case 'oldest':  arr.sort((a, b) => a.ts - b.ts);                  break;
    case 'highest': arr.sort((a, b) => (b.price*b.qty) - (a.price*a.qty)); break;
    case 'lowest':  arr.sort((a, b) => (a.price*a.qty) - (b.price*b.qty)); break;
  }

  return arr;
}

/** Render the transactions table with pagination. */
function renderTransactions() {
  const filtered = getFilteredSales();
  const total    = filtered.length;
  const pages    = Math.ceil(total / PAGE_SIZE) || 1;

  // Clamp current page
  if (currentPage > pages) currentPage = pages;

  const start  = (currentPage - 1) * PAGE_SIZE;
  const paged  = filtered.slice(start, start + PAGE_SIZE);
  const tbody  = document.getElementById('salesTableBody');
  const empty  = document.getElementById('tableEmpty');

  if (!paged.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = paged.map((t, i) => `
      <tr data-id="${t.id}">
        <td>${start + i + 1}</td>
        <td><strong>${t.item}</strong>${t.note ? `<div style="font-size:11px;color:var(--text3);margin-top:1px;">${t.note}</div>` : ''}</td>
        <td><span class="cat-badge ${t.cat}">${t.cat}</span></td>
        <td>${t.qty}</td>
        <td>₹${t.price}</td>
        <td class="amount-cell">₹${t.price * t.qty}</td>
        <td>${formatDateTime(t.ts)}</td>
        <td><button class="btn-del" onclick="deleteSale('${t.id}')">✕ Delete</button></td>
      </tr>
    `).join('');
  }

  renderPagination(pages);
}

/** Render pagination buttons. */
function renderPagination(pages) {
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = '';

  html += `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>‹</button>`;

  for (let p = 1; p <= pages; p++) {
    html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  }

  html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === pages ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>›</button>`;

  el.innerHTML = html;
}

function goPage(p) {
  const filtered = getFilteredSales();
  const pages    = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  currentPage    = Math.max(1, Math.min(p, pages));
  renderTransactions();
}

// ══════════════════════════════════════════
// 8. DELETE A SALE
// ══════════════════════════════════════════

/**
 * Remove a transaction by ID, persist, and re-render.
 * @param {string} id
 */
function deleteSale(id) {
  if (!confirm('Delete this transaction?')) return;
  sales = sales.filter(t => t.id !== id);
  saveSales(sales);
  renderTransactions();
  renderOverview();
  renderGlance();
  toast('🗑️ Transaction deleted');
}

// ══════════════════════════════════════════
// 9. SEARCH (top bar)
// ══════════════════════════════════════════

function handleSearch() {
  searchQ     = document.getElementById('searchInput').value;
  currentPage = 1;

  // Only rerender transactions section (search is global but only applies visually there)
  const activeSection = document.querySelector('.section.active');
  if (activeSection && activeSection.id === 'section-transactions') {
    renderTransactions();
  } else {
    // Auto-navigate to transactions if user is searching
    if (searchQ) {
      document.querySelectorAll('.nav-item').forEach(n => {
        if (n.dataset.section === 'transactions') navigate(n);
      });
    }
  }
}

// ══════════════════════════════════════════
// 10. ADD SALE FORM
// ══════════════════════════════════════════

/**
 * Autofill price and category when a preset item is selected.
 */
function autofillPrice() {
  const sel   = document.getElementById('formItem');
  const val   = sel.value;
  const cng   = document.getElementById('customNameGroup');
  const price = document.getElementById('formPrice');
  const cat   = document.getElementById('formCategory');

  if (val === 'custom') {
    cng.style.display = 'flex';
    price.value = '';
    cat.value   = 'Other';
  } else if (val) {
    cng.style.display = 'none';
    const [, p, c] = val.split('|');
    price.value = p;
    cat.value   = c;
  } else {
    cng.style.display = 'none';
    price.value = '';
  }

  updateFormTotal();
}

/**
 * Update the live total preview in the form.
 */
function updateFormTotal() {
  const price   = parseFloat(document.getElementById('formPrice').value) || 0;
  const qty     = parseInt(document.getElementById('formQty').value)     || 0;
  const total   = price * qty;
  document.getElementById('formTotalPreview').innerHTML =
    `Total: <strong>₹${total.toFixed(2)}</strong>`;
}

// Wire up price input to also update total
document.getElementById('formPrice').addEventListener('input', updateFormTotal);

/**
 * Validate and submit a new sale entry.
 * @param {Event} e
 */
function submitSale(e) {
  e.preventDefault();

  const selVal       = document.getElementById('formItem').value;
  const isCustom     = selVal === 'custom';
  const customName   = document.getElementById('formCustomName').value.trim();
  const priceVal     = parseFloat(document.getElementById('formPrice').value);
  const qtyVal       = parseInt(document.getElementById('formQty').value);
  const cat          = document.getElementById('formCategory').value;
  const note         = document.getElementById('formNote').value.trim();

  // ── Validation ──
  let valid = true;

  const itemName = isCustom ? customName : (selVal ? selVal.split('|')[0] : '');

  if (!itemName) {
    highlight('formItem', true);
    if (isCustom) highlight('formCustomName', true);
    valid = false;
  }

  if (isNaN(priceVal) || priceVal < 0) {
    highlight('formPrice', true);
    valid = false;
  }

  if (isNaN(qtyVal) || qtyVal < 1) {
    highlight('formQty', true);
    valid = false;
  }

  if (!valid) { toast('⚠️ Please fill all required fields correctly.'); return; }

  // ── Create entry ──
  const entry = {
    id:    uid(),
    item:  itemName,
    cat,
    qty:   qtyVal,
    price: priceVal,
    note,
    ts:    Date.now(),
  };

  sales.unshift(entry);   // Add to front (newest first)
  saveSales(sales);
  currentPage = 1;

  // Update all sections
  renderGlance();
  renderOverview();

  resetForm();
  toast(`✅ Sale recorded: ${qtyVal}× ${itemName} (₹${priceVal * qtyVal})`);
}

/**
 * Toggle error styling on a field.
 * @param {string} id
 * @param {boolean} isError
 */
function highlight(id, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  if (isError) {
    el.classList.add('error');
    el.addEventListener('input', () => el.classList.remove('error'), { once: true });
  } else {
    el.classList.remove('error');
  }
}

/** Reset the add-sale form to initial state. */
function resetForm() {
  document.getElementById('addSaleForm').reset();
  document.getElementById('customNameGroup').style.display = 'none';
  document.getElementById('formTotalPreview').innerHTML = 'Total: <strong>₹0.00</strong>';
}

// ══════════════════════════════════════════
// 11. "TODAY AT A GLANCE" (Add Sale sidebar)
// ══════════════════════════════════════════

function renderGlance() {
  const kpi  = getKPIs();
  const last = sales.length ? sales[0] : null;   // newest

  document.getElementById('glanceRevenue').textContent = `₹${kpi.revenue}`;
  document.getElementById('glanceOrders').textContent  = kpi.orders;
  document.getElementById('glanceItems').textContent   = kpi.itemsSold;
  document.getElementById('glanceLast').textContent    = last ? `${last.item} (₹${last.price * last.qty})` : '—';
}

// ══════════════════════════════════════════
// 12. WHATSAPP SHARE
// ══════════════════════════════════════════

function sendWhatsApp() {
  if (!sales.length) { toast('⚠️ No sales to share yet.'); return; }

  const kpi  = getKPIs();
  const bd   = getItemBreakdown();
  const top  = Object.entries(bd).sort((a, b) => b[1] - a[1]);
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  let msg = `🧁 *Maska Bun — Sales Summary*\n📅 ${date}\n\n`;
  msg    += `💰 *Total Revenue: ₹${kpi.revenue}*\n`;
  msg    += `🛍️ Items Sold: ${kpi.itemsSold}\n`;
  msg    += `🧾 Transactions: ${kpi.orders}\n`;
  msg    += `📊 Avg Order: ₹${kpi.avg.toFixed(0)}\n\n`;
  msg    += `📋 *Item Breakdown:*\n`;
  top.forEach(([name, qty]) => { msg += `  • ${name}: ${qty}\n`; });
  if (top.length) msg += `\n🏆 Top Item: *${top[0][0]}*`;
  msg    += `\n\n_Sent via Maska Bun Sales Dashboard_`;

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// ══════════════════════════════════════════
// 13. ANALYTICS RENDER
// ══════════════════════════════════════════

function renderAnalytics() {
  const { rev, qty } = getCategoryBreakdown();
  const bd            = getItemBreakdown();

  // Revenue by category
  renderBarChart('catChart', rev, '₹', 'Revenue');

  // Units by category
  renderBarChart('unitChart', qty, '', 'Units');

  // Top 5 items by qty
  const top5 = Object.entries(bd).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const top5map = Object.fromEntries(top5);
  renderBarChart('top5Chart', top5map, '', 'Units');
}

/**
 * Render a horizontal bar chart inside a container.
 * @param {string} containerId
 * @param {Object} dataMap  - { label: value }
 * @param {string} prefix   - '₹' or ''
 * @param {string} suffix
 */
function renderBarChart(containerId, dataMap, prefix, suffix) {
  const el      = document.getElementById(containerId);
  const entries = Object.entries(dataMap);

  if (!entries.length) {
    el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text3);">No data yet.</div>`;
    return;
  }

  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  el.innerHTML = entries.map(([label, val]) => `
    <div class="chart-row">
      <span class="chart-label">${label}</span>
      <div class="chart-track">
        <div class="chart-fill" style="width:${(val / maxVal * 100).toFixed(0)}%">
          ${val > maxVal * 0.25 ? prefix + val : ''}
        </div>
      </div>
      <span class="chart-val">${prefix}${val}</span>
    </div>
  `).join('');
}

// ══════════════════════════════════════════
// 14. CSV EXPORT
// ══════════════════════════════════════════

function exportCSV() {
  const filtered = getFilteredSales();
  if (!filtered.length) { toast('⚠️ No data to export.'); return; }

  const header = ['#', 'Item', 'Category', 'Qty', 'Unit Price (₹)', 'Total (₹)', 'Note', 'Date & Time'];
  const rows   = filtered.map((t, i) => [
    i + 1,
    `"${t.item}"`,
    t.cat,
    t.qty,
    t.price,
    t.price * t.qty,
    `"${t.note}"`,
    `"${formatDateTime(t.ts)}"`,
  ]);

  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `maskabun-sales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('⬇️ CSV exported successfully!');
}

// ══════════════════════════════════════════
// 15. FORMAT HELPERS
// ══════════════════════════════════════════

/** Format a timestamp as HH:MM */
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** Format a timestamp as DD MMM, HH:MM */
function formatDateTime(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Update the sidebar date string. */
function updateSidebarDate() {
  const el = document.getElementById('sidebarDate');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// ══════════════════════════════════════════
// 17. MANAGE ITEMS & CATEGORIES — STATE
// ══════════════════════════════════════════

/**
 * Default categories (seeded on first run).
 * Each category: { id, name, color }
 */
function loadCategories() {
  const stored = localStorage.getItem(CATS_KEY);
  if (stored) return JSON.parse(stored);
  const defaults = [
    { id: 'cat-1', name: 'Bun',   color: '#C4531A' },
    { id: 'cat-2', name: 'Drink', color: '#1A6BC4' },
    { id: 'cat-3', name: 'Snack', color: '#2E7D32' },
    { id: 'cat-4', name: 'Sweet', color: '#8A1A40' },
    { id: 'cat-5', name: 'Other', color: '#555555' },
  ];
  saveCategories(defaults);
  return defaults;
}

function saveCategories(arr) {
  localStorage.setItem(CATS_KEY, JSON.stringify(arr));
}

/**
 * Default menu items (seeded on first run).
 * Each item: { id, name, price, catId, desc }
 */
function loadMenuItems() {
  const stored = localStorage.getItem(ITEMS_KEY);
  if (stored) return JSON.parse(stored);
  const defaults = [
    { id: 'item-1', name: 'Maska Bun',     price: 29, catId: 'cat-1', desc: 'Classic butter bun' },
    { id: 'item-2', name: 'Chocolate Bun', price: 39, catId: 'cat-1', desc: 'Rich chocolate glaze' },
    { id: 'item-3', name: 'Dry Fruit Bun', price: 70, catId: 'cat-1', desc: 'Mixed dry fruit filling' },
    { id: 'item-4', name: 'gullabjam masaka bun',          price: 49, catId: 'cat-2', desc: 'gullabjam' },
    { id: 'item-5', name: 'flavour masaka bun',  price: 35, catId: 'cat-3', desc: 'Crispy tasted masakabun' },
  ];
  saveMenuItems(defaults);
  return defaults;
}

function saveMenuItems(arr) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(arr));
}

// Live state for items + categories
let menuItems  = loadMenuItems();
let categories = loadCategories();

// ══════════════════════════════════════════
// 18. MANAGE ITEMS — RENDER
// ══════════════════════════════════════════

/** Main render entry for the entire Manage Items section. */
function renderManageItems() {
  populateCategoryDropdown();
  renderItemsTable();
  renderCatsTable();
}

/**
 * Populate the category <select> in the item form
 * with all current categories.
 */
function populateCategoryDropdown() {
  const sel = document.getElementById('miCategory');
  if (!sel) return;
  sel.innerHTML = categories.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join('');
}

/** Render the items table, filtered by the search input. */
function renderItemsTable() {
  const q      = (document.getElementById('itemSearchInput')?.value || '').toLowerCase();
  const tbody  = document.getElementById('itemsTableBody');
  const empty  = document.getElementById('itemsTableEmpty');
  const badge  = document.getElementById('itemCountBadge');

  let filtered = menuItems;
  if (q) filtered = menuItems.filter(i =>
    i.name.toLowerCase().includes(q) ||
    getCatName(i.catId).toLowerCase().includes(q)
  );

  badge.textContent = menuItems.length;

  if (!filtered.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = filtered.map((item, idx) => {
    const cat = categories.find(c => c.id === item.catId);
    const badgeStyle = cat
      ? `background:${hexToRgba(cat.color, 0.15)};color:${cat.color};`
      : '';
    return `
      <tr data-id="${item.id}">
        <td>${idx + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>
          <span class="cat-badge" style="${badgeStyle}">
            ${cat ? cat.name : '—'}
          </span>
        </td>
        <td class="amount-cell">₹${item.price}</td>
        <td style="color:var(--text3);font-size:12px;">${item.desc || '—'}</td>
        <td>
          <button class="btn-edit-row" onclick="startEditItem('${item.id}')">✏️ Edit</button>
          <button class="btn-del"      onclick="deleteMenuItem('${item.id}')">✕ Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

/** Render the categories table. */
function renderCatsTable() {
  const tbody = document.getElementById('catsTableBody');
  const empty = document.getElementById('catsTableEmpty');
  const badge = document.getElementById('catCountBadge');

  badge.textContent = categories.length;

  if (!categories.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = categories.map((cat, idx) => {
    // Count how many menu items belong to this category
    const itemCount = menuItems.filter(i => i.catId === cat.id).length;
    return `
      <tr data-id="${cat.id}">
        <td>${idx + 1}</td>
        <td><strong>${cat.name}</strong></td>
        <td>
          <span class="cat-color-swatch" style="background:${cat.color};"></span>
          <code style="font-size:11px;color:var(--text3);">${cat.color}</code>
        </td>
        <td>
          <span style="font-family:var(--font-display);font-weight:700;color:var(--primary);">
            ${itemCount}
          </span>
          <span style="font-size:11px;color:var(--text3);"> item${itemCount !== 1 ? 's' : ''}</span>
        </td>
        <td>
          <button class="btn-edit-row" onclick="startEditCat('${cat.id}')">✏️ Edit</button>
          <button class="btn-del"      onclick="deleteCat('${cat.id}')">✕ Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ══════════════════════════════════════════
// 19. MANAGE ITEMS — ADD / EDIT / DELETE
// ══════════════════════════════════════════

/**
 * Submit the item form — handles both ADD and EDIT modes.
 * @param {Event} e
 */
function submitManageItem(e) {
  e.preventDefault();

  const editId = document.getElementById('editItemId').value;
  const name   = document.getElementById('miName').value.trim();
  const price  = parseFloat(document.getElementById('miPrice').value);
  const catId  = document.getElementById('miCategory').value;
  const desc   = document.getElementById('miDesc').value.trim();

  // Validation
  if (!name)             { highlight('miName',  true); toast('⚠️ Enter item name');  return; }
  if (isNaN(price) || price < 0) { highlight('miPrice', true); toast('⚠️ Enter valid price'); return; }
  if (!catId)            { highlight('miCategory', true); toast('⚠️ Select a category'); return; }

  if (editId) {
    // ── EDIT existing item ──
    const item = menuItems.find(i => i.id === editId);
    if (item) { item.name = name; item.price = price; item.catId = catId; item.desc = desc; }
    toast(`✅ "${name}" updated`);
  } else {
    // ── ADD new item ──
    menuItems.push({ id: uid(), name, price, catId, desc });
    toast(`✅ "${name}" added to menu`);
  }

  saveMenuItems(menuItems);
  cancelItemEdit();          // reset form
  renderItemsTable();
  syncItemDropdownInSaleForm(); // keep Add Sale dropdown in sync
}

/** Load an item's data into the form for editing. */
function startEditItem(id) {
  const item = menuItems.find(i => i.id === id);
  if (!item) return;

  document.getElementById('editItemId').value  = item.id;
  document.getElementById('miName').value      = item.name;
  document.getElementById('miPrice').value     = item.price;
  document.getElementById('miDesc').value      = item.desc || '';

  // Select the correct category
  populateCategoryDropdown();
  document.getElementById('miCategory').value  = item.catId;

  // Change form heading + button label to indicate edit mode
  document.getElementById('itemFormTitle').textContent  = '✏️ Edit Item';
  document.getElementById('itemSubmitBtn').textContent  = '💾 Update Item';

  // Scroll form into view smoothly
  document.getElementById('itemFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Reset the item form back to "add" mode. */
function cancelItemEdit() {
  document.getElementById('manageItemForm').reset();
  document.getElementById('editItemId').value           = '';
  document.getElementById('itemFormTitle').textContent  = '➕ Add New Item';
  document.getElementById('itemSubmitBtn').textContent  = '💾 Save Item';
}

/** Delete a menu item by ID (with confirmation). */
function deleteMenuItem(id) {
  const item = menuItems.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Delete "${item.name}"? This won't remove past sales records.`)) return;
  menuItems = menuItems.filter(i => i.id !== id);
  saveMenuItems(menuItems);
  renderItemsTable();
  syncItemDropdownInSaleForm();
  toast(`🗑️ "${item.name}" deleted`);
}

// ══════════════════════════════════════════
// 20. MANAGE CATEGORIES — ADD / EDIT / DELETE
// ══════════════════════════════════════════

/**
 * Submit the category form — handles ADD and EDIT modes.
 * @param {Event} e
 */
function submitManageCat(e) {
  e.preventDefault();

  const editId = document.getElementById('editCatId').value;
  const name   = document.getElementById('mcName').value.trim();
  const color  = document.getElementById('mcColor').value;

  if (!name) { highlight('mcName', true); toast('⚠️ Enter category name'); return; }

  // Prevent duplicate category names (case-insensitive)
  const duplicate = categories.find(c =>
    c.name.toLowerCase() === name.toLowerCase() && c.id !== editId
  );
  if (duplicate) { toast(`⚠️ Category "${name}" already exists`); return; }

  if (editId) {
    // ── EDIT existing category ──
    const cat = categories.find(c => c.id === editId);
    if (cat) { cat.name = name; cat.color = color; }
    toast(`✅ Category "${name}" updated`);
  } else {
    // ── ADD new category ──
    categories.push({ id: uid(), name, color });
    toast(`✅ Category "${name}" added`);
  }

  saveCategories(categories);
  cancelCatEdit();
  renderCatsTable();
  populateCategoryDropdown();  // refresh item form dropdown
  syncCategoryFilters();       // keep transaction filter dropdowns in sync
}

/** Load a category into the form for editing. */
function startEditCat(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;

  document.getElementById('editCatId').value = cat.id;
  document.getElementById('mcName').value    = cat.name;
  document.getElementById('mcColor').value   = cat.color;

  document.getElementById('catFormTitle').textContent  = '✏️ Edit Category';
  document.getElementById('catSubmitBtn').textContent  = '💾 Update Category';

  document.getElementById('catFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Reset the category form back to "add" mode. */
function cancelCatEdit() {
  document.getElementById('manageCatForm').reset();
  document.getElementById('editCatId').value           = '';
  document.getElementById('catFormTitle').textContent  = '🗂 Add New Category';
  document.getElementById('catSubmitBtn').textContent  = '💾 Save Category';
}

/**
 * Delete a category.
 * Warns if items are assigned to it.
 */
function deleteCat(id) {
  const cat     = categories.find(c => c.id === id);
  if (!cat) return;
  const inUse   = menuItems.filter(i => i.catId === id).length;
  const warning = inUse
    ? `\n\n⚠️ ${inUse} item(s) use this category. They will show "—" until reassigned.`
    : '';

  if (!confirm(`Delete category "${cat.name}"?${warning}`)) return;

  categories = categories.filter(c => c.id !== id);
  saveCategories(categories);
  renderCatsTable();
  populateCategoryDropdown();
  syncCategoryFilters();
  toast(`🗑️ Category "${cat.name}" deleted`);
}

// ══════════════════════════════════════════
// 21. SYNC HELPERS
// ══════════════════════════════════════════

/**
 * Keep the "Item Name" dropdown in the Add Sale section
 * in sync with the live menuItems list.
 */
function syncItemDropdownInSaleForm() {
  const sel = document.getElementById('formItem');
  if (!sel) return;
  const cur = sel.value;

  const options = menuItems.map(item => {
    const cat = categories.find(c => c.id === item.catId);
    return `<option value="${item.name}|${item.price}|${cat ? cat.name : 'Other'}">${item.name} — ₹${item.price}</option>`;
  }).join('');

  sel.innerHTML =
    `<option value="">— Select or type below —</option>` +
    options +
    `<option value="custom">+ Custom Item</option>`;

  // Restore previous selection if still valid
  if (cur) sel.value = cur;
}

/**
 * Keep the category filter dropdowns in the Transactions section
 * in sync with the live categories list.
 */
function syncCategoryFilters() {
  const filterSel = document.getElementById('filterCategory');
  if (!filterSel) return;
  const cur = filterSel.value;

  filterSel.innerHTML =
    `<option value="">All Categories</option>` +
    categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

  if (cur) filterSel.value = cur;

  // Also sync Add Sale form category dropdown
  const formCat = document.getElementById('formCategory');
  if (formCat) {
    const curCat = formCat.value;
    formCat.innerHTML = categories.map(c =>
      `<option value="${c.name}">${c.name}</option>`
    ).join('');
    if (curCat) formCat.value = curCat;
  }
}

// ══════════════════════════════════════════
// 22. UTILITY HELPERS
// ══════════════════════════════════════════

/** Return category name by ID, or '—' if not found. */
function getCatName(catId) {
  const cat = categories.find(c => c.id === catId);
  return cat ? cat.name : '—';
}

/**
 * Convert a hex color to rgba string.
 * @param {string} hex  e.g. '#C4531A'
 * @param {number} alpha  0–1
 */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ══════════════════════════════════════════
// 16. INIT
// ══════════════════════════════════════════

/**
 * Bootstrap the application on page load.
 */
function init() {
  updateSidebarDate();
  // Load items + categories into memory (already done at top),
  // then sync all dependent dropdowns before first render.
  syncItemDropdownInSaleForm();
  syncCategoryFilters();
  renderOverview();
  renderGlance();
  // Transactions, analytics, and manage-items render on tab switch
}

init();