// =============================================
// LANDLORD DASHBOARD — app.js
// =============================================

let currentFilter = 'all';

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', () => {
  initializePayments(); // Ensure data exists
  renderStats();
  renderRooms();
  renderPaymentStats();
  renderPayments();
  generateQR();
});

// ---- NAVIGATION ----
function switchView(view) {
  const roomsView = document.getElementById('roomsView');
  const paymentsView = document.getElementById('paymentsView');
  const navRooms = document.getElementById('nav-rooms');
  const navPayments = document.getElementById('nav-payments');

  if (view === 'rooms') {
    roomsView.classList.remove('hidden');
    paymentsView.classList.add('hidden');
    navRooms.classList.add('active', 'bg-teal-50', 'text-teal-600');
    navRooms.classList.remove('text-gray-400');
    navPayments.classList.remove('active', 'bg-teal-50', 'text-teal-600');
    navPayments.classList.add('text-gray-400');
    renderStats();
    renderRooms();
  } else {
    roomsView.classList.add('hidden');
    paymentsView.classList.remove('hidden');
    navPayments.classList.add('active', 'bg-teal-50', 'text-teal-600');
    navPayments.classList.remove('text-gray-400');
    navRooms.classList.remove('active', 'bg-teal-50', 'text-teal-600');
    navRooms.classList.add('text-gray-400');
    renderPaymentStats();
    renderPayments();
  }
}

// ---- PAYMENT DASHBOARD ----
function renderPaymentStats() {
  const s = getPaymentStats();
  const el = document.getElementById('paymentStats');
  if (!el) return;

  const cards = [
    { label: 'Collected (May)', val: formatRent(s.totalCollected), icon: '💰', color: 'teal' },
    { label: 'Paid Tenants', val: s.paidTenants, icon: '✅', color: 'green' },
    { label: 'Unpaid', val: s.unpaidTenants, icon: '❌', color: 'red' },
    { label: 'Late', val: s.latePayments, icon: '⏳', color: 'amber' },
    { label: 'Pending', val: s.pendingVerifications, icon: '🔍', color: 'purple' }
  ];

  el.innerHTML = cards.map((c, i) => `
    <div class="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm fade-in" style="animation-delay:${i * 0.05}s">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-lg">${c.icon}</span>
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${c.label}</span>
      </div>
      <p class="text-xl font-bold text-gray-900">${c.val}</p>
    </div>
  `).join('');
}

