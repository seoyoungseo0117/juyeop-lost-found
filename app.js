const ITEM_STORAGE_KEY = 'school-lost-found-items';
const RECEIVED_STORAGE_KEY = 'school-lost-found-received';
const ADMIN_SESSION_KEY = 'school-lost-found-admin';
const ADMIN_PASSWORD = '20260830';
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <rect width="800" height="500" fill="#eaf1ff"/>
      <rect x="160" y="80" width="480" height="340" rx="32" fill="#d7e5ff"/>
      <circle cx="400" cy="220" r="60" fill="#b9cdfd"/>
      <path d="M300 320L360 250L430 300L500 220L580 320H300Z" fill="#9bb8ff"/>
      <text x="400" y="400" text-anchor="middle" fill="#4564c8" font-size="30" font-family="Arial,sans-serif">No Image</text>
    </svg>
  `);

const initialItems = [
  {
    id: 1,
    name: '검정 가방',
    location: '2층 복도',
    room: '교무실 1',
    date: '2026-08-25',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: '파란색 물병',
    location: '도서관 1층',
    room: '교무실 2',
    date: '2026-08-27',
    image:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    name: '검정색 이어폰',
    location: '체육관',
    room: '교무실 3',
    date: '2026-08-28',
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
  },
];

function loadStoredItems() {
  const saved = localStorage.getItem(ITEM_STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(ITEM_STORAGE_KEY, JSON.stringify(initialItems));
    return [...initialItems];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...initialItems];
  } catch (error) {
    return [...initialItems];
  }
}

function loadReceivedItems() {
  const saved = localStorage.getItem(RECEIVED_STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(RECEIVED_STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

let items = loadStoredItems();
let receivedItems = loadReceivedItems();

const itemList = document.getElementById('itemList');
const adminCurrentTableBody = document.getElementById('adminCurrentTableBody');
const receivedTableBody = document.getElementById('receivedTableBody');
const itemCount = document.getElementById('itemCount');
const searchInput = document.getElementById('searchInput');
const registerModal = document.getElementById('registerModal');
const receiveModal = document.getElementById('receiveModal');
const adminLoginModal = document.getElementById('adminLoginModal');
const adminPanel = document.getElementById('adminPanel');
const itemForm = document.getElementById('itemForm');
const receiveForm = document.getElementById('receiveForm');
const adminLoginForm = document.getElementById('adminLoginForm');
const roomSelect = document.getElementById('roomSelect');
const openRegisterModalBtn = document.getElementById('openRegisterModal');
const openAdminLoginBtn = document.getElementById('openAdminLoginBtn');
const closeRegisterModalBtn = document.getElementById('closeRegisterModal');
const closeReceiveModalBtn = document.getElementById('closeReceiveModal');
const closeAdminLoginModalBtn = document.getElementById('closeAdminLoginModal');
const logoutAdminBtn = document.getElementById('logoutAdminBtn');

let selectedItemId = null;

function normalizeRoomName(value) {
  return value
    .replace(/\s+/g, '')
    .replace(/교문실/g, '교무실')
    .trim();
}

function applyRoomFromQuery() {
  if (!roomSelect) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const roomFromQr = params.get('room');

  if (roomFromQr) {
    const trimmedRoom = roomFromQr.trim();
    const matchedOption = Array.from(roomSelect.options).find((option) => {
      const optionValue = normalizeRoomName(option.value);
      const queryValue = normalizeRoomName(trimmedRoom);
      return optionValue === queryValue;
    });

    if (matchedOption) {
      roomSelect.value = matchedOption.value;
    }
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function updateCount() {
  itemCount.textContent = `${items.length}개`;
}

function renderCurrentAdminTable() {
  if (!adminCurrentTableBody) {
    return;
  }

  if (!items.length) {
    adminCurrentTableBody.innerHTML = `
      <tr>
        <td colspan="4">등록된 분실물이 없습니다.</td>
      </tr>
    `;
    return;
  }

  adminCurrentTableBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.location}</td>
          <td>${item.room}</td>
          <td>${formatDate(item.date)}</td>
          <td>
            <button class="danger-btn" type="button" data-delete-item-id="${item.id}">삭제</button>
          </td>
        </tr>
      `,
    )
    .join('');
}

