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
const singleBtn = document.getElementById("singleBtn");
const multiBtn = document.getElementById("multiBtn");
const playerSelect = document.getElementById("player-select");
const confirmPlayerBtn = document.getElementById("confirmPlayerBtn");
const cancelPLayerBtn = document.getElementById("cancelPLayerBtn")
const playerCount = document.getElementById("playerCount");
const clickSound = document.getElementById("clickSound")


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
    alert("Masukin username dulu bre 😅");
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



    // preload data lama biar bisa disunting
    const savedName = localStorage.getItem("username");
    const savedImage = localStorage.getItem("profileImage");
    if (savedName) introName.value = savedName;
    if (savedImage) {
      // preview di label PP intro
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
    bgMusic.play();
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
    modeSelect.classList.remove("hidden");
    modeSelect.classList.add("fade-in");
  }, 500);
});

// ==================== PILIH MODE ====================
let selectedMode = null;

function setActiveMode(btn) {
  singleBtn.classList.remove("active-mode");
  multiBtn.classList.remove("active-mode");
  btn.classList.add("active-mode");
}

singleBtn.addEventListener("click", () => {
  setActiveMode(singleBtn);
  selectedMode = "single";
  playerSelect.classList.remove("hidden");
});

multiBtn.addEventListener("click", () => {
  setActiveMode(multiBtn);
  selectedMode = "multi";
  playerSelect.classList.remove("hidden");
});


// ==================== KONFIRMASI PLAYER ====================
confirmPlayerBtn.addEventListener("click", () => {
  if (!selectedMode) {
    alert("Pilih dulu mode permainan!");
    return;
  }
  localStorage.setItem("mode", selectedMode);
  localStorage.setItem("playerCount", playerCount.value);

  document.body.classList.add("page-fade-out");

  setTimeout(() => {
    window.location.href = "lobby.html";
  }, 600);
});

// ==================== CANCEL PLAYER ====================
cancelPLayerBtn.addEventListener("click", () => {
  playerSelect.classList.add("fade-out");
  setTimeout(() => {
    playerSelect.classList.add("hidden");
    modeSelect.classList.add("hidden");

    playerSelect.classList.remove("fade-out");
    modeSelect.classList.remove("fade-in");
    modeSelect.classList.remove("fade-out");

    container.style.display = "block";
    container.classList.remove("fade-out");
    container.classList.add("fade-in");

    const modeButton = document.querySelectorAll(".mode-buttons button");
    modeButton.forEach(btn => btn.classList.remove("active-mode"));

    selectedMode = null;
    localStorage.removeItem("mode");
  }, 500);
});



//=====================SOUND SYSTEM==================//
const tombolList = document.querySelectorAll("button");

tombolList.forEach(btn => {
  btn.addEventListener("click", () => {
    clickSound.currentTime = 0;

    clickSound.play().catch(err => console.warn("gagal play sound:", err));
  });
});

//unlock audio klick button//
window.addEventListener("click", function unlockAudio() {
  clickSound.play().then(() => {
    clickSound.pause();
    clickSound.currentTime = 0;
    console.log("audio unlocked");
    this.window.removeEventListener("click", unlockAudio);
  }).catch(err => console.warn("audio belum bisa diputar:", err));
});