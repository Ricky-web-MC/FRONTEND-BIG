// Mgame.js - Mafia Among Us Style Game (Updated: Animasi Siklus Waktu & Role Aksi Bergiliran)

const SOCKET_URL = "https://backend-production-09796.up.railway.app/login"; // Ganti ke URL server kamu
const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

/* Elements */
const gameTimer = document.getElementById('gameTimer');
const phaseLabel = document.getElementById('phaseLabel');
const skyArea = document.getElementById('skyArea');
const sunMoon = document.getElementById('sunMoon');
const skyOverlay = document.getElementById('skyOverlay');

const roleCard = document.getElementById('roleCard');
const roleBadge = document.getElementById('roleBadge');
const roleDesc = document.getElementById('roleDesc');
const btnRoleOk = document.getElementById('btnRoleOk');

const votingCard = document.getElementById('votingCard');
const voteList = document.getElementById('voteList');
const btnSubmitVote = document.getElementById('btnSubmitVote');
const btnSkipVote = document.getElementById('btnSkipVote');

const actionCard = document.getElementById('actionCard');
const targetList = document.getElementById('targetList');
const btnSubmitAction = document.getElementById('btnSubmitAction');
const actionTitle = document.getElementById('actionTitle');
const actionDesc = document.getElementById('actionDesc');

const btnOpenChat = document.getElementById('btnOpenChat');
const chatBox = document.getElementById('chatBox');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');

const resultCard = document.getElementById('resultCard');
const resultText = document.getElementById('resultText');
const resultDesc = document.getElementById('resultDesc');
const btnHome = document.getElementById('btnHome');
const btnReplay = document.getElementById('btnReplay');

const notifCard = document.getElementById('notifCard');

/* Audio Elements */
const clickSound = document.getElementById('clickSound');
const roleSound = document.getElementById('roleSound');
const timerSound = document.getElementById('timerSound');
const nightSound = document.getElementById('nightSound');
const daySound = document.getElementById('daySound');
const votingSound = document.getElementById('votingSound');
const eliminateSound = document.getElementById('eliminateSound');
const victorySound = document.getElementById('victorySound');
const defeatSound = document.getElementById('defeatSound');

/* State */
let players = [];
let meId = null;
let meRole = null;
let meUsername = localStorage.getItem('username') || 'Guest';
let room = localStorage.getItem('roomId') || 'default';

/* Animasi State */
let animationState = 'day'; // 'day', 'sunset', 'night', 'sunrise'
let animationTimer = null;
let actionTimer = null;

/* Audio Helper */
function playSound(audio) {
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

function playClick() {
  playSound(clickSound);
}

/* Show/Hide Helper */
function show(el) {
  el.classList.remove('hidden');
}
function hide(el) {
  el.classList.add('hidden');
}

/* Show Notification */
function showNotif(text, duration = 2500) {
  notifCard.textContent = text;
  show(notifCard);
  setTimeout(() => hide(notifCard), duration);
}

/* Append Chat Message */
function appendChat(from, msg) {
  const div = document.createElement('div');
  div.textContent = `${from}: ${msg}`;
  div.style.marginBottom = '4px';
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

/* Update Timer */
function updateTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  gameTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/* Update Player List in Vote/Target */
function renderPlayerList(container, onClick) {
  container.innerHTML = '';
  players.forEach(p => {
    if (p.id === meId) return; // Skip self
    const btn = document.createElement('button');
    btn.textContent = p.username;
    btn.onclick = () => onClick(btn);
    container.appendChild(btn);
  });
}

/* Role Description */
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

/* Animasi Siklus Waktu (Pagi ke Malam - 50s) */
function startDayToNightAnimation() {
  phaseLabel.textContent = 'Pagi ke Malam...';
  show(btnOpenChat);
  hide(chatBox);
  hide(votingCard);
  hide(actionCard);

  let timeLeft = 50;
  const startTime = Date.now();
  const totalDuration = 50 * 1000; // 50s

  animationState = 'sunset';
  skyOverlay.classList.remove('day', 'night');
  skyOverlay.classList.add('sunset');

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / totalDuration);
    const bottom = -40 + (400 * progress); // Move sun down
    sunMoon.style.bottom = `-${bottom}px`;

    updateTimer(timeLeft);
    timeLeft--;

    if (progress < 1) {
      animationTimer = setTimeout(animate, 1000);
    } else {
      // Selesai animasi
      skyOverlay.classList.remove('sunset');
      skyOverlay.classList.add('night');
      sunMoon.style.bottom = '-400px';
      updateTimer(0);
      hide(btnOpenChat);
      socket.emit('startNight', { room }); // Kirim ke server
    }
  }

  animate();
}

