// game.js - Mafia Among Us Style Game (Event Card & Chat Only - Updated)
// Koneksi ke server Socket.IO
const SOCKET_URL = "https://backend-production-09796.up.railway.app"; // Hapus spasi
const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

/* ==================== AMBIL ELEMEN HTML ==================== */
// Ambil semua elemen yang akan diubah oleh JS
const phaseLabel = document.getElementById('phaseLabel'); // Label untuk status fase (menunggu role, dll)
const eventCard = document.getElementById('eventCard'); // Card utama untuk role, voting, dll
const eventTitle = document.getElementById('eventTitle'); // Judul card (KAMU ADALAH, ELIMINASI PEMAIN, dll)
const eventContent = document.getElementById('eventContent'); // Isi card (role, tombol vote, dll)
const roleBadge = document.getElementById('roleBadge'); // Badge nama role (VILLAGER, MAFIA, dll)
const roleDesc = document.getElementById('roleDesc'); // Deskripsi role
const actionList = document.getElementById('actionList'); // List untuk aksi role (nanti jika perlu)
const voteList = document.getElementById('voteList'); // List pemain untuk voting
const eventControls = document.getElementById('eventControls'); // Tombol-tombol di dalam card
const btnEventOk = document.getElementById('btnEventOk'); // Tombol "Siap" di card
const btnSkipVote = document.getElementById('btnSkipVote'); // Tombol "Skip" saat voting
const btnSubmitVote = document.getElementById('btnSubmitVote'); // Tombol "Kirim Vote"

const btnOpenChat = document.getElementById('btnOpenChat'); // Tombol buka chat
const chatBox = document.getElementById('chatBox'); // Container chatbox
const chatLog = document.getElementById('chatLog'); // Tempat semua pesan muncul
const chatInput = document.getElementById('chatInput'); // Input untuk ketik pesan
const btnSend = document.getElementById('btnSend'); // Tombol kirim pesan

const resultCard = document.getElementById('resultCard'); // Card untuk tampilan victory/defeat
const resultText = document.getElementById('resultText'); // Tulisan "VICTORY!" atau "DEFEAT!"
const resultDesc = document.getElementById('resultDesc'); // Deskripsi kondisi menang/kalah
const btnHome = document.getElementById('btnHome'); // Tombol kembali ke home
const btnReplay = document.getElementById('btnReplay'); // Tombol main lagi

const notifCard = document.getElementById('notifCard'); // Notifikasi kecil di atas layar

// Tambahin elemen notifikasi titik
const chatNotification = document.getElementById('chatNotification');

/* ==================== STATE VARIABEL ==================== */
// Variabel untuk menyimpan data sementara
let players = []; // Daftar semua player di room
let meId = null; // Socket ID kamu
let meRole = null; // Role kamu (mafia, villager, dll)
let meUsername = localStorage.getItem('username') || 'Guest'; // Ambil username dari localStorage
let room = localStorage.getItem('roomId') || 'default'; // Ambil room ID dari localStorage

/* ==================== FUNGSI PEMBANTU ==================== */

// Fungsi untuk menampilkan elemen HTML
function show(el) {
  el.classList.remove('hidden');
}

// Fungsi untuk menyembunyikan elemen HTML
function hide(el) {
  el.classList.add('hidden');
}

// Fungsi untuk menampilkan notifikasi
function showNotif(text, duration = 2500) {
  notifCard.textContent = text;
  show(notifCard);
  // Sembunyikan otomatis setelah 'duration' ms
  setTimeout(() => hide(notifCard), duration);
}

