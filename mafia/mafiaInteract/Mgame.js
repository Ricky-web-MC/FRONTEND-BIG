// Mgame.js - Updated untuk konek ke backend (sync dengan server.js)

const SOCKET_URL = "http://localhost:3000"; // Ganti ke URL server kamu
const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

/* elements */
const myNameEl = document.getElementById('myName');
const myPP = document.getElementById('myPP');
const roomIdEl = document.getElementById('roomId');
const playersCountEl = document.getElementById('playersCount');
const playersMaxEl = document.getElementById('playersMax');
const playersList = document.getElementById('playersList');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');
const btnLeave = document.getElementById('btnLeave');
const btnOpenChat = document.getElementById('btnOpenChat');

const phaseLabel = document.getElementById('phaseLabel');
const centerText = document.getElementById('centerText');
const phaseTimer = document.getElementById('phaseTimer');
const actionArea = document.getElementById('actionArea');

const roleModal = document.getElementById('roleModal');
const roleBadge = document.getElementById('roleBadge');
const roleDesc = document.getElementById('roleDesc');
const btnRoleOk = document.getElementById('btnRoleOk');

const notifCard = document.getElementById('notifCard');
const sun = document.getElementById('sun');
const skyOverlay = document.getElementById('skyOverlay');

const clickSound = document.getElementById('clickSound');

/* state */
const username = localStorage.getItem('username') || 'Guest';
const profileImage = localStorage.getItem('profileImage') || '../public/img/profile.jpg';
let playersMax = parseInt(localStorage.getItem('playerCount') || '8', 10);

let room = localStorage.getItem('roomId');
if(!room){
  room = 'R' + playersMax + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  localStorage.setItem('roomId', room);
}

myNameEl.textContent = username;
myPP.src = profileImage;
roomIdEl.textContent = room;
playersMaxEl.textContent = playersMax;

/* audio unlock */
window.addEventListener('click', function unlock(){ if(clickSound) clickSound.play().then(()=>{clickSound.pause();clickSound.currentTime=0}).catch(()=>{}); window.removeEventListener('click', unlock); });
function playClick(){ if(clickSound){ clickSound.currentTime = 0; clickSound.play().catch(()=>{}); } }

/* helpers */
function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'<','>':'>','"':'&quot;',"'":'&#39;'}[c])); }
function showNotif(txt, ms=2500){
  if(!notifCard) return;
  notifCard.textContent = txt;
  notifCard.classList.remove('hidden');
  setTimeout(()=> notifCard.classList.add('hidden'), ms);
}

/* game state local */
let players = []; // {id, username}
let meId = null;
let meRole = null;

/* connect + join to get players info & trigger game start on server */
socket.on('connect', () => {
  meId = socket.id;
  console.log('connected to socket', meId);

  // ask server for current room players (safe: server's joinLobby will add this socket too)
  socket.emit('joinLobby', { username, room, maxPlayers: playersMax });
  // inform server we are joining the game phase
  socket.emit('joinGame', { username, room });
});

/* update player list */
socket.on('playerList', (list) => {
  players = list || [];
  renderPlayers(players);
  playersCountEl.textContent = (players || []).length;
});

/* room info (maybe contains maxPlayers) */
socket.on('roomInfo', info => {
  if(info && info.maxPlayers){
    playersMax = info.maxPlayers;
    playersMaxEl.textContent = playersMax;
  }
  if(info && info.room){
    room = info.room;
    roomIdEl.textContent = room;
  }
});

/* chat relay */
socket.on('chatMessage', ({ username: from, msg }) => {
  appendChat(from, msg);
});

/* server says game start */
socket.on('gameStart', (data) => {
  console.log('gameStart', data);
  showNotif('Permainan dimulai!');
});

/* server sends your role */
socket.on('setRole', (data) => {
  meRole = data.role;
  showRoleModal(meRole);
});

