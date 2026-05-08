// =============================================
// SHARED ROOM DATA — rooms.js
// =============================================

const STORAGE_KEY = 'dans_rentals_rooms'; // Updated key to trigger fresh load
const PAYMENTS_KEY = 'rentalPayments';
const LANDLORD_PHONE = '254712345678';

const defaultRooms = [
  {
    roomNumber: "1",
    type: "Bedsitter",
    rent: 8500,
    status: "vacant",
    description: "Modern bedsitter with tiled floor and private balcony.",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
    amenities: ["WiFi", "Water Included", "Security"],
    updatedAt: new Date().toISOString()
  },
  {
    roomNumber: "2",
    type: "Bedsitter",
    rent: 8500,
    status: "occupied",
    description: "Spacious room with natural lighting and fitted wardrobes.",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
    amenities: ["Water Included", "Security"],
    updatedAt: new Date().toISOString()
  },
  {
    roomNumber: "3",
    type: "Single Room",
    rent: 5500,
    status: "vacant",
    description: "Cozy single room with clean finishes and good ventilation.",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
    amenities: ["Water Included", "CCTV"],
    updatedAt: new Date().toISOString()
  },
  {
    roomNumber: "4",
    type: "1 Bedroom",
    rent: 15000,
    status: "occupied",
    description: "Elegant 1-bedroom with separate kitchen and living area.",
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80",
    amenities: ["WiFi", "Parking", "Security"],
    updatedAt: new Date().toISOString()
  },
  {
    roomNumber: "5",
    type: "Bedsitter",
    rent: 9000,
    status: "vacant",
    description: "Premium bedsitter on the top floor with great views.",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80",
    amenities: ["WiFi", "Water Included", "Rooftop Access"],
    updatedAt: new Date().toISOString()
  },
  {
    roomNumber: "6",
    type: "Single Room",
    rent: 6000,
    status: "occupied",
    description: "Standard single room with tiled floors and shared clean washrooms.",
    image: "https://images.unsplash.com/photo-1598928506311-c55ez637a26a?w=600&q=80",
    amenities: ["Water Included", "Security"],
    updatedAt: new Date().toISOString()
  },
  {
    roomNumber: "7",
    type: "1 Bedroom",
    rent: 14500,
    status: "vacant",
    description: "Spacious 1-bedroom with modern bathroom fittings.",
    image: "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=600&q=80",
    amenities: ["WiFi", "Water Included", "Security"],
    updatedAt: new Date().toISOString()
  },
  {
    roomNumber: "8",
    type: "Bedsitter",
    rent: 8000,
    status: "vacant",
    description: "Affordable bedsitter with all basic amenities included.",
    image: "https://images.unsplash.com/photo-1522156373667-4c7234bbd804?w=600&q=80",
    amenities: ["Water Included", "Parking"],
    updatedAt: new Date().toISOString()
  },
  {
    roomNumber: "9",
    type: "Single Room",
    rent: 5800,
    status: "reserved",
    description: "Quiet single room located away from the main road.",
    image: "https://images.unsplash.com/photo-1536376074432-8d6421639a06?w=600&q=80",
    amenities: ["Security", "CCTV"],
    updatedAt: new Date().toISOString()
  },
  {
    roomNumber: "10",
    type: "2 Bedroom",
    rent: 25000,
    status: "occupied",
    description: "Large 2-bedroom apartment perfect for families.",
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80",
    amenities: ["WiFi", "Parking", "Security", "Balcony"],
    updatedAt: new Date().toISOString()
  }
];

function loadRooms() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) || [];
    } catch (e) {
      console.warn('Corrupted localStorage data. Resetting.');
    }
  }
  saveRooms(defaultRooms);
  return defaultRooms;
}

function saveRooms(rooms) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms || []));
}

function initializePayments() {
  const existing = localStorage.getItem(PAYMENTS_KEY);
  if (!existing) {
    const mockPayments = generateMockPayments();
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(mockPayments || []));
  }
}

function loadPayments() {
  const stored = localStorage.getItem(PAYMENTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) || [];
    } catch (e) {
      console.warn('Corrupted payments data. Resetting.');
    }
  }
  const mockPayments = generateMockPayments();
  savePayments(mockPayments || []);
  return mockPayments;
}

function savePayments(payments) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments || []));
}

function generateMockPayments() {
  const names = [
    "Brian Otieno", "Mercy Wanjiku", "Kevin Kiptoo", "Sarah Naymura", "John Musyoka",
    "Faith Chebet", "David Ochieng", "Alice Wambui", "Peter Kamau", "Lydia Mutua",
    "James Mwangi", "Esther Njeri", "Samuel Okoth", "Grace Achieng", "Andrew Kimani",
    "Catherine Atieno", "Paul Njoroge", "Ruth Nyambura", "Simon Kariuki", "Mary Waweru"
  ];
  const units = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const statuses = ["pending", "verified", "rejected"];
  const months = ["May 2026", "April 2026", "March 2026"];

  const payments = [];
  const now = new Date();

  for (let i = 0; i < 20; i++) {
    const status = i < 5 ? "pending" : (i < 15 ? "verified" : "rejected");
    const unit = units[i % units.length];
    const room = defaultRooms.find(r => r.roomNumber === unit) || defaultRooms[0];

    payments.push({
      id: 'PAY-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      tenantName: names[i],
      unitNumber: unit,
      amount: room.rent,
      phone: '07' + Math.floor(10000000 + Math.random() * 90000000),
      transactionCode: 'QK' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      date: new Date(now.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
      status: status,
      month: months[Math.floor(Math.random() * months.length)],
      receiptImage: `https://images.unsplash.com/photo-1554224155-1696413565d3?w=400&q=80` // Mock receipt image
    });
  }
  return payments;
}

function updatePaymentStatus(paymentId, status) {
  const payments = loadPayments();
  const index = payments.findIndex(p => p.id === paymentId);
  if (index !== -1) {
    payments[index].status = status;
    payments[index].updatedAt = new Date().toISOString();
    savePayments(payments);
    return payments[index];
  }
  return null;
}

function getPaymentStats() {
  const payments = loadPayments() || [];
  const rooms = loadRooms() || [];
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

function updateRoom(roomNumber, updates) {
  const rooms = loadRooms();
  const index = rooms.findIndex(r => r.roomNumber === roomNumber);
  if (index === -1) return null;
  rooms[index] = { ...rooms[index], ...updates, updatedAt: new Date().toISOString() };
  saveRooms(rooms);
  return rooms[index];
}

function findRoom(roomNumber) {
  const rooms = loadRooms();
  return rooms.find(r => r.roomNumber.toLowerCase() === roomNumber.trim().toLowerCase()) || null;
}

function getRoomStats() {
  const rooms = loadRooms();
  return {
    total: rooms.length,
    vacant: rooms.filter(r => r.status === 'vacant').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    reserved: rooms.filter(r => r.status === 'reserved').length
  };
}

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