function renderReceivedTable() {
  if (!receivedTableBody) {
    return;
  }

  if (!receivedItems.length) {
    receivedTableBody.innerHTML = `
      <tr>
        <td colspan="5">수령 완료된 분실물이 없습니다.</td>
      </tr>
    `;
    return;
  }

  receivedTableBody.innerHTML = receivedItems
    .map(
      (record) => `
        <tr>
          <td>${record.itemName}</td>
          <td>${record.studentId}</td>
          <td>${record.studentName}</td>
          <td>${formatDate(record.receivedDate)}</td>
          <td>
            <button class="danger-btn" type="button" data-delete-received-id="${record.id}">삭제</button>
          </td>
        </tr>
      `,
    )
    .join('');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('이미지 읽기에 실패했습니다.'));
    reader.readAsDataURL(file);
  });
}

function renderItems(filteredItems = items) {
  if (!filteredItems.length) {
    itemList.innerHTML = `
      <div class="empty-state">
        <h3>보관 중인 분실물이 없습니다.</h3>
        <p>등록된 물건이 없거나 검색 조건에 맞는 물건이 없습니다.</p>
      </div>
    `;
    updateCount();
    return;
  }

  itemList.innerHTML = filteredItems
    .map(
      (item) => `
        <article class="item-card">
          <img src="${item.image || PLACEHOLDER_IMAGE}" alt="${item.name}" />
          <div class="item-content">
            <span class="item-tag">보관 중</span>
            <h3>${item.name}</h3>
            <div class="meta-list">
              <div class="meta-item"><span>습득 장소</span><strong>${item.location}</strong></div>
              <div class="meta-item"><span>보관 교무실</span><strong>${item.room}</strong></div>
              <div class="meta-item"><span>습득 날짜</span><strong>${formatDate(item.date)}</strong></div>
            </div>
            <div class="card-actions">
              <button class="secondary-btn" type="button" data-item-id="${item.id}">수령하기</button>
            </div>
          </div>
        </article>
      `,
    )
    .join('');

  updateCount();
}

function isAdminLoggedIn() {
  return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

function setAdminLoginState(isLoggedIn) {
  if (isLoggedIn) {
    localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    adminPanel.classList.remove('hidden');
  } else {
    localStorage.setItem(ADMIN_SESSION_KEY, 'false');
    adminPanel.classList.add('hidden');
  }
}

function openRegisterModal() {
  applyRoomFromQuery();
  registerModal.classList.remove('hidden');
  registerModal.setAttribute('aria-hidden', 'false');
}

function closeRegisterModal() {
  registerModal.classList.add('hidden');
  registerModal.setAttribute('aria-hidden', 'true');
  itemForm.reset();
  applyRoomFromQuery();
}

function openAdminLoginModal() {
  adminLoginModal.classList.remove('hidden');
  adminLoginModal.setAttribute('aria-hidden', 'false');
}

function closeAdminLoginModal() {
  adminLoginModal.classList.add('hidden');
  adminLoginModal.setAttribute('aria-hidden', 'true');
  adminLoginForm.reset();
}

function openReceiveModal(itemId) {
  selectedItemId = itemId;
  receiveModal.classList.remove('hidden');
  receiveModal.setAttribute('aria-hidden', 'false');
}

function closeReceiveModal() {
  receiveModal.classList.add('hidden');
  receiveModal.setAttribute('aria-hidden', 'true');
  receiveForm.reset();
  selectedItemId = null;
}

openRegisterModalBtn.addEventListener('click', openRegisterModal);
openAdminLoginBtn.addEventListener('click', openAdminLoginModal);
closeRegisterModalBtn.addEventListener('click', closeRegisterModal);
closeReceiveModalBtn.addEventListener('click', closeReceiveModal);
closeAdminLoginModalBtn.addEventListener('click', closeAdminLoginModal);
logoutAdminBtn.addEventListener('click', () => setAdminLoginState(false));

registerModal.addEventListener('click', (event) => {
  if (event.target === registerModal) {
    closeRegisterModal();
  }
});

receiveModal.addEventListener('click', (event) => {
  if (event.target === receiveModal) {
    closeReceiveModal();
  }
});

adminLoginModal.addEventListener('click', (event) => {
  if (event.target === adminLoginModal) {
    closeAdminLoginModal();
  }
});

adminLoginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(adminLoginForm);
  const password = formData.get('adminPassword').toString();

  if (password === ADMIN_PASSWORD) {
    setAdminLoginState(true);
    closeAdminLoginModal();
    return;
  }

  alert('비밀번호가 올바르지 않습니다.');
});

