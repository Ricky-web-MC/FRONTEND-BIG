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
    }, 3000);

  });
}

// =========================== REGISTER ========================== //

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;

    let data;

    try {
      const res = await fetch("https://backend-production-c187.up.railway.app/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, phone, password }),
      });

      data = await res.json();
    } catch (err) {
      alert("Server error / tidak merespon");
      return;
    }

    alert(data.message);

    if (data.success) {
      window.location.href = "index.html";
    }
  });
}