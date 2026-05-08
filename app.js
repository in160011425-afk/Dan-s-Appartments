// =============================================
// LANDLORD DASHBOARD — app.js
// =============================================

let currentFilter = 'all';

const db = window._supabase;

if (!db) {
  console.error("Supabase client (db) not initialized! Check rooms.js and Secrets.");
}

// ---- AUTH & INITIALIZATION ----
document.addEventListener('DOMContentLoaded', async () => {
  if (!db) return;


  // Listen for Auth changes
  db.auth.onAuthStateChange((event, session) => {
    console.log('Auth Event:', event);
    const loginModal = document.getElementById('loginModal');
    const main = document.querySelector('main');
    const nav = document.querySelector('nav');
    
    if (session) {
      if (loginModal) {
        loginModal.classList.add('hidden');
        loginModal.classList.remove('active', '!flex');
      }
      if (main) main.classList.remove('hidden');
      if (nav) nav.classList.remove('hidden');
      initializeApp();
    } else {
      if (loginModal) {
        loginModal.classList.remove('hidden');
        loginModal.classList.add('active', '!flex');
      }
      if (main) main.classList.add('hidden');
      if (nav) nav.classList.add('hidden');
      clearDashboard();
    }
  });

  // Check initial session (Persistence)
  const { data: { session }, error } = await db.auth.getSession();
  if (error) console.error("Session check error:", error);
  
  if (session) {
    document.getElementById('loginModal')?.classList.add('hidden');
    document.querySelector('main')?.classList.remove('hidden');
    document.querySelector('nav')?.classList.remove('hidden');
    initializeApp();
  } else {
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('active', '!flex');
    }
  }
});

window.handleLogin = async function() {
  const email = document.getElementById('loginEmail')?.value;
  const password = document.getElementById('loginPassword')?.value;
  const btn = document.getElementById('loginBtn');

  if (!email || !password) {
    alert('⚠️ Email and password required');
    return;
  }

  try {
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Authenticating...</span>';

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) throw error;
    
    // Success: Reload to initialize dashboard with new session
    window.location.reload();
  } catch (error) {
    console.error('Login Error:', error);
    alert('❌ Login Failed: ' + (error.message || 'Check your credentials and try again.'));
    btn.disabled = false;
    btn.textContent = 'Access Dashboard';
  }
};

window.handleLogout = async function() {
  if (confirm('Are you sure you want to sign out?')) {
    await db.auth.signOut();
    window.location.reload();
  }
};

window.switchView = function(view) {
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
};

window.handlePaymentAction = async function(id, status) {
  const updated = await updatePaymentStatus(id, status);
  if (updated) {
    showToast(`Payment for ${updated.tenantName} ${status}`);
    renderPaymentStats();
    renderPayments();
  }
};

window.updateRoomField = async function(roomNumber, field, value) {
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
};

window.saveRoomDetails = async function(roomNumber) {
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
};

window.setFilter = function(filter) {
  currentFilter = filter;
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    if (btn.dataset.filter === filter) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  renderRooms();
};

window.viewReceipt = function(url) {
  const modal = document.getElementById('receiptModal');
  const img = document.getElementById('receiptPreview');
  img.src = url;
  modal.classList.add('active');
};

window.closeReceiptModal = function() {
  document.getElementById('receiptModal').classList.remove('active');
};

window.closeModal = function() {
  document.getElementById('roomModal').classList.remove('active');
};

window.openModal = async function(roomNumber) {
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
};

window.openAddRoomModal = async function() {
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
};

window.createNewRoom = async function() {
  const roomNumber = document.getElementById('newRoomNumber')?.value;
  const roomPassword = document.getElementById('newRoomPassword')?.value;
  const rent = document.getElementById('newRoomRent')?.value;
  const type = document.getElementById('newRoomType')?.value;

  if (!roomNumber || !rent) {
    showToast('⚠️ Room number and rent are required');
    return;
  }

  if (!db) {
    showToast('❌ System Configuration Error: Missing API Credentials.');
    return;
  }

  try {
    const roomPayload = {
      room_number: roomNumber,
      room_password: roomPassword,
      rent: parseFloat(rent),
      type: type,
      status: 'vacant',
      updated_at: new Date().toISOString()
    };

    console.log('Attempting to insert room:', roomPayload);

    const { data, error } = await db
      .from('rooms')
      .insert([roomPayload])
      .select();

    if (error) {
      console.error('Supabase Insert Error:', error);
      alert(`Room creation failed! Error Code: ${error.code}\nMessage: ${error.message}`);
      throw error;
    }

    alert("Success!");
    showToast('✅ New room added successfully');
    
    // Refresh UI
    closeModal();
    await initializeApp();
    
  } catch (error) {
    console.error('Critical Error in createNewRoom:', error);
    showToast('❌ Database write failed');
  }
};

