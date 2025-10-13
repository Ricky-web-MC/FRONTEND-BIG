// Mgame.js
// Client-side game UI + deterministic role assignment
// Sync assumptions with your server.js & lobby.js:
// - server emits "playerList", "roomInfo", "chatMessage", "startCountdown" in lobby
// - client will emit "joinLobby" + "joinGame" when entering Mgame page
// - server emits "gameStart" when game should start (joinGame handler)
// Note: night action resolution is client-side (can be migrated to server later)

const SOCKET_URL = "https://backend-production-09796.up.railway.app";
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
function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showNotif(txt, ms=2500){
  if(!notifCard) return;
  notifCard.textContent = txt;
  notifCard.classList.remove('hidden');
  setTimeout(()=> notifCard.classList.add('hidden'), ms);
}

/* seeded RNG shuffle (mulberry32) */
function seedFromString(s){
  let h = 2166136261 >>> 0;
  for(let i=0;i<s.length;i++){
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}
function mulberry32(a){
  return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
}
function seededShuffle(arr, seedStr){
  const seed = seedFromString(seedStr);
  const rnd = mulberry32(seed);
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(rnd()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

/* role distribution rules (your requested mapping) */
function getRoleDistribution(n){
  if(n === 5) return { mafia:1, detective:0, doctor:0, couple:0, spy:0, arsonist:0, joker:0 };
  if(n === 8) return { mafia:2, detective:0, doctor:0, couple:0, spy:0, arsonist:0, joker:0 };
  if(n === 12) return { mafia:3, detective:2, doctor:0, couple:0, spy:0, arsonist:0, joker:0 };
  if(n === 15) return { mafia:3, detective:2, doctor:2, couple:0, spy:1, arsonist:0, joker:0 };
  if(n === 18) return { mafia:3, detective:2, doctor:2, couple:2, spy:2, arsonist:0, joker:0 };
  if(n === 20) return { mafia:3, detective:3, doctor:2, couple:2, spy:2, arsonist:1, joker:0 };
  const mafia = Math.max(1, Math.floor(n/5));
  const detective = Math.floor(n/10);
  const doctor = Math.floor(n/10);
  return { mafia, detective, doctor, couple:0, spy:0, arsonist:0, joker:0 };
}

function buildRolesForN(n, roomSeed){
  const dist = getRoleDistribution(n);
  const roles = [];
  for(let i=0;i<dist.mafia;i++) roles.push('mafia');
  for(let i=0;i<dist.detective;i++) roles.push('detective');
  for(let i=0;i<dist.doctor;i++) roles.push('doctor');
  for(let i=0;i<dist.couple;i++) roles.push('couple');
  for(let i=0;i<dist.spy;i++) roles.push('spy');
  for(let i=0;i<dist.arsonist;i++) roles.push('arsonist');
  for(let i=0;i<dist.joker;i++) roles.push('joker');
  while(roles.length < n) roles.push('villager');
  return seededShuffle(roles, roomSeed);
}

/* game state local */
let players = []; // {id, username}
let meId = null;
let meRole = null;
let rolesMap = {}; // id -> role

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
  // assign roles deterministic
  assignRolesAndReveal();
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
  window.location.href = 'home.html';
});

/* role assignment & reveal (client-side deterministic) */
function assignRolesAndReveal(){
  if(!players || players.length === 0){
    showNotif('Error: tidak ada pemain terdaftar');
    return;
  }
  // build deterministic list: sort players by id to sync across clients
  const ordered = players.slice().sort((a,b)=> a.id.localeCompare(b.id));
  const roles = buildRolesForN(ordered.length, room + '-seed');
  rolesMap = {};
  for(let i=0;i<ordered.length;i++){
    rolesMap[ordered[i].id] = roles[i];
  }
  meRole = rolesMap[meId] || 'villager';
  // show private role modal
  showRoleModal(meRole);
}

/* role modal */
function showRoleModal(role){
  roleBadge.textContent = role.toUpperCase();
  roleDesc.textContent = roleDescription(role);
  roleModal.classList.remove('hidden');
  phaseLabel.textContent = 'Role revealed';
  playClick();

  btnRoleOk.onclick = () => {
    playClick();
    roleModal.classList.add('hidden');
    // start day -> sunset chat window
    startSunsetChatPeriod(50); // 50 seconds chat while sun sets
  };
}

function roleDescription(role){
  const map = {
    mafia: 'Mafia: bunuh pemain di malam hari. Saat siang, diskusi & voting.',
    detective: 'Detektif: periksa satu pemain setiap malam. Salah tembak = mati.',
    doctor: 'Dokter: selamatkan satu pemain setiap malam.',
    arsonist: 'Arsonist: tandai pemain, bisa membakar. Netral menang sendiri.',
    spy: 'Spy: bisa reveal role pemain (3x). Berpihak ke warga.',
    couple: 'Couple: kamu dan pasangan saling terikat. Jika salah satu mati, pasangan juga mati.',
    joker: 'Joker: ingin dieliminasi saat voting — jika berhasil, joker menang sendiri.',
    villager: 'Warga: tidak punya aksi, voting saat siang.'
  };
  return map[role] || 'Warga biasa.';
}

/* sun set / chat period */
let sunsetTimerIv = null;
function startSunsetChatPeriod(seconds){
  phaseLabel.textContent = 'Siang (Sunset)';
  centerText.textContent = 'Bincang — matahari akan tenggelam';
  phaseTimer.textContent = seconds;

  // set sky overlay to sunset, animate sun from bottom -> higher -> set
  skyOverlay.classList.remove('day','night');
  skyOverlay.classList.add('sunset');

  // animate sun using JS timeline (so we can sync timers)
  const startBottom = -40;
  const peakBottom = 60; // a bit above horizon
  const endBottom = 400; // drop down

  const total = seconds * 1000;
  const start = Date.now();

  function tickSun(){
    const elapsed = Date.now() - start;
    const pct = Math.min(1, elapsed / total);
    // sun moves: 0 -> 0.45 -> 1 (rise a bit then set)
    let bottom;
    if(pct < 0.45){
      bottom = startBottom + (peakBottom - startBottom) * (pct / 0.45);
    } else {
      bottom = peakBottom + (endBottom - peakBottom) * ((pct - 0.45) / 0.55);
    }
    sun.style.bottom = ( -bottom ) + 'px'; // negative to move down visually
    phaseTimer.textContent = Math.max(0, Math.ceil((total - elapsed)/1000));
    if(pct < 1) requestAnimationFrame(tickSun);
    else {
      // sunset done -> switch to night
      skyOverlay.classList.remove('sunset');
      skyOverlay.classList.add('night');
      sun.style.bottom = '-360px';
      centerText.textContent = 'Malam tiba... aksi malam dimulai';
      phaseTimer.textContent = '--';
      // small delay then start night
      setTimeout(()=> startNightPhase(), 800);
    }
  }
  requestAnimationFrame(tickSun);

  // allow chat during this period (chat already active)
}

/* night phase orchestration */
let nightOrder = ['mafia','detective','doctor','spy','arsonist']; // order of action
function startNightPhase(){
  phaseLabel.textContent = 'Malam';
  // build list of active roles in this game (from rolesMap)
  const presentRoles = new Set(Object.values(rolesMap));
  // filter nightOrder to only roles present and allowed (joker/couple/villager have no night actions)
  const activeOrder = nightOrder.filter(r => presentRoles.has(r));
  if(activeOrder.length === 0){
    // no night actions -> directly transition to day (simple)
    appendChat('SYSTEM','Malam berlalu tanpa aksi.');
    // next: implement day resolution...
    return;
  }
  // run actions sequentially with per-role timeout (10s)
  let idx = 0;
  function nextRole(){
    if(idx >= activeOrder.length){
      appendChat('SYSTEM','Malam selesai. Siap untuk fase siang / pengumuman.');
      // after night end, you can implement elimination resolution
      return;
    }
    const role = activeOrder[idx++];
    showActionForRole(role, 10, nextRole);
  }
  nextRole();
}

/* show action card for role (only interactive if this client has that role) */
function showActionForRole(role, seconds, cb){
  actionArea.classList.remove('hidden');
  actionArea.innerHTML = ''; // clear
  phaseLabel.textContent = `Malam — ${role.toUpperCase()}`;
  centerText.textContent = `${capitalize(role)} sedang mengambil aksi...`;

  // card
  const card = document.createElement('div');
  card.style.padding = '12px';
  card.style.background = 'rgba(255,255,255,0.03)';
  card.style.borderRadius = '10px';

  const title = document.createElement('div');
  title.style.fontWeight='800';
  title.style.marginBottom='8px';
  title.innerText = `${capitalize(role)} — giliran aksi (${seconds}s)`;
  card.appendChild(title);

  const timerEl = document.createElement('div');
  timerEl.style.marginBottom='8px';
  timerEl.innerText = `Sisa waktu: ${seconds}s`;
  card.appendChild(timerEl);

  const targetWrap = document.createElement('div');
  targetWrap.style.display='flex';
  targetWrap.style.flexWrap='wrap';
  targetWrap.style.gap='8px';
  // create buttons for other players (cannot target self)
  players.forEach(p => {
    if(!p) return;
    if(p.id === meId && role !== 'arsonist') return; // don't allow targeting self (except some roles? keep simple)
    const b = document.createElement('button');
    b.className = 'btn ghost';
    b.textContent = p.username;
    b.onclick = ()=> {
      Array.from(targetWrap.children).forEach(c=>c.classList.remove('selected'));
      b.classList.add('selected');
    };
    targetWrap.appendChild(b);
  });
  card.appendChild(targetWrap);

  // action button only enabled if this client has that role
  const actionBtn = document.createElement('button');
  actionBtn.className = 'btn';
  actionBtn.style.marginTop = '10px';
  actionBtn.textContent = role === 'mafia' ? 'Bunuh' : role === 'doctor' ? 'Selamatkan' : role === 'detective' ? 'Periksa' : role === 'spy' ? 'Intai (kurangi 1)' : role === 'arsonist' ? 'Tandai' : 'Aksi';
  actionBtn.disabled = (rolesMap[meId] !== role); // only clickable for owners
  actionBtn.onclick = ()=> {
    playClick();
    const sel = targetWrap.querySelector('.selected');
    if(!sel){ alert('Pilih target dulu'); return; }
    const targetName = sel.textContent;
    // find player id by name
    const p = players.find(x=>x.username === targetName);
    if(!p) return;
    // emit nightAction (server may ignore if not implemented)
    socket.emit('nightAction', { room, by: username, byId: meId, role, targetId: p.id, targetName: p.username });
    // for now write to chat log for everyone
    socket.emit('chatMessage', { room, username, msg: `${role.toUpperCase()} memilih ${p.username}` });
    // disable action, proceed
    actionBtn.disabled = true;
    // small local store
    localStorage.setItem(`${room}_last_action_${role}_${meId}, JSON.stringify({target: p.id, at: Date.now()})`);
  };

  card.appendChild(actionBtn);
  actionArea.appendChild(card);

  // countdown for this role's window
  let t = seconds;
  const iv = setInterval(()=>{
    t--;
    timerEl.innerText = `Sisa waktu: ${t}s`;
    if(t <= 0){
      clearInterval(iv);
      actionArea.classList.add('hidden');
      phaseLabel.textContent = 'Malam';
      centerText.textContent = 'Melanjutkan...';
      // callback to next role
      setTimeout(()=> {
        if(typeof cb === 'function') cb();
      }, 400);
    }
  }, 1000);
}

/* simple utils */
function capitalize(s){ if(!s) return s; return s.charAt(0).toUpperCase()+s.slice(1); }

/* expose for debugging */
window._MGAME = {
  rolesMap, assignRolesAndReveal
};

socket.on('disconnect', ()=>{ console.log('socket disconnected'); });