// ============================================================
// 학교 분실물 관리 - Supabase 연결 버전
// 기존 화면/기능은 유지하고 데이터 저장만 Supabase로 변경
// ============================================================

const SUPABASE_URL = 'https://opbkaeipdtjzrjzfacbp.supabase.co';

// 네 Supabase Publishable Key를 여기에 붙여넣기
const SUPABASE_ANON_KEY = 'sb_publishable_uQNasfOJyDb8Nf2PnAkGaA_AgXvtyLk';

const SUPABASE_BUCKET = 'lost-item-images';
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
      <text x="400" y="400" text-anchor="middle" fill="#4564c8"
        font-size="30" font-family="Arial,sans-serif">No Image</text>
    </svg>
  `);

// ============================================================
// 원본 샘플 데이터 - 화면 디자인/사진 보존
// ============================================================

const initialItems = [
  {
    id: 'sample-1',
    name: '검정 가방',
    location: '2층 복도',
    room: '교무실 1',
    date: '2026-08-25',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    isSample: true,
  },
  {
    id: 'sample-2',
    name: '파란색 물병',
    location: '도서관 1층',
    room: '교무실 2',
    date: '2026-08-27',
    image:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
    isSample: true,
  },
  {
    id: 'sample-3',
    name: '검정색 이어폰',
    location: '체육관',
    room: '교무실 3',
    date: '2026-08-28',
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
    isSample: true,
  },
];

let items = [];
let receivedItems = [];
let selectedItemId = null;

// ============================================================
// HTML 요소
// ============================================================

const itemList = document.getElementById('itemList');
const adminCurrentTableBody = document.getElementById(
  'adminCurrentTableBody',
);
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

const openRegisterModalBtn =
  document.getElementById('openRegisterModal');

const openAdminLoginBtn =
  document.getElementById('openAdminLoginBtn');

const closeRegisterModalBtn =
  document.getElementById('closeRegisterModal');

const closeReceiveModalBtn =
  document.getElementById('closeReceiveModal');

const closeAdminLoginModalBtn =
  document.getElementById('closeAdminLoginModal');

const logoutAdminBtn =
  document.getElementById('logoutAdminBtn');

// ============================================================
// Supabase 연결
// ============================================================

function getSupabaseClient() {
  if (!window.supabase) {
    throw new Error(
      'Supabase 라이브러리를 불러오지 못했습니다. 페이지를 새로고침해 주세요.',
    );
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('여기에_')) {
    throw new Error(
      'app.js의 SUPABASE_ANON_KEY에 Supabase Publishable Key를 입력해 주세요.',
    );
  }

  return window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );
}

let supabaseClient = null;

try {
  if (window.supabase) {
    supabaseClient = getSupabaseClient();
  }
} catch (error) {
  console.error(error);
}

// ============================================================
// QR 교무실 자동 선택
// ============================================================

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

  const trimmedRoom = roomFromQr.trim();

  const matchedOption = Array.from(roomSelect.options).find(
    (option) => {
      return (
        normalizeRoomName(option.value) ===
        normalizeRoomName(trimmedRoom)
      );
    },
  );

  if (matchedOption) {
    roomSelect.value = matchedOption.value;
  }
}

// ============================================================
// 날짜
// ============================================================

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

// ============================================================
// 화면 표시
// ============================================================

function updateCount() {
  if (itemCount) {
    itemCount.textContent = `${items.length}개`;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char],
  );
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
              item.isSample
                ? ''
                : `
                  <button
                    class="danger-btn"
                    type="button"
                    data-delete-item-id="${escapeHtml(item.id)}"
                  >
                    삭제
                  </button>
                `
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
              data-delete-received-id="${escapeHtml(record.id)}"
            >
              삭제
            </button>
          </td>
        </tr>
      `,
    )
    .join('');
}

