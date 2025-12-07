// home.js
// ==================== UPDATE: support Public room creation + Enter Room ID flow
// ==================== UPDATE: fix button click sound (unlock & global binding) ====================

// ambil elemen utama
const introSection = document.getElementById("intro-section");
const introPic = document.getElementById("introPic");
const introName = document.getElementById("introName");
const introSubmit = document.getElementById("introSubmit");
const introCancel = document.getElementById("introCancel");

const container = document.querySelector(".container");
const profilePic = document.getElementById("profilePic");
const uploadPic = document.getElementById("uploadPic");
const usernameDisplay = document.getElementById("usernameDisplay");
const editProfileBtn = document.getElementById("editProfileBtn");

const startBtn = document.getElementById("startBtn");
const soundBtn = document.getElementById("soundBtn");
const bgMusic = document.getElementById("bgMusic");

const modeSelect = document.getElementById("mode-select");
const publicBtn = document.getElementById("publicBtn"); // UPDATE
const roomIdInput = document.getElementById("roomIdInput"); // UPDATE
const joinBtn = document.getElementById("joinBtn"); // UPDATE
const playerSelect = document.getElementById("player-select");
const confirmPlayerBtn = document.getElementById("confirmPlayerBtn"); // legacy (may be undefined)
const cancelPLayerBtn = document.getElementById("cancelPLayerBtn")
const playerCount = document.getElementById("playerCount");
const clickSound = document.getElementById("clickSound");

// ==================== LOAD PROFIL ====================
window.addEventListener("load", () => {
  const savedName = localStorage.getItem("username");
  const savedImage = localStorage.getItem("profileImage");
  if (savedImage) profilePic.src = savedImage;
  if (savedName) usernameDisplay.textContent = savedName;

  if (savedName) {
    introSection.style.display = "none";
    container.style.display = "block";
  }
});

// ==================== INTRO SUBMIT ====================
introSubmit.addEventListener("click", () => {
  const name = introName.value.trim();
  if (!name) {
    alert("Tolong masukin username nya 😅");
    return;
  }

  localStorage.setItem("username", name);
  usernameDisplay.textContent = name;

  const file = introPic.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      localStorage.setItem("profileImage", data);
      profilePic.src = data;
      hideIntro();
    };
    reader.readAsDataURL(file);
  } else {
    hideIntro();
  }
});

function hideIntro() {
  introSection.classList.remove("active");
  introSection.classList.add("fade-out");
  setTimeout(() => {
    introSection.style.display = "none";
    container.style.display = "block";
    container.classList.remove("fade-out");
  }, 500);
}

// ==================== INTRO CANCEL ====================
introCancel.addEventListener("click", () => {
  introSection.classList.add("fade-out");
  setTimeout(() => {
    introSection.style.display = "none";
    container.style.display = "block";
    container.classList.remove("fade-out");
  }, 500);
});

// ==================== EDIT PROFILE ====================
editProfileBtn.addEventListener("click", () => {
  container.classList.add("fade-out");
  setTimeout(() => {
    container.style.display = "none";
    introSection.style.display = "flex";
    introSection.classList.remove("fade-out");
    introSection.classList.add("active");

    // preload data lama
    const savedName = localStorage.getItem("username");
    const savedImage = localStorage.getItem("profileImage");
    if (savedName) introName.value = savedName;
    if (savedImage) {
      const imgPreview = document.querySelector("#intro-section img");
      if (imgPreview) imgPreview.src = savedImage;
    }
  }, 500);
});

// ==================== UPLOAD FOTO ====================
profilePic.addEventListener("click", () => uploadPic.click());
uploadPic.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target.result;
      profilePic.src = data;
      localStorage.setItem("profileImage", data);
    };
    reader.readAsDataURL(file);
  }
});

// ==================== MUSIK ====================
let isPlaying = false;
soundBtn.addEventListener("click", () => {
  if (!isPlaying) {
    bgMusic.play().catch(()=>{});
    soundBtn.textContent = "⏸";
  } else {
    bgMusic.pause();
    soundBtn.textContent = "▶";
  }
  isPlaying = !isPlaying;
});

// ==================== MULAI GAME ====================
startBtn.addEventListener("click", () => {
  container.classList.add("fade-out");
  setTimeout(() => {
    container.style.display = "none";

    modeSelect.classList.remove("hidden", "fade-out");
    modeSelect.style.display = "block";
    modeSelect.classList.add("fade-in");
  }, 500);
});

// ==================== CANCEL PLAYER ====================
if (cancelPLayerBtn) {
  cancelPLayerBtn.addEventListener("click", () => {

    modeSelect.classList.remove("fade-in");
    modeSelect.classList.add("fade-out");
    
    setTimeout(() => {
      
      modeSelect.classList.add("hidden");
      modeSelect.style.display = "none";

      container.style.display = "block";
      container.classList.remove("fade-out");
      container.classList.add("fade-in");

    }, 500);
  });
}

// ==================== UPDATE: Button sound (unlock & global binding) ====================
function playClickSound() {
  try {
    if (!clickSound) return;
    clickSound.currentTime = 0;
    clickSound.play().catch(()=>{});
  } catch (e) { /* ignore */ }
}

// Unlock audio on first user gesture to avoid browser blocking
window.addEventListener("click", function unlockAudio() {
  if (!clickSound) return;
  clickSound.play().then(() => {
    clickSound.pause();
    clickSound.currentTime = 0;
    window.removeEventListener("click", unlockAudio);
    // console.log('audio unlocked');
  }).catch(()=>{});
});

// attach click sound to all buttons (works even for buttons added later)
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.tagName === 'BUTTON') playClickSound();
});

// ==================== UPDATE: Public / Join Room Flow ====================

// helper to generate room id
function genRoomCode(maxPlayers) {
  // ex: R8-ABC12
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `R${maxPlayers}-${rnd}`;
}

// jika user memilih Public (create room)
publicBtn.addEventListener('click', () => {
  const username = localStorage.getItem('username') || 'Guest';
  const players = parseInt(playerCount.value || '8', 10);
  const roomCode = genRoomCode(players);

  // store room + playerCount locally so lobby picks it up
  localStorage.setItem('roomId', roomCode);
  localStorage.setItem('playerCount', players.toString());

  // navigate to lobby immediately
  // use small fade for UX
  document.body.classList.add('page-fade-out');
  setTimeout(() => {
    window.location.href = "../mafia_lobby/lobby.html";
  }, 450);
});

// when user clicks Join (enter id)
joinBtn.addEventListener('click', () => {
  const typed = (roomIdInput.value || '').trim();
  if (!typed) {
    alert('Masukkan ID room yang valid (contoh: R8-ABC12)');
    return;
  }
  // store room and (optional) playerCount if user selected
  localStorage.setItem('roomId', typed);
  localStorage.setItem('playerCount', playerCount.value || '8');
  document.body.classList.add('page-fade-out');
  setTimeout(() => {
    window.location.href = "../mafia_lobby/lobby.html";
  }, 450);
});

// convenience: enter on input triggers join
roomIdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinBtn.click(); });

// If user came from somewhere with a room prefilled (e.g. copy/paste), show it
const existingRoom = localStorage.getItem('roomId');
if (existingRoom) {
  roomIdInput.value = existingRoom;
}

// safety: fallback values
if (!playerCount.value) playerCount.value = '8';