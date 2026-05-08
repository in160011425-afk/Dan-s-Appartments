// =============================================
// LANDLORD DASHBOARD — app.js
// =============================================

let currentFilter = 'all';

// ---- AUTH & INITIALIZATION ----
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Supabase to be ready from rooms.js
  if (!window.supabase) {
    console.error("Supabase client not found. Ensure rooms.js is loaded.");
    return;
  }

  // Listen for Auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth Event:', event);
    const loginModal = document.getElementById('loginModal');
    if (session) {
      loginModal.classList.add('hidden');
      loginModal.classList.remove('active', '!flex');
      initializeApp();
    } else {
      loginModal.classList.remove('hidden');
      loginModal.classList.add('active', '!flex');
      // Clear data on logout
      clearDashboard();
    }
  });

  // Check initial session
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) console.error("Session check error:", error);
  
  if (!session) {
    const modal = document.getElementById('loginModal');
    modal.classList.remove('hidden');
    modal.classList.add('active', '!flex');
  } else {
    initializeApp();
  }
});

async function handleLogin() {
  const email = document.getElementById('loginEmail')?.value;
  const password = document.getElementById('loginPassword')?.value;
  const btn = document.getElementById('loginBtn');

  if (!email || !password) {
    showToast('⚠️ Email and password required');
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Authenticating...</span>';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;
    
    showToast('✅ Welcome back!');
    // Modal will be hidden by onAuthStateChange
  } catch (error) {
    console.error('Login Error:', error);
    showToast('❌ ' + (error.message || 'Login failed'));
    btn.disabled = false;
    btn.textContent = 'Access Dashboard';
  }
}

function clearDashboard() {
  const containers = ['statsSection', 'roomGrid', 'paymentStats', 'paymentTableBody', 'paymentCardList'];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
}