function renderPayments() {
  const payments = loadPayments();
  const searchTerm = document.getElementById('paymentSearch')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';

  const filtered = payments.filter(p => {
    const matchesSearch = p.tenantName.toLowerCase().includes(searchTerm) || p.unitNumber.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const tableBody = document.getElementById('paymentTableBody');
  const cardList = document.getElementById('paymentCardList');

  if (filtered.length === 0) {
    const empty = `<div class="py-10 text-center text-gray-400 col-span-full">No payment records found.</div>`;
    tableBody.innerHTML = `<tr><td colspan="6">${empty}</td></tr>`;
    cardList.innerHTML = empty;
    return;
  }

  // Desktop Table
  tableBody.innerHTML = filtered.map(p => `
    <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td class="py-4 pl-2">
        <div class="font-bold text-gray-900">${p.tenantName}</div>
        <div class="text-xs text-gray-500">${formatRoomTitle(p.unitNumber)}</div>
      </td>
      <td class="py-4 font-bold text-teal-700">${formatRent(p.amount)}</td>
      <td class="py-4 font-mono text-xs text-gray-600">${p.transactionCode}</td>
      <td class="py-4 text-xs text-gray-500">${new Date(p.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
      <td class="py-4 text-center">
        <span class="badge badge-${p.status}">${p.status}</span>
      </td>
      <td class="py-4 text-right pr-2">
        <div class="flex justify-end gap-2">
          <button onclick="viewReceipt('${p.receiptImage}')" class="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200" title="View Receipt">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
          ${p.status === 'pending' ? `
            <button onclick="handlePaymentAction('${p.id}', 'verified')" class="p-2 rounded-xl bg-green-100 text-green-600 hover:bg-green-600 hover:text-white" title="Verify">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </button>
            <button onclick="handlePaymentAction('${p.id}', 'rejected')" class="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-600 hover:text-white" title="Reject">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  // Mobile Cards
  cardList.innerHTML = filtered.map(p => `
    <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100">
      <div class="flex justify-between items-start mb-3">
        <div>
          <div class="font-bold text-gray-900">${p.tenantName}</div>
          <div class="text-xs text-gray-500">${formatRoomTitle(p.unitNumber)} • ${new Date(p.date).toLocaleDateString()}</div>
        </div>
        <span class="badge badge-${p.status}">${p.status}</span>
      </div>
      <div class="flex justify-between items-center">
        <div class="text-sm font-bold text-teal-700">${formatRent(p.amount)} <span class="text-[10px] font-mono text-gray-400 ml-2">${p.transactionCode}</span></div>
        <div class="flex gap-2">
          <button onclick="viewReceipt('${p.receiptImage}')" class="btn-action bg-white border border-gray-200 text-gray-600 py-2 px-3 text-xs">Receipt</button>
          ${p.status === 'pending' ? `
            <button onclick="handlePaymentAction('${p.id}', 'verified')" class="btn-action bg-green-500 text-white py-2 px-3 text-xs">Verify</button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function setFilter(filter) {
  currentFilter = filter;
  const select = document.getElementById('statusFilter');
  if (select) select.value = filter;
  renderPayments();
  renderRooms(); // Update both views if needed
}

function filterPayments() {
  renderPayments();
}

function handlePaymentAction(id, status) {
  const updated = updatePaymentStatus(id, status);
  if (updated) {
    showToast(`Payment for ${updated.tenantName} ${status}`);
    renderPaymentStats();
    renderPayments();
  }
}

function viewReceipt(url) {
  const modal = document.getElementById('receiptModal');
  const img = document.getElementById('receiptPreview');
  img.src = url;
  modal.classList.add('active');
}

function closeReceiptModal() {
  document.getElementById('receiptModal').classList.remove('active');
}

function downloadPaymentReport() {
  const payments = loadPayments();
  const headers = ['Tenant Name', 'Unit Number', 'Amount', 'Transaction Code', 'Status', 'Date', 'Month'];
  const rows = payments.map(p => [
    p.tenantName,
    p.unitNumber,
    p.amount,
    p.transactionCode,
    p.status,
    new Date(p.date).toLocaleDateString(),
    p.month
  ]);

  let csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n"
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `rent-payments-report-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('📥 Report downloaded');
}

// ---- ROOM STATS & CARDS (RE-USE EXISTING) ----
function renderStats() {
  const s = getRoomStats();
  const el = document.getElementById('statsSection');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card fade-in" style="animation-delay:.05s">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-bold">∑</div>
        <span class="text-[10px] font-bold text-gray-400 uppercase">Total</span>
      </div>
      <p class="text-2xl font-bold text-gray-900">${s.total}</p>
    </div>
    <div class="stat-card fade-in" style="animation-delay:.1s">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">✓</div>
        <span class="text-[10px] font-bold text-gray-400 uppercase">Vacant</span>
      </div>
      <p class="text-2xl font-bold text-green-600">${s.vacant}</p>
    </div>
    <div class="stat-card fade-in" style="animation-delay:.15s">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">✕</div>
        <span class="text-[10px] font-bold text-gray-400 uppercase">Occupied</span>
      </div>
      <p class="text-2xl font-bold text-red-500">${s.occupied}</p>
    </div>
    <div class="stat-card fade-in" style="animation-delay:.2s">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">⏳</div>
        <span class="text-[10px] font-bold text-gray-400 uppercase">Reserved</span>
      </div>
      <p class="text-2xl font-bold text-amber-600">${s.reserved}</p>
    </div>
  `;
}

// ... (keep the rest of app.js logic but ensure compatibility)

function renderRooms() {
  const rooms = loadRooms();
  const filtered = currentFilter === 'all' ? rooms : rooms.filter(r => r.status === currentFilter);
  const grid = document.getElementById('roomGrid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state col-span-full text-center py-10 text-gray-400">No rooms found for this filter.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((room, i) => `
    <div class="room-card bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all fade-in" style="animation-delay:${i * 0.05}s" onclick="openModal('${room.roomNumber}')">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg text-gray-900">${formatRoomTitle(room.roomNumber)}</h3>
        <span class="badge badge-${room.status}">${room.status}</span>
      </div>
      <p class="text-sm text-gray-500 mb-2">${room.type}</p>
      <p class="text-xl font-bold text-teal-700">${formatRent(room.rent)}<span class="text-[10px] font-normal text-gray-400 ml-1">/mo</span></p>
    </div>
  `).join('');
}

// ... (keep openModal, closeModal, etc.)

// ---- TOAST ----
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ---- QR CODE ----
function generateQR() {
  const container = document.getElementById('qrCode');
  if (!container) return;
  container.innerHTML = '';
  const base = window.location.href.replace(/\/[^\/]*$/, '/');
  const tenantUrl = base + 'tenant.html';
  new QRCode(container, {
    text: tenantUrl,
    width: 140,
    height: 140,
    colorDark: '#0d9488',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

function downloadQR() {
  const canvas = document.querySelector('#qrCode canvas');
  if (!canvas) { showToast('⚠️ QR code not ready'); return; }
  const link = document.createElement('a');
  link.download = 'rentals-qr.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function copyTenantLink() {
  const base = window.location.href.replace(/\/[^\/]*$/, '/');
  const tenantUrl = base + 'tenant.html';
  navigator.clipboard.writeText(tenantUrl).then(() => showToast('🔗 Link copied'));
}

// ---- GLOBAL EXPOSURE ----
window.setFilter = setFilter;
window.renderPayments = renderPayments;
window.filterPayments = filterPayments;
window.downloadPaymentReport = downloadPaymentReport;
window.switchView = switchView;
window.handlePaymentAction = handlePaymentAction;
window.viewReceipt = viewReceipt;
window.closeReceiptModal = closeReceiptModal;

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    renderStats();
    renderRooms();
  }
  if (e.key === (typeof PAYMENTS_KEY !== 'undefined' ? PAYMENTS_KEY : 'rentalPayments')) {
    renderPaymentStats();
    renderPayments();
  }
});
