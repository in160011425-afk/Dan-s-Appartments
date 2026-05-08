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
      loginModal.classList.add('hidden');
      loginModal.classList.remove('active', '!flex');
      if (main) main.classList.remove('hidden');
      if (nav) nav.classList.remove('hidden');
      initializeApp();
    } else {
      loginModal.classList.remove('hidden');
      loginModal.classList.add('active', '!flex');
      if (main) main.classList.add('hidden');
      if (nav) nav.classList.add('hidden');
      clearDashboard();
    }
  });

  // Check initial session
  const { data: { session }, error } = await db.auth.getSession();
  if (error) console.error("Session check error:", error);
  
  const loginModal = document.getElementById('loginModal');
  const main = document.querySelector('main');
  const nav = document.querySelector('nav');

  if (!session) {
    loginModal.classList.remove('hidden');
    loginModal.classList.add('active', '!flex');
    if (main) main.classList.add('hidden');
    if (nav) nav.classList.add('hidden');
  } else {
    loginModal.classList.add('hidden');
    if (main) main.classList.remove('hidden');
    if (nav) nav.classList.remove('hidden');
    initializeApp();
  }
});

window.handleLogin = async function() {
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

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) throw error;
    
    showToast('✅ Welcome back!');
    // Modal will be hidden by onAuthStateChange
  } catch (error) {
    console.error('Login Error:', error);
    showToast('❌ ' + (error.message || 'Login failed'));
    btn.disabled = false;
    btn.textContent = 'Access Dashboard';
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
