const SUPABASE_URL = 'https://opbkaeipdtjzrjzfacbp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uQNasfOJyDb8Nf2PnAkGaA_AgXvtyLk';
const IMAGE_BUCKET = 'lost-item-images';

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

/*
 * 원본 사이트의 기본 분실물.
 * Supabase에 데이터가 없더라도 기존 화면이 빈 화면이 되지 않게 유지한다.
 */
const initialItems = [
  {
    id: 'local-1',
    name: '빨간 신발',
    location: '2층 복도',
    room: '교무실 1',
    date: '2026-08-25',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'local-2',
    name: '초록색 물병',
    location: '도서관 1층',
    room: '교무실 2',
    date: '2026-08-27',
    image:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'local-3',
    name: '검정색 이어폰',
    location: '체육관',
    room: '교무실 3',
    date: '2026-08-28',
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
  },
];

let items = [];
let receivedItems = [];
let selectedItemId = null;

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

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

function normalizeRoomName(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/교문실/g, '교무실')
    .trim();
}

function applyRoomFromQuery() {
  if (!roomSelect) return;

  const params = new URLSearchParams(window.location.search);
  const roomFromQr = params.get('room');

  if (!roomFromQr) return;

  const matchedOption = Array.from(roomSelect.options).find(
    (option) =>
      normalizeRoomName(option.value) === normalizeRoomName(roomFromQr),
  );

  if (matchedOption) {
    roomSelect.value = matchedOption.value;
  }
}

function formatDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return `${date.getFullYear()}년 ${
    date.getMonth() + 1
  }월 ${date.getDate()}일`;
}

function updateCount() {
  itemCount.textContent = `${items.length}개`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
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
          <img
            src="${item.image || PLACEHOLDER_IMAGE}"
            alt="${escapeHtml(item.name)}"
          />

          <div class="item-content">
            <span class="item-tag">보관 중</span>

            <h3>${escapeHtml(item.name)}</h3>

            <div class="meta-list">
              <div class="meta-item">
                <span>습득 장소</span>
                <strong>${escapeHtml(item.location)}</strong>
              </div>

              <div class="meta-item">
                <span>보관 교무실</span>
                <strong>${escapeHtml(item.room)}</strong>
              </div>

              <div class="meta-item">
                <span>습득 날짜</span>
                <strong>${formatDate(item.date)}</strong>
              </div>
            </div>

            <div class="card-actions">
              <button
                class="secondary-btn"
                type="button"
                data-item-id="${item.id}"
              >
                수령하기
              </button>
            </div>
          </div>
        </article>
      `,
    )
    .join('');

  updateCount();
}

function renderCurrentAdminTable() {
  if (!adminCurrentTableBody) return;

  if (!items.length) {
    adminCurrentTableBody.innerHTML = `
      <tr>
        <td colspan="5">등록된 분실물이 없습니다.</td>
      </tr>
    `;
    return;
  }

  adminCurrentTableBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.location)}</td>
          <td>${escapeHtml(item.room)}</td>
          <td>${formatDate(item.date)}</td>
          <td>
            ${
              String(item.id).startsWith('local-')
                ? ''
                : `<button
                    class="danger-btn"
                    type="button"
                    data-delete-item-id="${item.id}"
                  >
                    삭제
                  </button>`
            }
          </td>
        </tr>
      `,
    )
    .join('');
}

