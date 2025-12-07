// ====================================== GAME.JS =========================================
document.addEventListener("DOMContentLoaded", () => {

  const SOCKET_URL = "https://backend-production-c187.up.railway.app";
  const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

  // ===== GET ELEMENTS =====
  const playersArea = document.getElementById('playersArea'); // container player cards
  const gamePhaseEl = document.getElementById('gamePhase');
  const timerEl = document.getElementById('timer');
  const chatLog = document.getElementById('chatLog');
  const chatInput = document.getElementById('chatInput');
  const btnSend = document.getElementById('btnSend');

  const username = localStorage.getItem('username') || 'Guest';
  const room = localStorage.getItem('roomId');
  let myRole = null;
  let alive = true;

  // ===== SOCKET CONNECTION =====
  socket.on('connect', () => {
    console.log('Connected to server', socket.id);
    // Join game room
    socket.emit('joinGame', { username, room });
  });

  // ===== RECEIVE ROLE ASSIGNMENT =====
  socket.on('setRole', ({ role }) => {
    myRole = role;
    console.log('My role:', role);

    // Optional: highlight player card if UI sudah ada
    appendMessage('System', `You are ${role}`);
  });

  // ===== RECEIVE INITIAL GAME STATE =====
  socket.on('initialGameState', ({ players, gamePhase, timeLeft }) => {
    renderPlayers(players);
    updatePhase(gamePhase, timeLeft);
  });

  // ===== GAME PHASE UPDATE =====
  socket.on('gamePhaseChanged', ({ phase, timeLeft }) => {
    updatePhase(phase, timeLeft);
  });

  function updatePhase(phase, timeLeft) {
    gamePhaseEl.textContent = phase.toUpperCase();
    timerEl.textContent = timeLeft + 's';
  }

  // ===== PLAYER UPDATES =====
  socket.on('playerUpdated', ({ playerId, playerData }) => {
    updatePlayerCard(playerId, playerData);
  });

  socket.on('playerJoined', ({ playerId, playerData }) => {
    renderPlayers(Object.values(playerData)); // or append new card
    appendMessage('System', `${playerData.username} joined`);
  });

  socket.on('playerLeft', ({ playerId }) => {
    removePlayerCard(playerId);
  });

  // ===== NIGHT ACTIONS =====
  // Example: click to perform action
  playersArea.addEventListener('click', (e) => {
    const targetId = e.target.closest('.player-card')?.dataset?.id;
    if(!targetId || !alive) return;

    const targetName = e.target.closest('.player-card').dataset.username;
    if(!targetName) return;

    // Emit action to server (mafia kill, detective check, doctor heal)
    socket.emit('playerAction', { room, username, role: myRole, target: targetName });
    appendMessage('System', `You chose ${targetName} for ${myRole} action`);
  });

  // ===== NIGHT RESULT =====
  socket.on('nightResult', (results) => {
    results.forEach(r => {
      const card = document.querySelector(`.player-card[data-username="${r.username}"]`);
      if(card) card.classList.add('dead');
      if(r.username === username && r.status === 'dead') alive = false;
      appendMessage('System', `${r.username} ${r.status}`);
    });
  });

  // ===== DAY VOTING =====
  socket.on('voteUpdate', ({ voter, target }) => {
    appendMessage('Vote', `${voter} voted for ${target}`);
  });

  socket.on('voteResult', ({ executed, role }) => {
    if(executed){
      const card = document.querySelector(`.player-card[data-username="${executed}"]`);
      if(card) card.classList.add('dead');
      appendMessage('System', `${executed} was executed! Role: ${role}`);
      if(executed === username) alive = false;
    } else {
      appendMessage('System', 'No one was executed');
    }
  });

  socket.on('gameOver', ({ winner }) => {
    alert(`Game Over! Winner: ${winner}`);
    window.location.href = "../mafia_home/home.html";
  });

  // ===== CHAT =====
  socket.on('chatMessage', ({ username: from, msg }) => {
    appendMessage(from, msg);
  });

  btnSend.addEventListener('click', () => {
    const msg = chatInput.value.trim();
    if(!msg) return;
    socket.emit('chatMessage', { room, username, msg });
    chatInput.value = '';
  });

  chatInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') btnSend.click();
  });

  // ===== HELPERS =====
  function appendMessage(from, text){
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<b>${escapeHtml(from)}:</b> ${escapeHtml(text)}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function renderPlayers(players){
    playersArea.innerHTML = '';
    players.forEach(p => {
      const div = document.createElement('div');
      div.className = 'player-card';
      div.dataset.id = p.id;
      div.dataset.username = p.username;
      div.textContent = p.username;
      if(!p.alive) div.classList.add('dead');
      playersArea.appendChild(div);
    });
  }

  function updatePlayerCard(id, data){
    const card = document.querySelector(`.player-card[data-id="${id}"]`);
    if(card){
      card.textContent = data.username;
      if(!data.alive) card.classList.add('dead');
    }
  }

  function removePlayerCard(id){
    const card = document.querySelector(`.player-card[data-id="${id}"]`);
    if(card) card.remove();
  }

  function escapeHtml(s){
    return (s+'').replace(/[&<>"']/g, c => 
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
    );
  }

});
