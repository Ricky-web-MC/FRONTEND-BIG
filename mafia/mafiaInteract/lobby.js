// lobby.js (recommended)
// improvements: send maxPlayers on join, handle roomInfo/roomFull/errorMsg, avoid duplicates

const SOCKET_URL = "https://backend-production-09796.up.railway.app";
const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

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

const username = localStorage.getItem('username') || 'Guest';
const profileImage = localStorage.getItem('profileImage') || '../public/img/profile.jpg';
const playersMax = parseInt(localStorage.getItem('playerCount') || '8', 10);

let room = localStorage.getItem('roomId');
if(!room){
  room = 'R' + playersMax + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  localStorage.setItem('roomId', room);
}

myNameEl.textContent = username;
myPP.src = profileImage;
roomIdEl.textContent = room;
playersMaxEl.textContent = playersMax;

window.addEventListener('click', function unlock(){
  if (!clickSound) return;
  clickSound.play().then(()=>{clickSound.pause();clickSound.currentTime=0}).catch(()=>{});
  window.removeEventListener('click', unlock);
});

function playClick(){ if(clickSound){ clickSound.currentTime = 0; clickSound.play().catch(()=>{}); } }

// --- SEND joinLobby with maxPlayers ---
socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('joinLobby', { username, room, maxPlayers: playersMax });
});

// handle updated player list
socket.on('playerList', (list) => {
  renderPlayers(list);
  playersCountEl.textContent = list.length;
  // if full -> countdown
  if(list.length >= playersMax){
    startCountdown(10);
  }
});

// room info (server may send maxPlayers / meta)
socket.on('roomInfo', (info) => {
  if(info && info.maxPlayers) playersMaxEl.textContent = info.maxPlayers;
  if(info && info.room) roomIdEl.textContent = info.room;
});

// room full message
socket.on('roomFull', (data) => {
  // show overlay / notification; if you want auto start, you can trigger here
  console.warn('roomFull', data);
  // if you prefer auto-start only when room full: startCountdown(...)
  startCountdown(10);
});

// error message from server (e.g. no room)
socket.on('errorMsg', (msg) => {
  alert('Server: ' + msg);
});

// chat incoming
socket.on('chatMessage', ({username: from, msg}) => {
  appendChat(from, msg);
});

// send message (we DON'T locally append to avoid duplicates; we rely on server echo)
btnSend.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  if(!msg) return;
  playClick();
  socket.emit('chatMessage', { room, username, msg });
  chatInput.value = '';
});

chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') btnSend.click(); });

btnBackHome.addEventListener('click', () => {
  playClick();
  document.body.classList.add('page-fade-out');
  setTimeout (() => {
    localStorage.removeItem('roomId');
    window.location.href = 'home.html';
  }, 500);
});

btnViewPlayers.addEventListener('click', () => { playClick(); alert(playersList.innerText || 'Belum ada pemain'); });
btnReady.addEventListener('click', () => {
  playClick();
  alert('Siap! Tunggu pemain lain...');
  socket.emit('chatMessage', { room, username, msg: 'Siap!' });
});

function appendChat(from, text) {
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  // highlight local user's name color (optional)
  const nameIsYou = from === username;
  div.innerHTML = `
    <b style="color:${nameIsYou ? '#00eaff' : '#ffffff'}; text-shadow:0 0 6px ${nameIsYou ? '#00eaff' : '#888'};">
      ${escapeHtml(from)}:
    </b> 
    <span style="color:#ddd;"> ${escapeHtml(text)}</span>
  `;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderPlayers(list){
  playersList.innerHTML = '';
  list.forEach(p => {
    const el = document.createElement('div');
    el.className = 'player-item';
    el.innerHTML = `
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#00eaff,#0077ff);display:inline-block;text-align:center;line-height:36px;font-weight:700;color:#001">
        ${escapeHtml(p.username.charAt(0) || '?').toUpperCase()}
      </div>
      <div style="margin-left:8px;display:inline-block;vertical-align:top">
        <div style="font-weight:700">${escapeHtml(p.username)}</div>
        <div style="font-size:12px;opacity:0.8">${p.id === socket.id ? 'You' : 'Player'}</div>
      </div>`;
    playersList.appendChild(el);
  });
}

let countdownRunning = false;
function startCountdown(start){
  if(countdownRunning) return;
  countdownRunning = true;
  countNum.textContent = start;
  countOverlay.style.display = 'flex';
  let t = start;
  const iv = setInterval(()=>{
    t--;
    countNum.textContent = t;
    if(t <= 0){
      clearInterval(iv);
      countOverlay.querySelector('.small').textContent = 'GAME DIMULAI!!!';
      setTimeout(()=>{ window.location.href = 'Mgame.html'; }, 900);
    }
  }, 1000);
}

function escapeHtml(s){
  return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

socket.on('disconnect', ()=>{ console.log('socket disconnected'); });