function renderItems(filteredItems = items) {
  if (!filteredItems.length) {
    itemList.innerHTML = `
      <div class="empty-state">
        <h3>보관 중인 분실물이 없습니다.</h3>
        <p>
          등록된 물건이 없거나 검색 조건에 맞는 물건이 없습니다.
        </p>
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
                data-item-id="${escapeHtml(item.id)}"
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

// ============================================================
// 관리자
// ============================================================

function isAdminLoggedIn() {
  return (
    sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
  );
}

function setAdminLoginState(isLoggedIn) {
  if (isLoggedIn) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');

    if (adminPanel) {
      adminPanel.classList.remove('hidden');
    }
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);

    if (adminPanel) {
      adminPanel.classList.add('hidden');
    }
  }
}

// ============================================================
// 모달
// ============================================================

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

// ============================================================
// 이미지 업로드
// ============================================================

async function uploadImage(file) {
  if (!file) {
    return PLACEHOLDER_IMAGE;
  }

  if (!supabaseClient) {
    supabaseClient = getSupabaseClient();
  }

  const safeName = file.name
    .replace(/[^\w가-힣.-]+/g, '-')
    .replace(/-+/g, '-');

  const filePath = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

  if (uploadError) {
    throw new Error(
      `사진 업로드에 실패했습니다: ${uploadError.message}`,
    );
  }

  const { data } = supabaseClient.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// ============================================================
// DB → 화면 데이터 변환
// ============================================================

function mapDbItem(row) {
  return {
    id: row.id,
    name: row.title,
    location: row.location || '',
    room: row.room || '',
    date: row.found_date || '',
    image: row.image_url || PLACEHOLDER_IMAGE,
    isSample: false,
  };
}

function mapDbReceived(row) {
  return {
    id: row.id,
    itemName: row.item_name,
    studentId: row.student_id,
    studentName: row.student_name,
    receivedDate: row.received_date,
  };
}

// ============================================================
// 데이터 불러오기
// ============================================================

async function loadData() {
  try {
    if (!supabaseClient) {
      supabaseClient = getSupabaseClient();
    }

    const { data: dbItems, error: itemsError } =
      await supabaseClient
        .from('lost_items')
        .select(
          'id, title, description, location, found_date, status, created_at, room, image_url',
        )
        .eq('status', '보관 중')
        .order('created_at', {
          ascending: false,
        });

    if (itemsError) {
      throw new Error(
        `분실물 데이터를 불러오지 못했습니다: ${itemsError.message}`,
      );
    }

    const { data: dbReceived, error: receivedError } =
      await supabaseClient
        .from('received_items')
        .select(
          'id, item_name, student_id, student_name, received_date',
        )
        .order('received_date', {
          ascending: false,
        });

    if (receivedError) {
      throw new Error(
        `수령 기록을 불러오지 못했습니다: ${receivedError.message}`,
      );
    }

    // 원래 사이트의 샘플 사진/카드를 유지
    const databaseItems = (dbItems || []).map(mapDbItem);

    items = [
      ...databaseItems,
      ...initialItems,
    ];

    receivedItems = (dbReceived || []).map(mapDbReceived);

    renderItems();
    renderCurrentAdminTable();
    renderReceivedTable();
  } catch (error) {
    console.error(error);

    itemList.innerHTML = `
      <div class="empty-state">
        <h3>데이터를 불러오지 못했습니다.</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

// ============================================================
// 버튼 이벤트
// ============================================================

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

// ============================================================
// 모달 바깥 클릭
// ============================================================

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

// ============================================================
// 관리자 로그인
// ============================================================

adminLoginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(adminLoginForm);

  const password = formData
    .get('adminPassword')
    .toString();

  if (password === ADMIN_PASSWORD) {
    setAdminLoginState(true);
    closeAdminLoginModal();
    return;
  }

  alert('비밀번호가 올바르지 않습니다.');
});

// ============================================================
// 관리자 - 분실물 삭제
// ============================================================

adminCurrentTableBody.addEventListener(
  'click',
  async (event) => {
    const button = event.target.closest(
      '[data-delete-item-id]',
    );

    if (!button) return;

    const itemId = button.dataset.deleteItemId;

    // 샘플 데이터는 원본 화면 보존을 위해 삭제하지 않음
    if (String(itemId).startsWith('sample-')) {
      return;
    }

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
        supabaseClient = getSupabaseClient();
      }

      const { error } = await supabaseClient
        .from('lost_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        throw new Error(
          `분실물 삭제에 실패했습니다: ${error.message}`,
        );
      }

      await loadData();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  },
);

// ============================================================
// 관리자 - 수령 기록 삭제
// ============================================================

receivedTableBody.addEventListener(
  'click',
  async (event) => {
    const button = event.target.closest(
      '[data-delete-received-id]',
    );

    if (!button) return;

    const recordId = button.dataset.deleteReceivedId;

    const record = receivedItems.find(
      (entry) =>
        String(entry.id) === String(recordId),
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
        supabaseClient = getSupabaseClient();
      }

      const { error } = await supabaseClient
        .from('received_items')
        .delete()
        .eq('id', recordId);

      if (error) {
        throw new Error(
          `수령 기록 삭제에 실패했습니다: ${error.message}`,
        );
      }

      await loadData();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  },
);