/* Animasi Siklus Waktu (Malam ke Pagi - 50s) */
function startNightToDayAnimation() {
  phaseLabel.textContent = 'Malam ke Pagi...';
  show(btnOpenChat);
  hide(chatBox);
  hide(votingCard);
  hide(actionCard);

  let timeLeft = 50;
  const startTime = Date.now();
  const totalDuration = 50 * 1000; // 50s

  animationState = 'sunrise';
  skyOverlay.classList.remove('night', 'day');
  skyOverlay.classList.add('sunset'); // reuse sunset class for transition

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / totalDuration);
    const bottom = 400 - (400 * progress); // Move sun up
    sunMoon.style.bottom = `-${bottom}px`;

    updateTimer(timeLeft);
    timeLeft--;

    if (progress < 1) {
      animationTimer = setTimeout(animate, 1000);
    } else {
      // Selesai animasi
      skyOverlay.classList.remove('sunset');
      skyOverlay.classList.add('day');
      sunMoon.style.bottom = '-40px';
      updateTimer(0);
      // Mulai diskusi 2 menit
      setTimeout(() => {
        phaseLabel.textContent = 'Diskusi';
        show(chatBox);
        setTimeout(() => {
          // Mulai voting
          phaseLabel.textContent = 'Voting';
          hide(chatBox);
          show(votingCard);
          renderPlayerList(voteList, btn => {
            Array.from(voteList.children).forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
          playSound(votingSound);
        }, 120000); // 2 menit diskusi
      }, 1000); // Delay 1s setelah animasi
    }
  }

  animate();
}