async function initializeApp() {
  await renderStats();
  await renderRooms();
  await renderPaymentStats();
  await renderPayments();
  generateQR();
}

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
    generateQR();
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
async function renderPaymentStats() {
  const s = await getPaymentStats();
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

async function renderPayments() {
  const payments = await loadPayments();
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
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="6">${empty}</td></tr>`;
    if (cardList) cardList.innerHTML = empty;
    return;
  }

  // Desktop Table
  if (tableBody) {
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
  }

  // Mobile Cards
  if (cardList) {
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
}

async function handlePaymentAction(id, status) {
  const updated = await updatePaymentStatus(id, status);
  if (updated) {
    showToast(`Payment for ${updated.tenantName} ${status}`);
    renderPaymentStats();
    renderPayments();
  }
}

// ---- ROOM MANAGEMENT ----
async function renderStats() {
  const s = await getRoomStats();
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

async function renderRooms() {
  const rooms = await loadRooms();
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

async function openModal(roomNumber) {
  const room = await findRoom(roomNumber);
  if (!room) return;

  const modal = document.getElementById('roomModal');
  const body = document.getElementById('modalBody');

  body.innerHTML = `
    <div class="p-6">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">${formatRoomTitle(room.roomNumber)}</h2>
          <p class="text-sm text-gray-500">${room.type}</p>
        </div>
        <button onclick="closeModal()" class="p-2 rounded-xl bg-gray-100 text-gray-400">✕</button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</label>
          <div class="grid grid-cols-3 gap-2">
            ${['vacant', 'occupied', 'reserved'].map(s => `
              <button onclick="updateRoomField('${room.roomNumber}', 'status', '${s}')" class="py-3 px-2 rounded-xl text-xs font-bold capitalize transition-all ${room.status === s ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Room Password (for Tenant Portal)</label>
          <input type="text" id="roomPasswordInput" value="${room.roomPassword || ''}" placeholder="Enter password..." class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-teal-500 text-sm">
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Monthly Rent</label>
            <input type="number" id="roomRentInput" value="${room.rent}" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-teal-500 text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Room Type</label>
            <input type="text" id="roomTypeInput" value="${room.type}" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-teal-500 text-sm">
          </div>
        </div>

        <button onclick="saveRoomDetails('${room.roomNumber}')" class="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-100 mt-4 transition-all active:scale-95">
          Save All Changes
        </button>
      </div>
    </div>
  `;
  modal.classList.add('active');
}

async function updateRoomField(roomNumber, field, value) {
  const updates = {};
  updates[field] = value;
  const res = await updateRoom(roomNumber, updates);
  if (res) {
    showToast(`Updated ${field}`);
    await renderStats();
    await renderRooms();
    // Refresh modal
    openModal(roomNumber);
  }
}

async function saveRoomDetails(roomNumber) {
  const password = document.getElementById('roomPasswordInput').value;
  const rent = document.getElementById('roomRentInput').value;
  const type = document.getElementById('roomTypeInput').value;

  const updates = {
    roomPassword: password,
    rent: parseInt(rent),
    type: type
  };

  const res = await updateRoom(roomNumber, updates);
  if (res) {
    showToast('Room details updated');
    closeModal();
    await renderStats();
    await renderRooms();
  }
}

function closeModal() {
  document.getElementById('roomModal').classList.remove('active');
}

// ---- UI UTILS ----
function setFilter(filter) {
  currentFilter = filter;
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    if (btn.dataset.filter === filter) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  renderRooms();
}

function filterPayments() {
  renderPayments();
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
  
  if (typeof QRCode === 'undefined') {
    console.error('QRCode library not loaded');
    container.innerHTML = '<p class="text-red-500 text-xs">QR Library Error</p>';
    return;
  }

  container.innerHTML = '';
  
  // Robust URL construction
  let base = window.location.origin + window.location.pathname;
  if (!base.endsWith('/')) {
    base = base.substring(0, base.lastIndexOf('/') + 1);
  }
  const tenantUrl = base + 'tenant.html';
  
  console.log('Generating QR for:', tenantUrl);

  try {
    new QRCode(container, {
      text: tenantUrl,
      width: 160,
      height: 160,
      colorDark: '#0d9488',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (err) {
    console.error('QR Generation Failed:', err);
  }
}

function copyTenantLink() {
  const base = window.location.href.replace(/\/[^\/]*$/, '/');
  const tenantUrl = base + 'tenant.html';
  navigator.clipboard.writeText(tenantUrl).then(() => showToast('🔗 Link copied'));
}

async function openAddRoomModal() {
  const modal = document.getElementById('roomModal');
  const body = document.getElementById('modalBody');

  body.innerHTML = `
    <div class="p-6">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Add New Room</h2>
          <p class="text-sm text-gray-500">Create a new property listing</p>
        </div>
        <button onclick="closeModal()" class="p-2 rounded-xl bg-gray-100 text-gray-400">✕</button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Room Number</label>
          <input type="text" id="newRoomNumber" placeholder="e.g. 11" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-teal-500 text-sm">
        </div>
        
        <div>
          <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Room Password (for Tenant Portal)</label>
          <input type="text" id="newRoomPassword" placeholder="Set access password..." class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-teal-500 text-sm">
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Monthly Rent</label>
            <input type="number" id="newRoomRent" placeholder="8500" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-teal-500 text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Room Type</label>
            <input type="text" id="newRoomType" placeholder="Bedsitter" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-teal-500 text-sm">
          </div>
        </div>

        <button onclick="createNewRoom()" class="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-100 mt-4 transition-all active:scale-95">
          Create Room Listing
        </button>
      </div>
    </div>
  `;
  modal.classList.add('active');
}

async function createNewRoom() {
  const roomNumber = document.getElementById('newRoomNumber')?.value;
  const roomPassword = document.getElementById('newRoomPassword')?.value;
  const rent = document.getElementById('newRoomRent')?.value;
  const type = document.getElementById('newRoomType')?.value;

  if (!roomNumber || !rent) {
    showToast('⚠️ Room number and rent are required');
    return;
  }

  if (!supabase) {
    showToast('❌ System Configuration Error: Missing API Credentials.');
    return;
  }

  try {
    // Step 1: Check for existing apartment context if missing
    let apartmentId = null;
    const { data: roomsData } = await supabase.from('rooms').select('apartment_id').limit(1);
    if (roomsData && roomsData.length > 0) {
      apartmentId = roomsData[0].apartment_id;
    } else {
      // Try to fetch from apartments table directly if rooms is empty
      const { data: aptData } = await supabase.from('apartments').select('id').limit(1);
      if (aptData && aptData.length > 0) apartmentId = aptData[0].id;
    }

    const roomPayload = {
      room_number: roomNumber,
      room_password: roomPassword,
      rent: parseInt(rent),
      type: type,
      status: 'vacant',
      updated_at: new Date().toISOString()
    };

    if (apartmentId) {
      roomPayload.apartment_id = apartmentId;
    }

    console.log('Creating room with payload:', roomPayload);

    const { data, error } = await supabase
      .from('rooms')
      .insert([roomPayload])
      .select();

    if (error) {
      console.error('Supabase Write Error:', error);
      // Specific check for RLS or missing fields
      if (error.code === '42P01') throw new Error('Table "rooms" not found.');
      if (error.code === '23502') throw new Error(`Missing required field: ${error.details || 'Check apartment_id'}`);
      throw error;
    }

    showToast('✅ New room added successfully');
    
    // Refresh UI
    closeModal();
    await initializeApp(); // Full refresh to ensure consistency
    
  } catch (error) {
    console.error('Critical Error in createNewRoom:', error);
    showToast('❌ ' + (error.message || 'Unknown database error'));
  }
}

async function downloadPaymentReport() {
  const payments = await loadPayments();
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

// ---- GLOBAL EXPOSURE ----
window.handleLogin = handleLogin;
window.setFilter = setFilter;
window.renderPayments = renderPayments;
window.filterPayments = filterPayments;
window.switchView = switchView;
window.handlePaymentAction = handlePaymentAction;
window.viewReceipt = viewReceipt;
window.closeReceiptModal = closeReceiptModal;
window.openModal = openModal;
window.closeModal = closeModal;
window.updateRoomField = updateRoomField;
window.saveRoomDetails = saveRoomDetails;
window.copyTenantLink = copyTenantLink;
window.openAddRoomModal = openAddRoomModal;
window.createNewRoom = createNewRoom;
window.downloadPaymentReport = downloadPaymentReport;
