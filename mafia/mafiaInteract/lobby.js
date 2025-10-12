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
  clickSound.play().then(()=>{clickSound.pause();clickSound.currentTime=0}).catch(()=>{});
  window.removeEventListener('click', unlock);
});

function playClick(){ clickSound.currentTime = 0; clickSound.play().catch(()=>{}); }

socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('joinLobby', { username, room });
});

socket.on('playerList', (list) => {
  renderPlayers(list);
  playersCountEl.textContent = list.length;
  if(list.length >= playersMax){
    startCountdown(10);
  }
});

socket.on('chatMessage', ({username: from, msg}) => {
  appendChat(from, msg);
});

btnSend.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  if(!msg) return;
  playClick();
  socket.emit('chatMessage', { room, username, msg });
  appendChat(username + ' (you)', msg);
  chatInput.value = '';
});

chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') btnSend.click(); });

btnBackHome.addEventListener('click', () => {
  playClick();
  localStorage.removeItem('roomId');
  window.location.href = 'home.html';
});
btnViewPlayers.addEventListener('click', () => { playClick(); alert(playersList.innerText || 'Belum ada pemain'); });
btnReady.addEventListener('click', () => {
  playClick();
  alert('Siap! Tunggu pemain lain...');
  socket.emit('chatMessage', { room, username, msg: 'Siap!' });
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
    el.innerHTML = `
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#00eaff,#0077ff);display:inline-block;text-align:center;line-height:36px;font-weight:700;color:#001">
        ${p.username.charAt(0).toUpperCase()}
      </div>
      <div>
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