function renderReceivedTable() {
  if (!receivedTableBody) return;

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
          <td>${escapeHtml(record.itemName)}</td>
          <td>${escapeHtml(record.studentId)}</td>
          <td>${escapeHtml(record.studentName)}</td>
          <td>${formatDate(record.receivedDate)}</td>
          <td>
            <button
              class="danger-btn"
              type="button"
              data-delete-received-id="${record.id}"
            >
              삭제
            </button>
          </td>
        </tr>
      `,
    )
    .join('');
}

function isAdminLoggedIn() {
  return sessionStorage.getItem('school-lost-found-admin') === 'true';
}

function setAdminLoginState(isLoggedIn) {
  if (isLoggedIn) {
    sessionStorage.setItem('school-lost-found-admin', 'true');
    adminPanel.classList.remove('hidden');
  } else {
    sessionStorage.removeItem('school-lost-found-admin');
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

/* ---------------------------
   Supabase 데이터 불러오기
---------------------------- */

async function loadData() {
  if (!supabaseClient) {
    items = [...initialItems];
    receivedItems = [];

    renderItems();
    renderCurrentAdminTable();
    renderReceivedTable();

    return;
  }

  try {
    const { data: dbItems, error: itemError } = await supabaseClient
      .from('lost_items')
      .select('*')
      .eq('status', '보관 중')
      .order('created_at', { ascending: false });

    if (itemError) {
      throw itemError;
    }

    items = (dbItems || []).map((row) => ({
      id: row.id,
      name: row.title,
      location: row.location || '',
      room: row.room || '',
      date: row.found_date || '',
      image: row.image_url || PLACEHOLDER_IMAGE,
    }));

    /*
     * DB가 아직 비어 있을 때만 원래 기본 화면을 보여준다.
     * DB에 실제 등록물이 생기면 실제 DB 데이터를 사용한다.
     */
    if (!items.length) {
      items = [...initialItems];
    }

    const { data: dbReceived, error: receivedError } =
      await supabaseClient
        .from('received_items')
        .select('*')
        .order('received_date', { ascending: false });

    if (receivedError) {
      throw receivedError;
    }

    receivedItems = (dbReceived || []).map((row) => ({
      id: row.id,
      itemName: row.item_name,
      studentId: row.student_id,
      studentName: row.student_name,
      receivedDate: row.received_date,
    }));

    renderItems();
    renderCurrentAdminTable();
    renderReceivedTable();
  } catch (error) {
    console.error('Supabase load error:', error);

    /*
     * DB에 문제가 생겨도 기존 사이트 화면은 유지한다.
     */
    items = [...initialItems];
    receivedItems = [];

    renderItems();
    renderCurrentAdminTable();
    renderReceivedTable();
  }
}

/* ---------------------------
   사진 업로드
---------------------------- */

async function uploadImage(file) {
  if (!file) {
    return PLACEHOLDER_IMAGE;
  }

  if (!supabaseClient) {
    throw new Error(
      'Supabase 연결이 설정되지 않았습니다. Publishable Key를 확인해주세요.',
    );
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  /*
   * 파일명 충돌을 방지하기 위해 UUID + 원본 확장자를 사용한다.
   */
  const extension =
    file.name.split('.').pop()?.toLowerCase() || 'jpg';

  const filePath =
    `${crypto.randomUUID()}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(IMAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);

    throw new Error(
      `사진 업로드 실패: ${uploadError.message}`,
    );
  }

  const { data } = supabaseClient.storage
    .from(IMAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error('사진 주소를 만들지 못했습니다.');
  }

  return data.publicUrl;
}

/* ---------------------------
   분실물 등록
---------------------------- */

itemForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitButton = itemForm.querySelector(
    'button[type="submit"]',
  );

  submitButton.disabled = true;

  try {
    if (!supabaseClient) {
      throw new Error(
        'Supabase 연결이 설정되지 않았습니다. Publishable Key를 확인해주세요.',
      );
    }

    const formData = new FormData(itemForm);

    const name = String(formData.get('name') || '').trim();
    const location = String(formData.get('location') || '').trim();
    const room = String(formData.get('room') || '').trim();
    const date = String(formData.get('date') || '');

    const fileInput = document.getElementById('photoInput');
    const selectedFile = fileInput?.files?.[0] || null;

    if (!name || !location || !room || !date) {
      throw new Error('필수 항목을 모두 입력해주세요.');
    }

    /*
     * 사진이 있으면 먼저 Storage에 업로드한다.
     */
    let imageUrl = null;

    if (selectedFile) {
      imageUrl = await uploadImage(selectedFile);
    }

    /*
     * 그 다음 DB에 분실물 정보를 저장한다.
     */
    const { error } = await supabaseClient
      .from('lost_items')
      .insert({
        title: name,
        location: location,
        room: room,
        found_date: date,
        status: '보관 중',
        image_url: imageUrl,
      });

    if (error) {
      console.error('Database insert error:', error);

      throw new Error(
        `분실물 저장 실패: ${error.message}`,
      );
    }

    await loadData();

    closeRegisterModal();

    alert('분실물이 등록되었습니다.');
  } catch (error) {
    console.error(error);
    alert(error.message || '분실물 등록에 실패했습니다.');
  } finally {
    submitButton.disabled = false;
  }
});

/* ---------------------------
   수령 완료
---------------------------- */

receiveForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (selectedItemId === null) {
    return;
  }

  const submitButton = receiveForm.querySelector(
    'button[type="submit"]',
  );

  submitButton.disabled = true;

  try {
    if (!supabaseClient) {
      throw new Error('Supabase 연결이 설정되지 않았습니다.');
    }

    const selectedItem = items.find(
      (item) => String(item.id) === String(selectedItemId),
    );

    if (!selectedItem) {
      throw new Error(
        '이미 다른 사람이 수령했거나 삭제된 분실물입니다.',
      );
    }

    /*
     * 원본 기본 샘플은 실제 DB 데이터가 아니므로
     * 수령 완료 DB 처리 대상에서 제외한다.
     */
    if (String(selectedItem.id).startsWith('local-')) {
      alert(
        '현재 화면의 기본 예시 분실물입니다. 실제 등록된 분실물부터 수령 처리할 수 있습니다.',
      );
      closeReceiveModal();
      return;
    }

    const formData = new FormData(receiveForm);

    const studentId = String(
      formData.get('studentId') || '',
    ).trim();

    const studentName = String(
      formData.get('studentName') || '',
    ).trim();

    if (!studentId || !studentName) {
      throw new Error('학번과 이름을 입력해주세요.');
    }

    /*
     * 수령 기록 저장
     */
    const { error: receiveError } =
      await supabaseClient
        .from('received_items')
        .insert({
          item_name: selectedItem.name,
          student_id: studentId,
          student_name: studentName,
        });

    if (receiveError) {
      throw new Error(
        `수령 기록 저장 실패: ${receiveError.message}`,
      );
    }

    /*
     * 분실물을 수령 완료 상태로 변경
     */
    const { error: updateError } =
      await supabaseClient
        .from('lost_items')
        .update({
          status: '수령 완료',
        })
        .eq('id', selectedItem.id);

    if (updateError) {
      throw new Error(
        `분실물 상태 변경 실패: ${updateError.message}`,
      );
    }

    closeReceiveModal();

    await loadData();

    alert('수령 완료로 처리되었습니다.');
  } catch (error) {
    console.error(error);
    alert(error.message || '수령 처리에 실패했습니다.');
  } finally {
    submitButton.disabled = false;
  }
});

/* ---------------------------
   관리자 로그인
---------------------------- */

adminLoginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const password = String(
    new FormData(adminLoginForm).get('adminPassword') || '',
  );

  if (password === ADMIN_PASSWORD) {
    setAdminLoginState(true);
    closeAdminLoginModal();
    return;
  }

  alert('비밀번호가 올바르지 않습니다.');
});

/* ---------------------------
   관리자 분실물 삭제
---------------------------- */

adminCurrentTableBody.addEventListener(
  'click',
  async (event) => {
    const button = event.target.closest(
      '[data-delete-item-id]',
    );

    if (!button) return;

    const itemId = button.dataset.deleteItemId;

    const item = items.find(
      (entry) => String(entry.id) === String(itemId),
    );

    if (!item) return;

    if (
      !window.confirm(
        `${item.name}을(를) 정말 삭제할까요?`,
      )
    ) {
      return;
    }

    try {
      if (!supabaseClient) {
        throw new Error('Supabase 연결이 설정되지 않았습니다.');
      }

      const { error } = await supabaseClient
        .from('lost_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error) {
      console.error(error);
      alert(`삭제 실패: ${error.message}`);
    }
  },
);

/* ---------------------------
   관리자 수령 기록 삭제
---------------------------- */

receivedTableBody.addEventListener(
  'click',
  async (event) => {
    const button = event.target.closest(
      '[data-delete-received-id]',
    );

    if (!button) return;

    const recordId = button.dataset.deleteReceivedId;

    const record = receivedItems.find(
      (entry) => String(entry.id) === String(recordId),
    );

    if (!record) return;

    if (
      !window.confirm(
        `${record.itemName} 기록을 정말 삭제할까요?`,
      )
    ) {
      return;
    }

    try {
      if (!supabaseClient) {
        throw new Error('Supabase 연결이 설정되지 않았습니다.');
      }

      const { error } = await supabaseClient
        .from('received_items')
        .delete()
        .eq('id', recordId);

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error) {
      console.error(error);
      alert(`삭제 실패: ${error.message}`);
    }
  },
);

/* ---------------------------
   모달 / 버튼
---------------------------- */

openRegisterModalBtn.addEventListener(
  'click',
  openRegisterModal,
);

openAdminLoginBtn.addEventListener(
  'click',
  openAdminLoginModal,
);

closeRegisterModalBtn.addEventListener(
  'click',
  closeRegisterModal,
);

closeReceiveModalBtn.addEventListener(
  'click',
  closeReceiveModal,
);

closeAdminLoginModalBtn.addEventListener(
  'click',
  closeAdminLoginModal,
);

logoutAdminBtn.addEventListener(
  'click',
  () => setAdminLoginState(false),
);

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

/* ---------------------------
   수령 버튼
---------------------------- */

itemList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-item-id]');

  if (!button) return;

  openReceiveModal(button.dataset.itemId);
});

/* ---------------------------
   검색
---------------------------- */

searchInput.addEventListener('input', (event) => {
  const keyword = event.target.value
    .trim()
    .toLowerCase();

  const filtered = items.filter((item) => {
    const searchableText = [
      item.name,
      item.location,
      item.room,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(keyword);
  });

  renderItems(filtered);
});

/* ---------------------------
   시작
---------------------------- */

applyRoomFromQuery();

setAdminLoginState(isAdminLoggedIn());

loadData();

/*
 * 다른 사람이 등록한 분실물도 자동으로 반영
 */
setInterval(loadData, 10000);