window.downloadRoomReport = async function() {
  if (!db) {
    showToast('❌ System Configuration Error: Missing API Credentials.');
    return;
  }

  const { data, error } = await db.from('rooms').select('*').order('room_number');
  if (error) {
    alert('Failed to fetch rooms for report: ' + error.message);
    return;
  }

  const headers = ['Room Number', 'Type', 'Rent', 'Status', 'Password'];
  const rows = data.map(r => [
    r.room_number,
    r.type,
    r.rent,
    r.status,
    r.room_password
  ]);

  const csvContent = headers.join(',') + '\n' + rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `rooms-inventory-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('📥 Rooms inventory downloaded');
};

window.downloadPaymentReport = async function() {
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

  const csvContent = headers.join(',') + '\n' + rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `rent-payments-report-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('📥 Report downloaded');
};

window.downloadQR = async function() {
  const container = document.getElementById('qrCode');
  const img = container.querySelector('img');
  const canvas = container.querySelector('canvas');
  
  if (!img && !canvas) {
    showToast('❌ No QR code found');
    return;
  }

  try {
    let dataUrl;
    if (canvas) {
      dataUrl = canvas.toDataURL("image/png");
    } else {
      const response = await fetch(img.src);
      const blob = await response.blob();
      dataUrl = URL.createObjectURL(blob);
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `dan-rentals-qr-${new Date().getTime()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!canvas) URL.revokeObjectURL(dataUrl);
    showToast('📥 QR Code downloaded');
  } catch (err) {
    console.error('Download failed:', err);
    showToast('❌ Download failed');
  }
};

window.copyTenantLink = function() {
  const base = window.location.href.replace(/\/[^\/]*$/, '/');
  const tenantUrl = base + 'tenant.html';
  navigator.clipboard.writeText(tenantUrl).then(() => showToast('🔗 Link copied'));
};

// ---- DASHBOARD RENDERING ----
window.initializeApp = async function() {
  await renderStats();
  await renderRooms();
  generateQR();
};

window.clearDashboard = function() {
  const roomGrid = document.getElementById('roomGrid');
  const statsSection = document.getElementById('statsSection');
  if (roomGrid) roomGrid.innerHTML = '';
  if (statsSection) statsSection.innerHTML = '';
};

window.renderStats = async function() {
  const stats = await getRoomStats();
  const section = document.getElementById('statsSection');
  if (!section) return;

  const cards = [
    { label: 'Total', value: stats.total, color: 'gray' },
    { label: 'Vacant', value: stats.vacant, color: 'teal' },
    { label: 'Occupied', value: stats.occupied, color: 'red' },
    { label: 'Reserved', value: stats.reserved, color: 'amber' }
  ];

  section.innerHTML = cards.map(c => `
    <div class="flex-shrink-0 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 min-w-[120px]">
      <p class="text-xs font-bold text-gray-400 uppercase mb-1">${c.label}</p>
      <p class="text-2xl font-black text-gray-900">${c.value}</p>
    </div>
  `).join('');
};

window.renderRooms = async function() {
  const rooms = await loadRooms();
  const grid = document.getElementById('roomGrid');
  if (!grid) return;

  const filtered = rooms.filter(r => currentFilter === 'all' || r.status === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-20 text-center opacity-40">No rooms found matching "${currentFilter}"</div>`;
    return;
  }

  grid.innerHTML = filtered.map(r => `
    <div class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer group" onclick="openModal('${r.roomNumber}')">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-lg font-black text-gray-900">${formatRoomTitle(r.roomNumber)}</h3>
          <p class="text-xs font-bold text-gray-400 uppercase">${r.type}</p>
        </div>
        <span class="badge badge-${r.status}">${r.status}</span>
      </div>
      <div class="flex items-end justify-between">
        <p class="text-xl font-bold text-teal-700">${formatRent(r.rent)}</p>
        <div class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  `).join('');
};

window.renderPaymentStats = async function() {
  const stats = await getPaymentStats();
  const section = document.getElementById('paymentStats');
  if (!section) return;

  const cards = [
    { label: 'Collected', value: formatRent(stats.totalCollected), color: 'teal' },
    { label: 'Paid', value: stats.paidTenants, color: 'teal' },
    { label: 'Unpaid', value: stats.unpaidTenants, color: 'red' },
    { label: 'Late', value: stats.latePayments, color: 'red' },
    { label: 'Pending', value: stats.pendingVerifications, color: 'amber' }
  ];

  section.innerHTML = cards.map(c => `
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">${c.label}</p>
      <p class="text-lg font-black text-gray-900 truncate">${c.value}</p>
    </div>
  `).join('');
};

window.renderPayments = async function() {
  const payments = await loadPayments();
  const tableBody = document.getElementById('paymentTableBody');
  const cardList = document.getElementById('paymentCardList');
  if (!tableBody || !cardList) return;

  const search = document.getElementById('paymentSearch')?.value?.toLowerCase() || '';
  const filter = document.getElementById('statusFilter')?.value || 'all';

  const filtered = payments.filter(p => {
    const matchesSearch = p.tenantName.toLowerCase().includes(search) || p.unitNumber.toLowerCase().includes(search);
    const matchesFilter = filter === 'all' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  tableBody.innerHTML = filtered.map(p => `
    <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td class="py-4 pl-2">
        <p class="font-bold text-gray-900">${p.tenantName}</p>
        <p class="text-xs text-gray-400">Unit ${p.unitNumber}</p>
      </td>
      <td class="py-4 font-bold text-teal-700">${formatRent(p.amount)}</td>
      <td class="py-4 text-xs font-mono text-gray-500">${p.transactionCode}</td>
      <td class="py-4 text-xs text-gray-500">${timeAgo(p.date)}</td>
      <td class="py-4 text-center"><span class="badge badge-${p.status}">${p.status}</span></td>
      <td class="py-4 text-right pr-2">
        <div class="flex justify-end gap-2">
          ${p.receiptImage ? `<button onclick="viewReceipt('${p.receiptImage}')" class="p-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors" title="View Receipt">📄</button>` : ''}
          ${p.status === 'pending' ? `
            <button onclick="handlePaymentAction('${p.id}', 'verified')" class="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">✓</button>
            <button onclick="handlePaymentAction('${p.id}', 'rejected')" class="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">✕</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  cardList.innerHTML = filtered.map(p => `
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div class="flex justify-between items-start mb-3">
        <div>
          <p class="font-bold text-gray-900">${p.tenantName}</p>
          <p class="text-xs text-gray-400">Unit ${p.unitNumber}</p>
        </div>
        <span class="badge badge-${p.status}">${p.status}</span>
      </div>
      <div class="flex justify-between items-center mb-4">
        <p class="font-bold text-teal-700">${formatRent(p.amount)}</p>
        <p class="text-[10px] text-gray-400">${timeAgo(p.date)}</p>
      </div>
      <div class="flex gap-2">
        ${p.receiptImage ? `<button onclick="viewReceipt('${p.receiptImage}')" class="flex-1 py-2 rounded-xl bg-teal-50 text-teal-600 text-xs font-bold">View Receipt</button>` : ''}
        ${p.status === 'pending' ? `
          <button onclick="handlePaymentAction('${p.id}', 'verified')" class="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Verify</button>
          <button onclick="handlePaymentAction('${p.id}', 'rejected')" class="flex-1 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold">Reject</button>
        ` : ''}
      </div>
    </div>
  `).join('');
};

window.filterPayments = function() {
  renderPayments();
};

window.generateQR = function() {
  const container = document.getElementById('qrCode');
  if (!container) return;
  container.innerHTML = '';
  const base = window.location.href.replace(/\/[^\/]*$/, '/');
  const tenantUrl = base + 'tenant.html';
  new QRCode(container, {
    text: tenantUrl,
    width: 160,
    height: 160,
    colorDark: "#0d9488",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
};

window.showToast = function(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
};