adminCurrentTableBody.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-item-id]');

  if (!button) {
    return;
  }

  const itemIdToDelete = Number(button.dataset.deleteItemId);
  const itemToDelete = items.find((item) => item.id === itemIdToDelete);

  if (!itemToDelete) {
    return;
  }

  const confirmed = window.confirm(`${itemToDelete.name}을(를) 정말 삭제할까요?`);
  if (!confirmed) {
    return;
  }

  items = items.filter((item) => item.id !== itemIdToDelete);
  localStorage.setItem(ITEM_STORAGE_KEY, JSON.stringify(items));
  renderItems();
  renderCurrentAdminTable();
  updateCount();
});

receivedTableBody.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-received-id]');

  if (!button) {
    return;
  }

  const receivedIdToDelete = Number(button.dataset.deleteReceivedId);
  const recordToDelete = receivedItems.find((record) => record.id === receivedIdToDelete);

  if (!recordToDelete) {
    return;
  }

  const confirmed = window.confirm(`${recordToDelete.itemName} 기록을 정말 삭제할까요?`);
  if (!confirmed) {
    return;
  }

  receivedItems = receivedItems.filter((record) => record.id !== receivedIdToDelete);
  localStorage.setItem(RECEIVED_STORAGE_KEY, JSON.stringify(receivedItems));
  renderReceivedTable();
});

itemList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-item-id]');
  if (!button) {
    return;
  }

  openReceiveModal(Number(button.dataset.itemId));
});

searchInput.addEventListener('input', (event) => {
  const keyword = event.target.value.trim().toLowerCase();

  const filtered = items.filter((item) => {
    const searchableText = [item.name, item.location, item.room].join(' ').toLowerCase();
    return searchableText.includes(keyword);
  });

  renderItems(filtered);
});

itemForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(itemForm);
  const fileInput = document.getElementById('photoInput');
  const selectedFile = fileInput && fileInput.files ? fileInput.files[0] : null;

  let imageValue = PLACEHOLDER_IMAGE;

  if (selectedFile) {
    imageValue = await readFileAsDataUrl(selectedFile);
  }

  const newItem = {
    id: Date.now(),
    name: formData.get('name').toString().trim(),
    location: formData.get('location').toString().trim(),
    room: formData.get('room').toString().trim(),
    date: formData.get('date').toString(),
    image: imageValue,
  };

  items.unshift(newItem);
  localStorage.setItem(ITEM_STORAGE_KEY, JSON.stringify(items));
  renderItems();
  renderCurrentAdminTable();
  closeRegisterModal();
});

receiveForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (selectedItemId === null) {
    return;
  }

  const selectedItem = items.find((item) => item.id === selectedItemId);
  if (!selectedItem) {
    closeReceiveModal();
    return;
  }

  const formData = new FormData(receiveForm);
  const record = {
    id: Date.now(),
    itemName: selectedItem.name,
    studentId: formData.get('studentId').toString().trim(),
    studentName: formData.get('studentName').toString().trim(),
    receivedDate: new Date().toISOString(),
  };

  receivedItems.unshift(record);
  items = items.filter((item) => item.id !== selectedItemId);

  localStorage.setItem(RECEIVED_STORAGE_KEY, JSON.stringify(receivedItems));
  localStorage.setItem(ITEM_STORAGE_KEY, JSON.stringify(items));

  renderItems();
  renderCurrentAdminTable();
  renderReceivedTable();
  closeReceiveModal();
});

applyRoomFromQuery();
setAdminLoginState(isAdminLoggedIn());
renderItems();
renderCurrentAdminTable();
renderReceivedTable();