// Fungsi untuk menambahkan pesan ke chat log (dari lobby style)
function appendChat(from, text) {
  const div = document.createElement('div');
  div.style.marginBottom = '8px'; // Jarak antar pesan
  div.innerHTML = `<b>${escapeHtml(from)}:</b> ${escapeHtml(text)}`;
  chatLog.appendChild(div);
  // Auto-scroll ke pesan terbaru
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Fungsi untuk menampilkan notifikasi titik
function showChatNotification() {
  show(chatNotification);
}

// Fungsi untuk menyembunyikan notifikasi titik
function hideChatNotification() {
  hide(chatNotification);
}

// Fungsi untuk membuat list pemain (untuk voting atau aksi role)
function renderPlayerList(container, onClick) {
  container.innerHTML = '';
  players.forEach(p => {
    if (p.id === meId) return; // Jangan tampilkan diri sendiri
    const btn = document.createElement('button');
    btn.textContent = p.username;
    // Tambahkan event listener saat tombol dipilih
    btn.onclick = () => onClick(btn);
    container.appendChild(btn);
  });
}

// Fungsi untuk mendapatkan deskripsi role
function roleDescription(role) {
  const map = {
    mafia: 'Mafia: bunuh pemain di malam hari. Saat siang, diskusi & voting.',
    detective: 'Detektif: periksa satu pemain setiap malam. Salah tembak = mati.',
    doctor: 'Dokter: selamatkan satu pemain setiap malam.',
    spy: 'Spy: bisa reveal role pemain. Berpihak ke warga.',
    arsonist: 'Arsonist: tandai pemain, bisa membakar. Netral menang sendiri.',
    couple: 'Couple: kamu dan pasangan saling terikat.',
    joker: 'Joker: ingin dieliminasi saat voting.',
    villager: 'Warga: tidak punya aksi, voting saat siang.'
  };
  return map[role] || 'Warga biasa.';
}

// Fungsi untuk menampilkan event card dengan isi dan tombol yang sesuai
function showEventCard(title, content, showOk = true, showSubmit = false, showSkip = false) {
  eventTitle.textContent = title; // Set judul card
  eventContent.innerHTML = content; // Set isi card
  show(eventCard); // Tampilkan card

  // Sembunyikan semua tombol dulu
  hide(btnEventOk);
  hide(btnSubmitVote);
  hide(btnSkipVote);

  // Tampilkan tombol sesuai parameter
  if (showOk) show(btnEventOk);
  if (showSubmit) show(btnSubmitVote);
  if (showSkip) show(btnSkipVote);
}

/* ==================== SOCKET.IO EVENTS ==================== */

// Ketika koneksi ke server berhasil
socket.on('connect', () => {
  console.log('✅ Connected to server.');
  // Simpan socket ID kamu
  meId = socket.id;
  // Kirim permintaan join ke game room ke server
  socket.emit('joinGame', { username: meUsername, room });
});

// Server kirim daftar pemain
socket.on('playerList', (list) => {
  players = list;
});

// Server kirim role kamu
socket.on('setRole', (data) => {
  meRole = data.role;
  const desc = roleDescription(meRole);
  // Buat isi card untuk role
  const content = `
    <div class="role-badge">${meRole.toUpperCase()}</div>
    <p class="role-desc">${desc}</p>
  `;
  // Tampilkan card role
  showEventCard('KAMU ADALAH', content);
  // Update label fase
  phaseLabel.textContent = `Kamu adalah ${meRole}`;
});

// Server mulai game (biasanya trigger setRole)
socket.on('gameStart', () => {
  phaseLabel.textContent = 'Role sedang dibagikan...';
});

// Server mulai fase malam
socket.on('nightStart', (data) => {
  phaseLabel.textContent = 'Malam Hari';
  // Tampilkan notifikasi bahwa malam tiba
  showEventCard('MALAM HARI', 'Mafia, detektif, dokter, dll sedang beraksi...', false);
  // Sembunyikan card otomatis setelah 5 detik
  setTimeout(() => hide(eventCard), 5000);
});

// Server mulai fase siang (diskusi & voting)
socket.on('dayStart', (data) => {
  phaseLabel.textContent = 'Diskusi';
  // Tampilkan chatbox untuk diskusi (bisa diatur sesuai kebutuhan)
  // show(chatBox); // Misalnya, munculkan otomatis saat dayStart

  // Setelah 2 menit, ganti ke voting
  setTimeout(() => {
    phaseLabel.textContent = 'Voting';
    // hide(chatBox); // Sembunyikan chatbox
    // Buat isi card untuk voting
    const content = `
      <p>Pilih siapa yang akan dieksekusi:</p>
      <div id="voteList" class="vote-list"></div>
    `;
    // Tampilkan card voting
    showEventCard('ELIMINASI PEMAIN', content, false, true, true);
    // Render list pemain untuk voting
    renderPlayerList(voteList, btn => {
      // Hanya satu tombol yang bisa dipilih
      Array.from(voteList.children).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  }, 120000); // 2 menit diskusi
});

// Server kirim notifikasi aksi role (mafia bunuh, dll)
socket.on('actionTaken', (data) => {
  showNotif(`${data.username} (${data.role}) melakukan aksi pada ${data.target}`);
});

// Server kirim hasil voting
socket.on('voteResult', (data) => {
  if (data.executed) {
    showNotif(`${data.executed} telah dieksekusi.`);
  } else {
    showNotif('Voting dilewati.');
  }
});

// Server kirim hasil akhir game
socket.on('gameOver', (data) => {
  if (data.winner === 'mafia') {
    if (['mafia'].includes(meRole)) {
      resultText.textContent = 'VICTORY!';
      resultDesc.textContent = 'Mafia menang!';
    } else {
      resultText.textContent = 'DEFEAT!';
      resultDesc.textContent = 'Mafia menang!';
    }
  } else {
    if (['mafia'].includes(meRole)) {
      resultText.textContent = 'DEFEAT!';
      resultDesc.textContent = 'Warga menang!';
    } else {
      resultText.textContent = 'VICTORY!';
      resultDesc.textContent = 'Warga menang!';
    }
  }
  show(resultCard); // Tampilkan card victory/defeat
});

/* ==================== BUTTON EVENTS ==================== */

// Tombol "Siap" di event card
btnEventOk.onclick = () => {
  hide(eventCard); // Sembunyikan card
};

// Tombol "Kirim Vote" saat voting
btnSubmitVote.onclick = () => {
  const selected = voteList.querySelector('.selected'); // Cari tombol yang dipilih
  const target = selected ? selected.textContent : null; // Ambil nama pemain
  if (!target) {
    showNotif('Pilih target terlebih dahulu!');
    return;
  }
  // Kirim vote ke server
  socket.emit('votePlayer', { room, voter: meUsername, target });
  hide(eventCard); // Sembunyikan card
  showNotif(`Kamu memilih ${target}`);
};

// Tombol "Skip" saat voting
btnSkipVote.onclick = () => {
  // Kirim vote kosong ke server
  socket.emit('votePlayer', { room, voter: meUsername, target: null });
  hide(eventCard); // Sembunyikan card
  showNotif('Kamu skip voting.');
};

// Tombol buka/sembunyikan chatbox
btnOpenChat.onclick = () => {
  chatBox.classList.toggle('hidden'); // Toggle tampil/sembunyi
  // Sembunyikan notifikasi titik saat chatbox dibuka
  hideChatNotification();
};

// Tombol kirim pesan chat
btnSend.onclick = () => {
  const msg = chatInput.value.trim(); // Ambil pesan
  if (!msg) return; // Jika kosong, gak dikirim

  // Tampilkan dulu pesan kamu di chat log (seolah-olah udah dikirim)
  appendChat(meUsername, msg);

  // Kirim pesan ke server
  socket.emit('chatMessage', { room, username: meUsername, msg });
  chatInput.value = ''; // Kosongkan input
};

// Enter di input chat = klik tombol kirim
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSend.click();
});

// Tombol "Kembali ke Home"
btnHome.onclick = () => {
  window.location.href = 'home.html'; // Arahkan ke halaman home
};

// Tombol "Main Lagi"
btnReplay.onclick = () => {
  window.location.href = 'lobby.html'; // Arahkan ke halaman lobby
};

/* ==================== CHAT RELAY ==================== */

// Terima pesan dari server dan tampilkan di chat log
socket.on('chatMessage', ({ username, msg }) => {
  // Jangan append ulang jika pesan ini dari kamu, karena kamu udah append sebelum kirim ke server
  if (username !== meUsername) {
    appendChat(username, msg);
    // Tampilkan notifikasi titik karena pesan masuk dari player lain
    showChatNotification();
  }
});

// Fungsi escape HTML (untuk keamanan input)
function escapeHtml(s) {
  return (s + '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '<', '>': '>', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ==================== DISCONNECT ==================== */

// Ketika socket terputus
socket.on('disconnect', () => {
  console.log('Disconnected from server.');
});