// ========================== LOGIN =========================== //

const login = document.getElementById("loginForm");
if (login) {
  login.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const popupError = document.getElementById("popupError");
    const popupSuccess = document.getElementById("popupSuccess");

    let data;

    try {
      const res = await fetch("https://backend-production-c187.up.railway.app/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      // Kalau backend balas HTML/error → langsung masuk catch
      data = await res.json();
    } catch (err) {
      console.error("Response bukan JSON:", err);

      // Tampilkan popup error
      popupError.classList.add("show");
      setTimeout(() => popupError.classList.remove("show"), 2500);
      return;
    }

    // ============ SUCCESS ============
    if (data.success) {
      popupSuccess.classList.add("show");

      setTimeout(() => {
        popupSuccess.classList.remove("show");
        window.location.href = "./mafia/mafiaUI/home.html";
      }, 2500);

      return;
    }

    // =========== ERROR (username/pw salah) ============
    popupError.classList.add("show");

    setTimeout(() => {
      popupError.classList.remove("show");

      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
    }, 2500);

  });
}



// =========================== REGISTER ========================== //
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;

    const popupSuccessReg = document.getElementById("popupSuccessReg");
    const popupErrorReg = document.getElementById("popupErrorReg");

    // basic validation (optional)
    if (!username || !phone || !password) {
      popupErrorReg.querySelector("p").textContent = "Lengkapi semua field terlebih dahulu.";
      popupErrorReg.classList.add("show");
      setTimeout(() => popupErrorReg.classList.remove("show"), 2500);
      return;
    }

    let data;
    try {
      const res = await fetch("https://backend-production-c187.up.railway.app/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, phone, password }),
      });

      // kalau server balik HTML atau failure status, handle
      // (res.ok false tetap bisa berisi json, tapi safer: try parse)
      data = await res.json();
    } catch (err) {
      console.error("Register response bukan JSON / gagal:", err);
      popupErrorReg.querySelector("p").textContent = "Koneksi bermasalah. Coba lagi.";
      popupErrorReg.classList.add("show");
      setTimeout(() => popupErrorReg.classList.remove("show"), 2500);
      return;
    }

    if (data && data.success) {
      popupSuccessReg.classList.add("show");
      setTimeout(() => {
        popupSuccessReg.classList.remove("show");
        // masuk ke halaman login atau index
        window.location.href = "index.html";
      }, 2000);
      return;
    } else {
      // show message from server if ada
      popupErrorReg.querySelector("p").textContent = data?.message || "Pendaftaran gagal.";
      popupErrorReg.classList.add("show");
      setTimeout(() => popupErrorReg.classList.remove("show"), 3000);
      return;
    }
  });
}