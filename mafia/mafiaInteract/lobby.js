//================================ LOBBY JS =======================================
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

// unlock click sound
window.addEventListener('click', function unlock(){
  if(clickSound) clickSound.play().then(()=>{clickSound.pause();clickSound.currentTime=0}).catch(()=>{});
  window.removeEventListener('click', unlock);
});
function playClick(){ if(clickSound){ clickSound.currentTime = 0; clickSound.play().catch(()=>{}); } }

// connect & join
socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('joinLobby', { username, room, maxPlayers: playersMax });
});

// render player list
socket.on('playerList', (list) => {
  renderPlayers(list || []);
  playersCountEl.textContent = (list || []).length;
  // NOTE: countdown controlled by server via 'startCountdown' event
});

// room info update
socket.on('roomInfo', (info) => {
  if (info && info.maxPlayers) {
    playersMax = info.maxPlayers;
    playersMaxEl.textContent = playersMax;
  }
  if (info && info.room) {
    room = info.room;
    roomIdEl.textContent = room;
  }
});

// di event listener startCountdown, ubah dikit:
socket.on('startCountdown', (data) => {
  const secs = (data && data.seconds) ? parseInt(data.seconds,10) : 10;
  const serverStart = data.startTime ? data.startTime : Date.now();
  const diff = Math.floor((Date.now() - serverStart) / 1000);
  const adjusted = Math.max(0, secs - diff);
  startCountdown(adjusted);
});

// chat messages (server broadcast)
socket.on('chatMessage', ({username: from, msg}) => {
  appendChat(from, msg);
});

// send message (do NOT locally append; wait server broadcast to avoid duplicates)
btnSend.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  if(!msg) return;
  playClick();
  socket.emit('chatMessage', { room, username, msg });
  chatInput.value = '';
});

// enter key
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
  socket.emit('chatMessage', { room, username, msg: 'Siap!' });
  alert('Siap! Tunggu pemain lain...');
});

function appendChat(from, text){
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  div.innerHTML = `<b>${escapeHtml(from)}:</b> ${escapeHtml(text)}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderPlayers(list){
  playersList.innerHTML = '';
  list.forEach(p => {
    const el = document.createElement('div');
    el.className = 'player-item';
    el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#00eaff,#0077ff);display:inline-block;text-align:center;line-height:36px;font-weight:700;color:#001">${escapeHtml((p.username||'?').charAt(0).toUpperCase())}</div>
      <div style="margin-left:8px">
        <div style="font-weight:700">${escapeHtml(p.username)}</div>
        <div style="font-size:12px;opacity:0.8">${p.id === socket.id ? 'You' : 'Player'}</div>
      </div>`;
    playersList.appendChild(el);
  });
}

// countdown overlay (same as before)
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
      setTimeout(()=>{
        window.location.href = 'Mgame.html';
      }, 900);
    }
  }, 1000);
}

function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

socket.on('disconnect', ()=>{ console.log('socket disconnected'); });