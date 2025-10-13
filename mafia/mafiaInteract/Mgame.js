// ==================================== Mgame JS =====================================//
const SOCKET_URL = "https://backend-production-09796.up.railway.app";
const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

/* elements */
const myNameEl = document.getElementById('myName');
const myPP = document.getElementById('myPP');
const roomIdEl = document.getElementById('roomId');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');
const clickSound = document.getElementById('clickSound');

const username = localStorage.getItem('username') || 'Guest';
const profileImage = localStorage.getItem('profileImage') || '../public/img/profile.jpg';
const room = localStorage.getItem('roomId');

/* init UI */
myNameEl.textContent = username;
myPP.src = profileImage;
roomIdEl.textContent = room;

/* sound helper */
function playClick(){ if(clickSound){ clickSound.currentTime = 0; clickSound.play().catch(()=>{}); } }

/* connect to existing room */
socket.on('connect', () => {
  console.log('connected to game', socket.id);
  socket.emit('joinGame', { username, room }); // beda event biar backend tahu ini fase game
});

/* listen chat */
socket.on('chatMessage', ({ username: from, msg }) => appendChat(from, msg));

/* kirim chat */
btnSend.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  playClick();
  socket.emit('chatMessage', { room, username, msg });
  chatInput.value = '';
});
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnSend.click(); });

/* fase game pertama */
socket.on('gameStart', (data) => {
  appendChat('SYSTEM', 'Permainan dimulai...');
  setTimeout(() => appendChat('SYSTEM', 'Malam tiba... para mafia bersiap.'), 1000);
});

/* helper chat UI */
function appendChat(from, text){
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  div.innerHTML = `<b>${escapeHtml(from)}:</b> ${escapeHtml(text)}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}
function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

socket.on('disconnect', ()=>{ console.log('socket disconnected'); });