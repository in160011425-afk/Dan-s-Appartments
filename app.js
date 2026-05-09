// LANDLORD DASHBOARD — app.js
let currentFilter = 'all';

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
function closeModal() { document.getElementById('roomModal')?.classList.remove('active'); }
function closeReceiptModal() { document.getElementById('receiptModal')?.classList.remove('active'); }

// AUTH
document.addEventListener('DOMContentLoaded', async () => {
  const db = window._supabase;
  if (!db) return;
  db.auth.onAuthStateChange((event, session) => {
    const modal = document.getElementById('loginModal');
    const main = document.querySelector('main');
    const nav = document.querySelector('nav');
    if (session) {
      modal?.classList.add('hidden'); modal?.classList.remove('active','!flex');
      main?.classList.remove('hidden'); nav?.classList.remove('hidden');
      initializeApp();
    } else {
      modal?.classList.remove('hidden'); modal?.classList.add('active','!flex');
      main?.classList.add('hidden'); nav?.classList.add('hidden');
    }
  });
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    document.getElementById('loginModal')?.classList.remove('hidden');
    document.getElementById('loginModal')?.classList.add('active','!flex');
    document.querySelector('main')?.classList.add('hidden');
    document.querySelector('nav')?.classList.add('hidden');
  }
});

window.handleLogin = async function() {
  const email = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  const btn = document.getElementById('loginBtn');
  if (!email || !password) { alert('Email and password required'); return; }
  btn.disabled = true; btn.innerHTML = 'Signing in...';
  const { error } = await window._supabase.auth.signInWithPassword({ email, password });
  if (error) { alert('Login Failed: ' + error.message); btn.disabled = false; btn.innerHTML = 'Access Dashboard'; }
};

window.handleLogout = async function() {
  if (!confirm('Sign out?')) return;
  try {
    await window._supabase.auth.signOut();
  } catch (err) {
    console.error('Sign out error:', err);
  } finally {
    window.location.reload();
  }
};

window.initializeApp = async function() {
  await renderStats(); await renderRooms(); setTimeout(generateQR, 300);
};

window.switchView = function(view) {
  document.querySelectorAll('.view-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(view + 'View')?.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.id === 'nav-' + view) { n.classList.add('text-teal-600','font-bold','bg-teal-50'); n.classList.remove('text-gray-400'); }
    else { n.classList.remove('text-teal-600','font-bold','bg-teal-50'); n.classList.add('text-gray-400'); }
  });
  if (view === 'rooms') { renderStats(); renderRooms(); setTimeout(generateQR, 300); }
  if (view === 'payments') { renderPaymentStats(); renderPayments(); }
  if (view === 'tenants') renderTenants();
  if (view === 'notices') renderNotices();
  if (view === 'maintenance') renderMaintenance();
};

// ROOMS
window.renderStats = async function() {
  const stats = await getRoomStats();
  const s = document.getElementById('statsSection');
  if (!s) return;
  s.innerHTML = [['Total',stats.total],['Vacant',stats.vacant],['Occupied',stats.occupied],['Reserved',stats.reserved]].map(([l,v]) => `
    <div class="flex-shrink-0 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 min-w-[110px]">
      <p class="text-xs font-bold text-gray-400 uppercase mb-1">${l}</p>
      <p class="text-2xl font-black text-gray-900">${v}</p>
    </div>`).join('');
};

window.setFilter = function(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  renderRooms();
};

