// =============================================
// SHARED DATA & SUPABASE CONFIG — rooms.js
// =============================================

// These will be initialized in the HTML or here if hardcoded
// ---- SECURE INITIALIZATION ----
if (!window.SUPABASE_URL || window.SUPABASE_URL === "__SUPABASE_URL__") {
  console.error("Secrets not injected! Check GitHub Actions and Repository Secrets.");
}

// Initialize and share the client globally
window._supabase = (window.supabase && window.SUPABASE_URL && window.SUPABASE_URL !== "__SUPABASE_URL__") 
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) 
  : null;

const _supabase = window._supabase;


const LANDLORD_PHONE = '254712345678';

// ---- AUTH HELPER ----
async function getCurrentUser() {
  const { data: { session } } = await _supabase.auth.getSession();
  return session?.user || null;
}

// ---- ROOMS DATA ----
async function loadRooms() {
  const { data, error } = await _supabase
    .from('rooms')
    .select('*')
    .order('room_number', { ascending: true });
  
  if (error) {
    console.error('Error loading rooms:', error);
    return [];
  }
  
  // Map snake_case to camelCase for compatibility with existing UI
  return data.map(r => ({
    roomNumber: r.room_number,
    type: r.type,
    rent: r.rent,
    status: r.status,
    description: r.description,
    image: r.image,
    amenities: r.amenities || [],
    updatedAt: r.updated_at,
    roomPassword: r.room_password // Added for tenant verification
  }));
}

async function updateRoom(roomNumber, updates) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  // Map camelCase back to snake_case
  const dbUpdates = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.rent) dbUpdates.rent = updates.rent;
  if (updates.type) dbUpdates.type = updates.type;
  if (updates.description) dbUpdates.description = updates.description;
  if (updates.roomPassword) dbUpdates.room_password = updates.roomPassword;
  if (updates.amenities) dbUpdates.amenities = updates.amenities;
  
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await _supabase
    .from('rooms')
    .update(dbUpdates)
    .eq('room_number', roomNumber)
    .select()
    .single();

  if (error) {
    console.error('Error updating room:', error);
    return null;
  }
  return data;
}

async function findRoom(roomNumber) {
  const { data, error } = await _supabase
    .from('rooms')
    .select('*')
    .eq('room_number', roomNumber.trim())
    .single();

  if (error || !data) return null;
  
  return {
    roomNumber: data.room_number,
    type: data.type,
    rent: data.rent,
    status: data.status,
    description: data.description,
    image: data.image,
    amenities: data.amenities || [],
    updatedAt: data.updated_at
  };
}

// Secure lookup for Tenant Portal
async function verifyRoomAccess(roomNumber, roomPassword) {
  const { data, error } = await _supabase
    .from('rooms')
    .select('*')
    .eq('room_number', roomNumber.trim())
    .eq('room_password', roomPassword.trim())
    .single();

  if (error || !data) return null;
  
  return {
    roomNumber: data.room_number,
    type: data.type,
    rent: data.rent,
    status: data.status,
    description: data.description,
    image: data.image,
    amenities: data.amenities || [],
    updatedAt: data.updated_at
  };
}

async function getRoomStats() {
  const rooms = await loadRooms();
  return {
    total: rooms.length,
    vacant: rooms.filter(r => r.status === 'vacant').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    reserved: rooms.filter(r => r.status === 'reserved').length
  };
}

// ---- PAYMENTS DATA ----
async function loadPayments() {
  const { data, error } = await _supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading payments:', error);
    return [];
  }

  return data.map(p => ({
    id: p.id,
    tenantName: p.tenant_name,
    unitNumber: p.unit_number,
    amount: p.amount,
    phone: p.phone,
    transactionCode: p.transaction_code,
    date: p.created_at,
    status: p.status,
    month: p.month,
    receiptImage: p.receipt_image
  }));
}

async function updatePaymentStatus(paymentId, status) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await _supabase
    .from('payments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment:', error);
    return null;
  }
  
  return {
    id: data.id,
    tenantName: data.tenant_name,
    unitNumber: data.unit_number,
    status: data.status
  };
}

async function getPaymentStats() {
  const payments = await loadPayments();
  const rooms = await loadRooms();
  const currentMonth = "May 2026";
  const monthlyPayments = payments.filter(p => p.month === currentMonth);

  const verifiedCount = monthlyPayments.filter(p => p.status === 'verified').length;

  return {
    totalCollected: monthlyPayments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0),
    paidTenants: verifiedCount,
    unpaidTenants: Math.max(0, rooms.length - verifiedCount),
    latePayments: monthlyPayments.filter(p => p.status === 'pending' && p.date && new Date(p.date).getDate() > 5).length,
    pendingVerifications: payments.filter(p => p.status === 'pending').length
  };
}

// ---- UTILS ----
function formatRoomTitle(roomNumber) {
  const num = roomNumber.replace(/\D/g, '');
  return `Room ${num || roomNumber}`;
}

function formatRent(amount) {
  return 'KES ' + Number(amount).toLocaleString('en-KE');
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}
