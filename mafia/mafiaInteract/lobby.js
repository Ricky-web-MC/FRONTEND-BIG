const lobby = document.getElementById("lobby");
const roleScreen = document.getElementById("role-screen");
const gameScreen = document.getElementById("game-screen");

const startBtn = document.getElementById("start-btn");
const readyBtn = document.getElementById("ready-btn");
const roleText = document.getElementById("role-text");

const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

// Simulasi daftar pemain
let players = ["Kamu", "Player2", "Player3"];

// Tampilkan daftar pemain di lobby
const playerList = document.getElementById("player-list");
players.forEach(p => {
  let li = document.createElement("li");
  li.textContent = p;
  playerList.appendChild(li);
});

// Klik mulai game → tampilkan role
startBtn.addEventListener("click", () => {
  lobby.classList.add("hidden");
  roleScreen.classList.remove("hidden");

  // Role random sementara
  const roles = ["Mafia", "Polisi", "Dokter", "Warga"];
  const randomRole = roles[Math.floor(Math.random() * roles.length)];
  roleText.textContent = `Kamu adalah ${randomRole}`;
});

// Klik siap → masuk ke game screen
readyBtn.addEventListener("click", () => {
  roleScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
});

// Chat dummy (belum konek backend)
sendBtn.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (msg) {
    let p = document.createElement("p");
    p.textContent = "Kamu: " + msg;
    chatBox.appendChild(p);
    chatInput.value = "";
  }
});