/* Role Aksi Bergiliran (Malam Hari) */
function startNightActions(roleOrder) {
  phaseLabel.textContent = 'Aksi Malam Dimulai...';
  let idx = 0;

  function nextRole() {
    if (idx >= roleOrder.length) {
      socket.emit('resolveActions', { room, results: [] }); // Kirim ke server
      return;
    }

    const role = roleOrder[idx++];
    const hasAction = ['mafia', 'detective', 'doctor', 'spy', 'arsonist'].includes(role);
    const isMyRole = meRole === role;

    if (isMyRole) {
      // Tampilkan UI aksi untuk role pemain
      actionTitle.textContent = role.toUpperCase();
      actionDesc.textContent = `Pilih target untuk aksi ${role}:`;
      renderPlayerList(targetList, btn => {
        Array.from(targetList.children).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      show(actionCard);
      playClick();

      btnSubmitAction.onclick = () => {
        const selected = targetList.querySelector('.selected');
        if (!selected) {
          showNotif('Pilih target terlebih dahulu!');
          return;
        }

        const target = selected.textContent;
        socket.emit('playerAction', { room, username: meUsername, role: meRole, target });
        playClick();
        hide(actionCard);
        setTimeout(nextRole, 1000);
      };
    } else {
      // Role lain (hanya notifikasi)
      phaseLabel.textContent = `Giliran ${role}...`;
      setTimeout(nextRole, 15000); // 15 detik
    }
  }

  nextRole();
}

/* Socket Events */
socket.on('connect', () => {
  meId = socket.id;
  socket.emit('joinGame', { username: meUsername, room });
});

socket.on('playerList', (list) => {
  players = list;
});

socket.on('setRole', (data) => {
  meRole = data.role;
  roleBadge.textContent = meRole.toUpperCase();
  roleDesc.textContent = roleDescription(meRole);
  show(roleCard);
  playSound(roleSound);
});

socket.on('gameStart', () => {
  phaseLabel.textContent = 'Role sedang dibagikan...';
  // Setelah role muncul, mulai animasi pagi ke malam
  btnRoleOk.onclick = () => {
    playClick();
    hide(roleCard);
    startDayToNightAnimation(); // Mulai animasi
  };
});

socket.on('nightStart', (data) => {
  phaseLabel.textContent = 'Malam Hari';
  skyOverlay.classList.remove('day', 'sunset');
  skyOverlay.classList.add('night');
  sunMoon.style.bottom = '-400px';
  playSound(nightSound);

  // Tentukan urutan role berdasarkan jumlah pemain
  // Kamu bisa tambahkan logika di server untuk kirim urutan role
  const roleOrder = ['mafia', 'detective', 'doctor', 'spy', 'arsonist']; // Contoh
  startNightActions(roleOrder);
});

socket.on('dayStart', (data) => {
  startNightToDayAnimation(); // Mulai animasi malam ke pagi
});

socket.on('actionTaken', (data) => {
  appendChat('SYSTEM', `${data.username} (${data.role}) melakukan aksi pada ${data.target}`);
});

socket.on('voteResult', (data) => {
  if (data.executed) {
    appendChat('SYSTEM', `${data.executed} telah dieksekusi.`);
    playSound(eliminateSound);
  } else {
    appendChat('SYSTEM', 'Voting dilewati.');
  }
});

socket.on('gameOver', (data) => {
  if (data.winner === 'mafia') {
    if (['mafia'].includes(meRole)) {
      resultText.textContent = 'VICTORY!';
      resultDesc.textContent = 'Mafia menang!';
      playSound(victorySound);
    } else {
      resultText.textContent = 'DEFEAT!';
      resultDesc.textContent = 'Mafia menang!';
      playSound(defeatSound);
    }
  } else {
    if (['mafia'].includes(meRole)) {
      resultText.textContent = 'DEFEAT!';
      resultDesc.textContent = 'Warga menang!';
      playSound(defeatSound);
    } else {
      resultText.textContent = 'VICTORY!';
      resultDesc.textContent = 'Warga menang!';
      playSound(victorySound);
    }
  }
  show(resultCard);
});

/* Button Events */
btnSubmitVote.onclick = () => {
  const selected = voteList.querySelector('.selected');
  const target = selected ? selected.textContent : null;
  if (!target) {
    showNotif('Pilih target terlebih dahulu!');
    return;
  }
  socket.emit('votePlayer', { room, voter: meUsername, target });
  playClick();
  hide(votingCard);
  showNotif(`Kamu memilih ${target}`);
};

btnSkipVote.onclick = () => {
  socket.emit('votePlayer', { room, voter: meUsername, target: null });
  playClick();
  hide(votingCard);
  showNotif('Kamu skip voting.');
};

btnOpenChat.onclick = () => {
  playClick();
  show(chatBox);
};

btnSend.onclick = () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit('chatMessage', { room, username: meUsername, msg });
  chatInput.value = '';
};

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSend.click();
});

btnHome.onclick = () => {
  window.location.href = 'home.html';
};

btnReplay.onclick = () => {
  window.location.href = 'lobby.html';
};

/* Chat Relay */
socket.on('chatMessage', ({ username, msg }) => {
  appendChat(username, msg);
});

/* Cleanup Timer on Disconnect */
socket.on('disconnect', () => {
  if (animationTimer) clearTimeout(animationTimer);
  if (actionTimer) clearTimeout(actionTimer);
});