// =============================================
// TENANT SEARCH PAGE — tenant.js
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  renderVacantRooms();
  // Allow Enter key to search
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchRoom();
  });
});

// ---- Search ----
function searchRoom() {
  const input = document.getElementById('searchInput').value.trim();
  const section = document.getElementById('resultSection');

  if (!input) {
    section.innerHTML = `
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center fade-in">
        <p class="text-amber-700 font-medium text-sm">⚠️ Please enter a room number.</p>
      </div>`;
    return;
  }

  const room = findRoom(input);

  if (!room) {
    section.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-xl p-5 text-center fade-in">
        <svg class="w-10 h-10 mx-auto mb-2 text-red-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
        <p class="text-red-700 font-semibold mb-1">Room Not Found</p>
        <p class="text-red-500 text-sm">Room "${input.toUpperCase()}" does not exist. Please check the number and try again.</p>
      </div>`;
    return;
  }

  section.innerHTML = buildRoomCard(room, true);
}

// ---- Build Room Card ----
function buildRoomCard(room, isSearch) {
  const whatsappMsg = encodeURIComponent(`Hello, I'm interested in Room ${room.roomNumber} (${room.type}) at Dan's Rentals. Is it still ${room.status}?`);
  const whatsappUrl = `https://wa.me/${LANDLORD_PHONE}?text=${whatsappMsg}`;
  const callUrl = `tel:+${LANDLORD_PHONE}`;
  const viewingMsg = encodeURIComponent(`Hi, I would like to schedule a viewing for Room ${room.roomNumber} (${room.type}) at Dan's Rentals. Please let me know available times.`);
  const viewingUrl = `https://wa.me/${LANDLORD_PHONE}?text=${viewingMsg}`;

  return `
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 fade-in">
      <div class="p-5 space-y-4">
        <!-- Header -->
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-xl font-bold text-gray-900">${formatRoomTitle(room.roomNumber)}</h3>
            <p class="text-sm text-gray-500">${room.type}</p>
          </div>
          <span class="badge badge-${room.status}">${room.status}</span>
        </div>

        <!-- Rent -->
        <div class="bg-teal-50 rounded-xl px-4 py-3 border border-teal-100">
          <p class="text-xs text-teal-600 font-medium">Monthly Rent</p>
          <p class="text-2xl font-bold text-teal-800">${formatRent(room.rent)}</p>
        </div>

        <!-- Description -->
        <p class="text-sm text-gray-600 leading-relaxed">${room.description}</p>

        <!-- Amenities -->
        <div class="flex flex-wrap gap-2">
          ${room.amenities.map(a => `<span class="amenity-tag">✓ ${a}</span>`).join('')}
        </div>

        <!-- Actions -->
        ${room.status === 'vacant' ? `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
          <a href="${whatsappUrl}" target="_blank" class="btn-action btn-whatsapp justify-center">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.317 0-4.478-.672-6.32-1.828l-.352-.216-3.451 1.157 1.157-3.451-.216-.352A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            WhatsApp
          </a>
          <a href="${callUrl}" class="btn-action btn-call justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            Call
          </a>
          <a href="${viewingUrl}" target="_blank" class="btn-action bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white justify-center border border-purple-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Request Viewing
          </a>
        </div>` : `
        <div class="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
          <p class="text-sm text-gray-500">This room is currently <strong class="capitalize">${room.status}</strong>.</p>
          <a href="${whatsappUrl}" target="_blank" class="btn-action btn-whatsapp justify-center mt-3 w-full">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.317 0-4.478-.672-6.32-1.828l-.352-.216-3.451 1.157 1.157-3.451-.216-.352A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            Inquire via WhatsApp
          </a>
        </div>`}
      </div>
    </div>`;
}

// ---- Vacant Rooms List ----
function renderVacantRooms() {
  const rooms = loadRooms();
  const vacant = rooms.filter(r => r.status === 'vacant');
  const list = document.getElementById('vacantList');
  const noVacant = document.getElementById('noVacant');

  if (vacant.length === 0) {
    list.innerHTML = '';
    noVacant.classList.remove('hidden');
    return;
  }
  noVacant.classList.add('hidden');

  list.innerHTML = vacant.map((room, i) => `
    <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex gap-4 items-center cursor-pointer hover:shadow-md transition fade-in" style="animation-delay:${i*0.08}s" onclick="showVacantDetail('${room.roomNumber}')">
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-gray-900">${formatRoomTitle(room.roomNumber)}</h4>
          <span class="badge badge-vacant text-[10px]">Vacant</span>
        </div>
        <p class="text-xs text-gray-500">${room.type}</p>
        <p class="text-sm font-bold text-teal-700">${formatRent(room.rent)}<span class="text-xs font-normal text-gray-400">/mo</span></p>
      </div>
    </div>
  `).join('');
}

function showVacantDetail(roomNumber) {
  const room = findRoom(roomNumber);
  if (!room) return;
  document.getElementById('searchInput').value = roomNumber;
  document.getElementById('resultSection').innerHTML = buildRoomCard(room, false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Cross-tab sync ----
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    renderVacantRooms();
    // Re-search if there's a value in the input
    const input = document.getElementById('searchInput').value.trim();
    if (input) searchRoom();
  }
});
