// ===================== Mgame.js =====================
import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

// koneksi socket ke server backend
const socket = io("https://backend-production-09796.up.railway.app"); // ganti IP sesuai server lu

// ambil data dari localStorage / session
const username = localStorage.getItem("username");
const room = localStorage.getItem("room");

// tampil di console
console.log(`Mgame connected as ${username} di room ${room}`);

// kirim sinyal masuk game
socket.emit("joinGame", { username, room });

// ==========================================
// ============ LISTENER SOCKET =============
// ==========================================

// 1️⃣ sinyal awal game dimulai
socket.on("gameStart", (data) => {
  console.log("GAME START:", data.message);
  showPhase("Game dimulai!");
});

// 2️⃣ set role player (private)
socket.on("setRole", ({ role }) => {
  console.log("Peran kamu:", role);
  document.getElementById("roleDisplay").textContent = `Kamu adalah: ${role}`;
});

// 3️⃣ fase malam
socket.on("nightStart", () => {
  showPhase("🌙 Malam hari tiba");
  showNightActions();
});

// 4️⃣ hasil malam
socket.on("nightResult", (results) => {
  console.log("Hasil malam:", results);
  showResults(results);
});

// 5️⃣ fase siang
socket.on("dayStart", () => {
  showPhase("☀ Pagi tiba");
  showVotingPhase();
});

// 6️⃣ update voting
socket.on("voteUpdate", ({ voter, target }) => {
  addLog(`${voter} memilih ${target}`);
});

// 7️⃣ hasil voting
socket.on("voteResult", ({ executed }) => {
  addLog(`🪓 ${executed} telah dieksekusi.`);
});

// 8️⃣ status fase umum
socket.on("phaseStatus", ({ message }) => {
  addLog(message);
});

// 9️⃣ chat room
socket.on("chatMessage", ({ username, msg }) => {
  addChat(username, msg);
});


// ==========================================
// ============ EVENT KIRIM KE SERVER =======
// ==========================================

// kirim aksi malam (contoh: mafia bunuh, detektif selidiki)
function sendNightAction(target) {
  socket.emit("playerAction", { room, username, role: window.role, target });
  addLog(`Kamu melakukan aksi ke ${target}`);
}

// kirim hasil resolusi malam
function sendNightResult(results) {
  socket.emit("resolveActions", { room, results });
}

// kirim voting
function sendVote(target) {
  socket.emit("votePlayer", { room, voter: username, target });
}

// kirim hasil voting
function sendVoteResult(executed) {
  socket.emit("voteResult", { room, executed });
}

// kirim chat
function sendChat(msg) {
  socket.emit("chatMessage", { room, username, msg });
}


// ==========================================
// ============ UI HANDLER ==================
// ==========================================
function showPhase(text) {
  const phaseEl = document.getElementById("phase");
  if (phaseEl) phaseEl.textContent = text;
}

function showNightActions() {
  addLog("Pilih target untuk aksi malam...");
}

function showVotingPhase() {
  addLog("Waktunya voting! pilih siapa yang mencurigakan...");
}

function showResults(results) {
  results.forEach(r => {
    addLog(`${r.username} ${r.status === "mati" ? "💀 mati" : "selamat"}`);
  });
}

function addChat(user, msg) {
  const chatBox = document.getElementById("chatBox");
  const div = document.createElement("div");
  div.textContent = `${user}: ${msg}`;
  chatBox.appendChild(div);
}

function addLog(text) {
  const log = document.getElementById("log");
  const p = document.createElement("p");
  p.textContent = text;
  log.appendChild(p);
}

// contoh binding tombol di HTML
document.getElementById("btnVote")?.addEventListener("click", () => {
  const target = document.getElementById("voteTarget").value;
  sendVote(target);
});

document.getElementById("btnChat")?.addEventListener("click", () => {
  const msg = document.getElementById("chatInput").value;
  sendChat(msg);
});

// ===================== END =====================