/* server starts night phase */
socket.on('nightStart', (data) => {
  phaseLabel.textContent = 'Malam';
  centerText.textContent = 'Malam tiba... aksi malam dimulai';
  skyOverlay.classList.remove('day', 'sunset');
  skyOverlay.classList.add('night');
  sun.style.bottom = '-360px';
  phaseTimer.textContent = '--';
  actionArea.classList.add('hidden'); // clear any previous UI
});

/* server sends action taken by a player */
socket.on('actionTaken', (data) => {
  appendChat('SYSTEM', `${data.username} (${data.role}) melakukan aksi pada ${data.target}`);
});

/* server sends night result */
socket.on('nightResult', (results) => {
  results.forEach(r => {
    if (r.status === 'dead') {
      appendChat('SYSTEM', `${r.username} telah mati.`);
    }
  });
});

/* server starts day phase */
socket.on('dayStart', (data) => {
  phaseLabel.textContent = 'Siang';
  centerText.textContent = 'Pagi tiba. Diskusi dimulai.';
  skyOverlay.classList.remove('night', 'sunset');
  skyOverlay.classList.add('day');
  sun.style.bottom = '-40px';
});

/* server sends voting result */
socket.on('voteResult', (data) => {
  appendChat('SYSTEM', `${data.executed} telah dieksekusi.`);
});

/* helper UI functions */
function renderPlayers(list){
  playersList.innerHTML = '';
  list.forEach(p => {
    const el = document.createElement('div');
    el.className = 'player-item';
    const initial = escapeHtml((p.username||'?').charAt(0)).toUpperCase();
    el.innerHTML = `<div class="initial" style="background:linear-gradient(135deg,#00eaff,#0077ff);width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#000">${initial}</div>
      <div style="margin-left:8px">
        <div style="font-weight:700">${escapeHtml(p.username)}</div>
        <div style="font-size:12px;opacity:0.8">${p.id === meId ? 'You' : 'Player'}</div>
      </div>`;
    playersList.appendChild(el);
  });
}

function appendChat(from, text){
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  div.innerHTML = `<b>${escapeHtml(from)}:</b> ${escapeHtml(text)}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

/* send chat */
btnSend.addEventListener('click', () => {
  const msg = (chatInput.value || '').trim();
  if(!msg) return;
  playClick();
  socket.emit('chatMessage', { room, username, msg });
  chatInput.value = '';
});
chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') btnSend.click(); });

btnLeave.addEventListener('click', () => {
  playClick();
  localStorage.removeItem('roomId');
  window.location.href = 'home.html'; // Ganti ke halaman lobby kamu
});

/* role modal */
function showRoleModal(role){
  roleBadge.textContent = role.toUpperCase();
  roleDesc.textContent = roleDescription(role);
  roleModal.classList.remove('hidden');
  playClick();

  // Hapus event listener lama (jika ada) untuk mencegah duplikasi
  btnRoleOk.onclick = null;
  // Tambahkan event listener baru
  btnRoleOk.onclick = () => {
    playClick();
    roleModal.classList.add('hidden');
    // Di sini kamu bisa kirim event ke server bahwa player siap
    // Misalnya: socket.emit("playerReady", { room, username });
    // Atau lanjut ke fase berikutnya jika semua player siap (diatur server)
  };
}

function roleDescription(role){
  const map = {
    mafia: 'Mafia: bunuh pemain di malam hari. Saat siang, diskusi & voting.',
    detective: 'Detektif: periksa satu pemain setiap malam.',
    doctor: 'Dokter: selamatkan satu pemain setiap malam.',
    arsonist: 'Arsonist: tandai pemain, bisa membakar. Netral menang sendiri.',
    spy: 'Spy: bisa reveal role pemain. Berpihak ke warga.',
    couple: 'Couple: kamu dan pasangan saling terikat.',
    joker: 'Joker: ingin dieliminasi saat voting.',
    villager: 'Warga: tidak punya aksi, voting saat siang.'
  };
  return map[role] || 'Warga biasa.';
}

/* expose for debugging */
window._MGAME = {
  meRole, players
};

socket.on('disconnect', ()=>{ console.log('socket disconnected'); });