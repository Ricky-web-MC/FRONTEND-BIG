// ====================================== FIXED LOBBY.JS =========================================
document.addEventListener("DOMContentLoaded", () => {

const SOCKET_URL = "https://backend-production-c187.up.railway.app";
const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

// ===== GET ALL ELEMENTS AFTER DOM READY (fix null errors) =====
const myNameEl = document.getElementById('myName');
const myPP = document.getElementById('myPP');
const roomIdEl = document.getElementById('roomId');
const playersCountEl = document.getElementById('playersCount');
const playersMaxEl = document.getElementById('playersMax');
const playersList = document.getElementById('playersList');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');
const btnBackHome = document.getElementById('btnBackHome');
const btnViewPlayers = document.getElementById('btnViewPlayers');
const btnReady = document.getElementById('btnReady');
const clickSound = document.getElementById('clickSound');
const countOverlay = document.getElementById('countOverlay');
const countNum = document.getElementById('countNum');


// ===== GLOBAL STATE =====
const username = localStorage.getItem('username') || 'Guest';
const profileImage = localStorage.getItem('profileImage') || '../public/img/profile.jpg';
let playersMax = parseInt(localStorage.getItem('playerCount') || '8', 10);

let room = localStorage.getItem('roomId');
if(!room){
  room = 'R' + playersMax + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  localStorage.setItem('roomId', room);
}


// ===== RENDER INITIAL UI =====
myNameEl.textContent = username;
myPP.src = profileImage;
roomIdEl.textContent = room;
playersMaxEl.textContent = playersMax;


// ===== ENABLE CLICK SOUND =====
window.addEventListener('click', function unlock(){
  if(clickSound) clickSound.play().then(()=>{
    clickSound.pause();
    clickSound.currentTime = 0;
  }).catch(()=>{});
  window.removeEventListener('click', unlock);
});
function playClick(){ 
  if(clickSound){
    clickSound.currentTime = 0;
    clickSound.play().catch(()=>{});
  } 
}


// ===== SOCKET CONNECT =====
socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('joinLobby', { username, room, maxPlayers: playersMax });
});


// ===== RECEIVE PLAYER LIST =====
socket.on('playerList', (list) => {
  if (!playersList) return; // prevent null
  renderPlayers(list || []);
  playersCountEl.textContent = (list || []).length;
});

// ===== ROOM INFO =====
socket.on('roomInfo', (info) => {
  if (info?.maxPlayers) {
    playersMax = info.maxPlayers;
    playersMaxEl.textContent = playersMax;
  }
  if (info?.room) {
    room = info.room;
    roomIdEl.textContent = room;
  }
});


// ===== COUNTDOWN =====
let countdownRunning = false;

socket.on('startCountdown', (data) => {
  const secs = parseInt(data?.seconds || 10, 10);
  startCountdown(secs);
});

function startCountdown(start){
  if (countdownRunning) return;
  countdownRunning = true;

  countOverlay.style.display = "flex";
  countNum.textContent = start;

  let t = start;

  const iv = setInterval(() => {
    countNum.textContent = t;
    t--;

    if (t < 0){
      clearInterval(iv);

      // Ubah overlay text
      countOverlay.querySelector('.small').textContent = "ROLE AKAN DIBAGIKAN!!!";

      // Delay sejenak biar user lihat
      setTimeout(() => {
        countOverlay.style.display = "none";
        showRolePopup();
      }, 500);
    }
  }, 1000);
}



// ===== ROLE POPUP =====
function showRolePopup(){
  const rolePopup = document.getElementById('rolePopup');
  const myRoleEl = document.getElementById('myRole');

  // Pilih role random: Mafia / Village
  const role = Math.random() < 0.4 ? 'Mafia' : 'Village'; // 40% Mafia
  myRoleEl.textContent = role;

  // Simpan role ke localStorage supaya game.js bisa akses
  localStorage.setItem('myRole', role);

  rolePopup.style.display = "flex";
  rolePopup.classList.add('page-fade-in'); // bisa tambahin fade-in CSS nanti

  // Tampilkan 3 detik
  setTimeout(() => {
    rolePopup.classList.remove('page-fade-in');
    rolePopup.classList.add('page-fade-out');

    setTimeout(() => {
      rolePopup.style.display = "none";

      // Emit siap ke server
      socket.emit('playerReady', { room, username, role });

      // Redirect ke game.html
      window.location.href = "../mafia_game/game.html";
    }, 500); // sesuaikan durasi fadeOut CSS
  }, 4000); // 3 detik popup
}




// ===== CHAT =====
socket.on('chatMessage', ({username: from, msg}) => {
  appendChat(from, msg);
});

btnSend.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  if(!msg) return;
  playClick();
  socket.emit('chatMessage', { room, username, msg });
  chatInput.value = '';
});

chatInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') btnSend.click();
});



// ===== BUTTONS =====
btnBackHome.addEventListener('click', () => {
  playClick();
  document.body.classList.add('page-fade-out');
  setTimeout(() => {
    localStorage.removeItem('roomId');
    window.location.href = "../mafia_home/home.html";
  }, 500);
});

btnViewPlayers.addEventListener('click', () => {
  playClick();
  alert(playersList.innerText || "Belum ada pemain");
});

btnReady.addEventListener('click', () => {
  playClick();
  socket.emit('chatMessage', { room, username, msg: "Siap!" });
  alert("Siap! Tunggu pemain lain…");
});



// ===== HELPERS =====
function appendChat(from, text){
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  div.innerHTML = `<b>${escapeHtml(from)}:</b> ${escapeHtml(text)}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderPlayers(list){
  playersList.innerHTML = "";
  list.forEach(p => {
    const el = document.createElement('div');
    el.className = "player-item";
    el.innerHTML = `
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#00eaff,#0077ff);
      display:inline-block;text-align:center;line-height:36px;font-weight:700;color:#001">
        ${escapeHtml((p.username||'?').charAt(0).toUpperCase())}
      </div>
      <div style="margin-left:8px">
        <div style="font-weight:700">${escapeHtml(p.username)}</div>
        <div style="font-size:12px;opacity:0.8">${p.id === socket.id ? 'You' : 'Player'}</div>
      </div>
    `;
    playersList.appendChild(el);
  });
}

function escapeHtml(s){
  return (s+'').replace(/[&<>"']/g, c => 
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}

socket.on('disconnect', () => console.log("socket disconnected"));

}); // END DOMContentLoaded WRAPPER