window.renderRooms = async function() {
  const rooms = await loadRooms();
  const grid = document.getElementById('roomsList');
  if (!grid) return;
  const filtered = rooms.filter(r => currentFilter === 'all' || (r.status||'vacant').toLowerCase() === currentFilter.toLowerCase());
  if (!filtered.length) { grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400">No ${currentFilter} rooms found.</div>`; return; }
  grid.innerHTML = filtered.map(r => `
    <div class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer group" onclick="openModal('${r.roomNumber}')">
      <div class="flex justify-between items-start mb-4">
        <div><h3 class="text-lg font-black text-gray-900">${formatRoomTitle(r.roomNumber)}</h3><p class="text-xs font-bold text-gray-400 uppercase">Room Details</p></div>
        <span class="badge badge-${(r.status||'vacant').toLowerCase()}">${r.status||'vacant'}</span>
      </div>
      <p class="text-xl font-bold text-teal-700">${formatRent(r.rent)}</p>
    </div>`).join('');
};

window.openModal = async function(roomNumber) {
  const room = await findRoom(roomNumber);
  if (!room) return;
  document.getElementById('modalBody').innerHTML = `
    <div class="p-6">
      <div class="flex justify-between items-start mb-6">
        <div><h3 class="text-xl font-bold text-gray-900">${formatRoomTitle(room.roomNumber)}</h3></div>
        <span class="badge badge-${(room.status||'vacant').toLowerCase()}">${room.status||'vacant'}</span>
      </div>
      <div class="space-y-4">
        <div><label class="block text-xs font-bold text-gray-400 uppercase mb-2">Monthly Rent (KES)</label>
          <input type="number" id="roomRentInput" value="${room.rent||''}" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm"></div>
        <div><label class="block text-xs font-bold text-gray-400 uppercase mb-2">Status</label>
          <select id="roomStatusInput" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm">
            <option value="vacant" ${(room.status||'').toLowerCase()==='vacant'?'selected':''}>Vacant</option>
            <option value="occupied" ${(room.status||'').toLowerCase()==='occupied'?'selected':''}>Occupied</option>
            <option value="reserved" ${(room.status||'').toLowerCase()==='reserved'?'selected':''}>Reserved</option>
          </select></div>
        <div><label class="block text-xs font-bold text-gray-400 uppercase mb-2">Room Password</label>
          <input type="text" id="roomPasswordInput" value="${room.roomPassword||''}" placeholder="Tenant access password" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm"></div>
        <button onclick="saveRoomDetails('${room.roomNumber}')" class="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl">Save Changes</button>
      </div>
    </div>`;
  document.getElementById('roomModal').classList.add('active');
};

window.saveRoomDetails = async function(roomNumber) {
  const res = await updateRoom(roomNumber, {
    roomPassword: document.getElementById('roomPasswordInput').value,
    rent: parseInt(document.getElementById('roomRentInput').value),
    status: document.getElementById('roomStatusInput').value
  });
  if (res) { showToast('Room updated'); closeModal(); renderStats(); renderRooms(); }
  else alert('Save failed');
};

window.openAddRoomModal = function() {
  document.getElementById('modalBody').innerHTML = `
    <div class="p-6">
      <h3 class="text-xl font-bold text-gray-900 mb-6">Create New Room</h3>
      <div class="space-y-4">
        <input type="text" id="newRoomNumber" placeholder="Room Number (e.g. 5)" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm">
        <input type="number" id="newRoomRent" placeholder="Monthly Rent (KES)" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm">
        <input type="text" id="newRoomPassword" placeholder="Room Password" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm">
        <button onclick="createNewRoom()" class="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl">Create Room</button>
      </div>
    </div>`;
  document.getElementById('roomModal').classList.add('active');
};

window.createNewRoom = async function() {
  const rn = document.getElementById('newRoomNumber').value.trim();
  const rent = parseInt(document.getElementById('newRoomRent').value);
  const pw = document.getElementById('newRoomPassword').value.trim();
  if (!rn || !rent) { alert('Room number and rent required'); return; }
  const { error } = await window._supabase.from('rooms').insert([{ room_number: rn, monthly_rent: rent, status: 'vacant', room_password: pw||null }]);
  if (!error) { showToast('Room created'); closeModal(); renderStats(); renderRooms(); }
  else alert('Failed: ' + error.message);
};

window.generateQR = function() {
  const c = document.getElementById('qrcode');
  if (!c || typeof QRCode === 'undefined') return;
  c.innerHTML = '';
  const url = window.location.href.replace(/\/[^\/]*$/, '/') + 'tenant.html';
  new QRCode(c, { text: url, width: 160, height: 160, colorDark: '#0f172a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
};

window.downloadQR = function() {
  const c = document.getElementById('qrcode');
  if (!c) return;
  const canvas = c.querySelector('canvas');
  const img = c.querySelector('img');
  const src = canvas ? canvas.toDataURL('image/png') : img?.src;
  if (!src) { alert('QR not ready'); return; }
  const a = document.createElement('a'); a.href = src; a.download = 'dans-rentals-qr.png'; a.click();
  showToast('QR downloaded');
};

window.copyTenantLink = function() {
  const url = window.location.href.replace(/\/[^\/]*$/, '/') + 'tenant.html';
  navigator.clipboard.writeText(url).then(() => showToast('Link copied'));
};

// NOTICES
window.renderNotices = async function() {
  const notices = await loadNotices();
  const list = document.getElementById('noticesList');
  if (!list) return;
  if (!notices.length) { list.innerHTML = '<div class="text-center py-12 text-gray-400 italic">No notices yet.</div>'; return; }
  list.innerHTML = notices.map(n => `
    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 fade-in">
      <div class="flex justify-between items-start mb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 text-xl">📢</div>
          <div><h4 class="font-bold text-gray-900">${n.title}</h4>
            <p class="text-xs text-gray-400 uppercase font-bold">${timeAgo(n.created_at)}</p></div>
        </div>
        ${n.priority==='high'?'<span class="text-[9px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg">HIGH</span>':''}
      </div>
      <p class="text-sm text-gray-600 mb-3">${n.content}</p>
      <div class="flex justify-end">
        <button onclick="deleteNotice('${n.id}')" class="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase">Delete</button>
      </div>
    </div>`).join('');
};

window.deleteNotice = async function(id) {
  if (!confirm('Delete this notice?')) return;
  try {
    const { error } = await window._supabase.from('notices').delete().eq('id', id);
    if (error) throw error;
    showToast('Notice deleted');
    renderNotices();
  } catch (err) {
    alert('Failed to delete notice: ' + err.message);
    console.error(err);
  }
};

window.openNoticeModal = function() {
  document.getElementById('modalBody').innerHTML = `
    <div class="p-6">
      <h3 class="text-xl font-bold text-gray-900 mb-6">Publish New Notice</h3>
      <div class="space-y-4">
        <input type="text" id="noticeTitle" placeholder="Notice Title" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm">
        <textarea id="noticeContent" rows="4" placeholder="Notice details..." class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm"></textarea>
        <label class="flex items-center gap-3"><input type="checkbox" id="noticePriority" class="w-4 h-4">
          <span class="text-sm text-gray-600">Mark as High Priority</span></label>
        <button onclick="publishNotice()" class="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl">Publish Notice</button>
      </div>
    </div>`;
  document.getElementById('roomModal').classList.add('active');
};

window.publishNotice = async function() {
  const title = document.getElementById('noticeTitle').value.trim();
  const content = document.getElementById('noticeContent').value.trim();
  const priority = document.getElementById('noticePriority').checked ? 'high' : 'normal';
  if (!title || !content) { alert('Fill in title and content'); return; }
  const res = await postNotice({ title, content, priority });
  if (res) { showToast('Notice published'); closeModal(); renderNotices(); }
  else alert('Failed to publish');
};

// MAINTENANCE
window.renderMaintenance = async function() {
  const requests = await loadMaintenanceRequests();
  const pending = document.getElementById('pendingFixes');
  const active = document.getElementById('activeFixes');
  const resolved = document.getElementById('resolvedFixes');
  if (!pending) return;
  const card = (req) => `
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 fade-in">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">Room ${req.room_number}</span>
        <span class="text-[10px] text-gray-400">${timeAgo(req.created_at)}</span>
      </div>
      <h4 class="font-bold text-sm text-gray-900 mb-1">${req.issue}</h4>
      <p class="text-xs text-gray-500 mb-3">${req.description||''}</p>
      <div class="flex gap-2">
        <button onclick="openMaintenanceDetails('${req.id}')" class="flex-1 py-2 rounded-xl bg-gray-50 text-gray-600 text-[10px] font-bold">Details</button>
        <button onclick="deleteMaintenanceRequest('${req.id}')" class="px-3 py-2 rounded-xl bg-red-50 text-red-400 text-[10px] font-bold">Delete</button>
      </div>
    </div>`;
  const empty = (msg) => `<p class="text-xs text-gray-400 text-center py-4 italic">${msg}</p>`;
  pending.innerHTML = requests.filter(r=>r.status==='pending').map(card).join('')||empty('No pending requests');
  active.innerHTML = requests.filter(r=>r.status==='active').map(card).join('')||empty('No active repairs');
  resolved.innerHTML = requests.filter(r=>r.status==='resolved').map(card).join('')||empty('No resolved requests');
};

window.openMaintenanceDetails = async function(id) {
  const { data: req, error } = await window._supabase.from('maintenance_requests').select('*').eq('id', id).single();
  if (error || !req) { alert('Could not load details'); return; }
  document.getElementById('modalBody').innerHTML = `
    <div class="p-6">
      <div class="flex justify-between items-start mb-6">
        <div><h3 class="text-xl font-bold text-gray-900">${req.issue}</h3>
          <p class="text-xs text-gray-400 uppercase font-bold mt-1">Room ${req.room_number} · ${timeAgo(req.created_at)}</p></div>
        <span class="badge badge-${req.status}">${req.status}</span>
      </div>
      <div class="bg-gray-50 rounded-2xl p-4 mb-6">
        <p class="text-sm text-gray-600">${req.description||'No description provided.'}</p>
      </div>
      <div class="grid grid-cols-3 gap-2">
        ${['pending','active','resolved'].map(s=>`
          <button onclick="updateFixStatus('${req.id}','${s}')" class="py-3 rounded-xl text-xs font-bold capitalize ${req.status===s?'bg-teal-600 text-white':'bg-gray-50 text-gray-500'}">${s}</button>`).join('')}
      </div>
    </div>`;
  document.getElementById('roomModal').classList.add('active');
};

window.updateFixStatus = async function(id, status) {
  const { error } = await window._supabase.from('maintenance_requests').update({ status }).eq('id', id);
  if (!error) { showToast('Status updated'); closeModal(); renderMaintenance(); }
};

window.deleteMaintenanceRequest = async function(id) {
  if (!confirm('Delete this record?')) return;
  try {
    const { error } = await window._supabase.from('maintenance_requests').delete().eq('id', id);
    if (error) throw error;
    showToast('Record deleted');
    renderMaintenance();
  } catch (err) {
    alert('Failed to delete record: ' + err.message);
    console.error(err);
  }
};

// TENANTS
window.renderTenants = async function() {
  const list = document.getElementById('tenantsList');
  if (!list) return;
  list.innerHTML = '<div class="col-span-full py-12 flex justify-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>';
  const tenants = await loadTenants();
  if (!tenants.length) { list.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400 italic">No tenants registered yet.</div>'; return; }
  list.innerHTML = tenants.map(t => `
    <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 fade-in">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-lg">
          ${t.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}</div>
        <div><h4 class="font-bold text-gray-900">${t.name}</h4>
          <p class="text-xs text-gray-400 font-bold uppercase">Unit ${t.room_number}</p></div>
      </div>
      <div class="space-y-2 text-sm mb-4">
        <div class="flex justify-between"><span class="text-gray-400">Phone</span><span class="font-medium">${t.phone||'N/A'}</span></div>
        <div class="flex justify-between"><span class="text-gray-400">Since</span><span class="font-medium">${t.lease_start ? new Date(t.lease_start).toLocaleDateString() : 'N/A'}</span></div>
      </div>
    </div>`).join('');
};

window.openNewTenantModal = async function() {
  const rooms = await loadRooms();
  const vacant = rooms.filter(r => (r.status||'vacant').toLowerCase() === 'vacant');
  document.getElementById('modalBody').innerHTML = `
    <div class="p-6">
      <h3 class="text-xl font-bold text-gray-900 mb-6">Register New Tenant</h3>
      <div class="space-y-4">
        <input type="text" id="tenantName" placeholder="Full Name" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm">
        <select id="tenantUnit" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm">
          ${vacant.length ? '<option value="">Select Room...</option>'+vacant.map(r=>`<option value="${r.roomNumber}">${r.roomNumber}</option>`).join('') : '<option value="">No Vacant Rooms</option>'}
        </select>
        ${!vacant.length ? '<p class="text-xs text-amber-600 font-bold">⚠️ Mark a room as Vacant first in the Rooms tab.</p>' : ''}
        <input type="text" id="tenantPhone" placeholder="Phone Number" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm">
        <input type="date" id="leaseStart" value="${new Date().toISOString().split('T')[0]}" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm">
        <button onclick="registerTenantFlow()" class="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl">Complete Registration</button>
      </div>
    </div>`;
  document.getElementById('roomModal').classList.add('active');
};

window.registerTenantFlow = async function() {
  const name = document.getElementById('tenantName')?.value.trim();
  const roomNumber = document.getElementById('tenantUnit')?.value;
  const phone = document.getElementById('tenantPhone')?.value.trim();
  const leaseStart = document.getElementById('leaseStart')?.value;
  if (!name || !roomNumber) { alert('Name and room are required'); return; }
  const btn = event.target; btn.disabled = true; btn.innerHTML = 'Registering...';
  try {
    const { error: tErr } = await window._supabase.from('tenants').insert([{ name, room_number: roomNumber, phone, lease_start: leaseStart }]);
    if (tErr) throw tErr;
    const { error: rErr } = await window._supabase.from('rooms').update({ status: 'occupied' }).eq('room_number', roomNumber);
    if (rErr) throw rErr;
    showToast('🎉 Tenant registered!'); closeModal(); renderTenants(); renderStats(); renderRooms();
  } catch(err) {
    alert('Registration failed: ' + err.message);
    btn.disabled = false; btn.innerHTML = 'Complete Registration';
  }
};

// PAYMENTS
window.renderPaymentStats = async function() {
  const stats = await getPaymentStats();
  const s = document.getElementById('paymentStats');
  if (!s) return;
  s.innerHTML = [
    ['Collected', 'KES ' + (stats.totalCollected||0).toLocaleString()],
    ['Paid', stats.paidTenants],
    ['Unpaid', stats.unpaidTenants],
    ['Late', stats.latePayments],
    ['Pending', stats.pendingVerifications]
  ].map(([l,v]) => `<div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
    <p class="text-xs font-bold text-gray-400 uppercase mb-1">${l}</p>
    <p class="text-xl font-black text-gray-900">${v}</p></div>`).join('');
};

window.renderPayments = async function() {
  const payments = await loadPayments();
  const tbody = document.getElementById('paymentTableBody');
  if (!tbody) return;
  if (!payments.length) { tbody.innerHTML = '<tr><td colspan="5" class="py-12 text-center text-gray-400 italic">No payments yet.</td></tr>'; return; }
  tbody.innerHTML = payments.map(p => `
    <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td class="py-4 pl-2"><p class="font-bold text-sm text-gray-900">${p.tenantName||'Unknown'}</p><p class="text-xs text-gray-400">Unit ${p.unitNumber||'N/A'}</p></td>
      <td class="py-4 font-bold text-sm">KES ${(p.amount||0).toLocaleString()}</td>
      <td class="py-4 text-sm text-gray-500">${p.transactionCode||'-'}</td>
      <td class="py-4"><span class="text-[10px] font-black px-2 py-1 rounded-full uppercase ${p.status==='verified'?'bg-green-100 text-green-600':p.status==='rejected'?'bg-red-100 text-red-600':'bg-amber-100 text-amber-600'}">${p.status||'pending'}</span></td>
      <td class="py-4 pr-2 text-right">
        ${p.receiptImage?`<button onclick="viewReceipt('${p.receiptImage}')" class="text-xs font-bold text-teal-600 mr-2">Receipt</button>`:''}
        ${p.status==='pending'?`<button onclick="handlePaymentAction('${p.id}','verified')" class="text-xs font-bold text-green-600 mr-1">Verify</button><button onclick="handlePaymentAction('${p.id}','rejected')" class="text-xs font-bold text-red-500">Reject</button>`:''}
      </td>
    </tr>`).join('');
};

window.filterPayments = function() { renderPayments(); };

window.handlePaymentAction = async function(id, status) {
  const res = await updatePaymentStatus(id, status);
  if (res) { showToast('Payment ' + status); renderPaymentStats(); renderPayments(); }
};

window.viewReceipt = function(url) {
  document.getElementById('receiptPreview').src = url;
  document.getElementById('receiptModal').classList.add('active');
};

window.downloadReport = function() {
  loadPayments().then(payments => {
    const rows = [['Tenant','Unit','Amount','Code','Status','Month']].concat(
      payments.map(p => [p.tenantName, p.unitNumber, p.amount, p.transactionCode, p.status, p.month])
    );
    const csv = rows.map(r => r.map(v => `"${v||''}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'payments-report.csv'; a.click();
    showToast('Report downloaded');
  });
};
