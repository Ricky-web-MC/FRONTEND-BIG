const lobbyProfilePic = document.getElementById("lobbyProfilePic");
const lobbyUsername = document.getElementById("lobbyUsername");
const lobbyMode = document.getElementById("lobbyMode");
const lobbyCount = document.getElementById("lobbyCount");
const playerList = document.getElementById("playerList");
const backBtn = document.getElementById("backBtn");
const startGameBtn = document.getElementById("startGameBtn");
const clickSound = document.getElementById("clickSound");

// Ambil data dari localStorage
const username = localStorage.getItem("username") || "Guest";
const profileImage = localStorage.getItem("profileImage") || "../public/img/profile.jpg";
const mode = localStorage.getItem("mode");
const playerCount = parseInt(localStorage.getItem("playerCount")) || 5;

// Update tampilan
lobbyProfilePic.src = profileImage;
lobbyUsername.textContent = username;
lobbyMode.textContent = `Mode: ${mode === "single" ? "Single Player" : "Multiplayer"}`;
lobbyCount.textContent = `Jumlah Pemain: ${playerCount}`;

// Sound click
function playClick() {
  clickSound.currentTime = 0;
  clickSound.play();
}

// Generate list pemain (dummy dulu)
function generatePlayers(count) {
  playerList.innerHTML = "";

  const roles = assignRoles(count);

  for (let i = 1; i <= count; i++) {
    const div = document.createElement("div");
    div.classList.add("player-card");
    div.innerHTML = `<strong>Player ${i}</strong><br><span class="role hidden">????</span>`;
    playerList.appendChild(div);
  }

  localStorage.setItem("assignedRoles", JSON.stringify(roles));
}
generatePlayers(playerCount);


// Pembagian role otomatis
function assignRoles(count) {
  const roles = [];

  if (count === 5) {
    roles.push("Mafia");
    for (let i = 0; i < 4; i++) roles.push("Warga");
  } else if (count === 8) {
    roles.push("Mafia", "Mafia");
    while (roles.length < 8) roles.push("Warga");
  } else if (count === 12) {
    roles.push("Mafia", "Mafia", "Mafia", "Dokter", "Dokter");
    while (roles.length < 12) roles.push("Warga");
  } else if (count === 15) {
    roles.push("Mafia", "Mafia", "Mafia", "Detektif", "Detektif", "Dokter", "Dokter");
    while (roles.length < 15) roles.push("Warga");
  } else if (count === 18) {
    roles.push(
      "Mafia", "Mafia", "Mafia",
      "Detektif", "Detektif",
      "Dokter", "Dokter",
      "Couple", "Couple"
    );
    while (roles.length < 18) roles.push("Warga");
  } else if (count === 20) {
    roles.push(
      "Mafia", "Mafia", "Mafia",
      "Detektif", "Detektif",
      "Dokter", "Dokter",
      "Couple", "Couple",
      "Spy", "Spy",
      "Arsonist"
    );
    while (roles.length < 20) roles.push("Warga");
  }

  // Acak role agar random tiap main
  return roles.sort(() => Math.random() - 0.5);
}

// Tombol kembali (hanya single mode)
if (mode === "single") {
  backBtn.addEventListener("click", () => {
    playClick();
    document.body.classList.add("fade-out");
    setTimeout(() => {
      window.location.href = "home.html";
    }, 500);
  });
} else {
  backBtn.style.display = "none";
}

// Tombol mulai game
startGameBtn.addEventListener("click", () => {
  playClick();
  startGameBtn.textContent = "Loading...";
  startGameBtn.disabled = true;
  setTimeout(() => {
    window.location.href = "Sgame.html";
  }, 800);
});