// ============================================================
// 수령하기 버튼
// ============================================================

itemList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-item-id]');

  if (!button) return;

  openReceiveModal(button.dataset.itemId);
});

// ============================================================
// 검색
// ============================================================

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

// ============================================================
// 분실물 등록
// ============================================================

itemForm.addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    const submitButton = itemForm.querySelector(
      'button[type="submit"]',
    );

    submitButton.disabled = true;

    try {
      if (!supabaseClient) {
        supabaseClient = getSupabaseClient();
      }

      const formData = new FormData(itemForm);

      const name = formData
        .get('name')
        .toString()
        .trim();

      const location = formData
        .get('location')
        .toString()
        .trim();

      const room = formData
        .get('room')
        .toString()
        .trim();

      const date = formData
        .get('date')
        .toString();

      if (!name || !location || !room || !date) {
        throw new Error(
          '물건 이름, 습득 장소, 날짜, 보관 교무실을 모두 입력해 주세요.',
        );
      }

      const fileInput =
        document.getElementById('photoInput');

      const selectedFile =
        fileInput?.files?.[0] || null;

      // 사진을 Storage에 업로드
      let imageUrl = PLACEHOLDER_IMAGE;

      if (selectedFile) {
        imageUrl = await uploadImage(selectedFile);
      }

      // Supabase DB에 저장
      const { error } = await supabaseClient
        .from('lost_items')
        .insert({
          title: name,
          description: null,
          location: location,
          found_date: date,
          status: '보관 중',
          room: room,
          image_url: imageUrl,
        });

      if (error) {
        throw new Error(
          `분실물 등록에 실패했습니다: ${error.message}`,
        );
      }

      await loadData();

      closeRegisterModal();

      alert('분실물이 등록되었습니다.');
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      submitButton.disabled = false;
    }
  },
);

// ============================================================
// 분실물 수령
// ============================================================

receiveForm.addEventListener(
  'submit',
  async (event) => {
    event.preventDefault();

    if (selectedItemId === null) return;

    const submitButton = receiveForm.querySelector(
      'button[type="submit"]',
    );

    submitButton.disabled = true;

    try {
      if (!supabaseClient) {
        supabaseClient = getSupabaseClient();
      }

      const selectedItem = items.find(
        (item) =>
          String(item.id) ===
          String(selectedItemId),
      );

      if (!selectedItem) {
        alert(
          '이미 다른 사람이 수령했거나 삭제된 분실물입니다.',
        );

        closeReceiveModal();
        await loadData();

        return;
      }

      // 샘플 카드에는 DB ID가 없으므로 수령 처리를 DB에 기록할 수 없음
      if (selectedItem.isSample) {
        alert(
          '현재 화면의 예시 분실물입니다. 실제 등록된 분실물을 선택해 주세요.',
        );

        closeReceiveModal();

        return;
      }

      const formData = new FormData(receiveForm);

      const studentId = formData
        .get('studentId')
        .toString()
        .trim();

      const studentName = formData
        .get('studentName')
        .toString()
        .trim();

      const { error: receivedError } =
        await supabaseClient
          .from('received_items')
          .insert({
            item_name: selectedItem.name,
            student_id: studentId,
            student_name: studentName,
          });

      if (receivedError) {
        throw new Error(
          `수령 기록 저장에 실패했습니다: ${receivedError.message}`,
        );
      }

      // 수령된 분실물을 현재 목록에서 제거
      const { error: itemError } =
        await supabaseClient
          .from('lost_items')
          .update({
            status: '수령 완료',
          })
          .eq('id', selectedItem.id);

      if (itemError) {
        throw new Error(
          `분실물 상태 변경에 실패했습니다: ${itemError.message}`,
        );
      }

      await loadData();

      closeReceiveModal();

      alert('수령 완료로 처리되었습니다.');
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      submitButton.disabled = false;
    }
  },
);

// ============================================================
// 시작
// ============================================================

applyRoomFromQuery();

setAdminLoginState(isAdminLoggedIn());

// 초기 데이터 로딩
loadData();

// 다른 사람이 등록한 내용이 반영되도록 10초마다 확인
setInterval(loadData, 10000);
