// ========================== LOGIN =========================== //

const login = document.getElementById("loginForm");
if (login) {
  login.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const popupError = document.getElementById("popupError");
    const popupSuccess = document.getElementById("popupSuccess");

    const res = await fetch("https://backend-production-c187.up.railway.app/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    
    // ================= SUCCESS ==================
    if (data.success) {
        popupSuccess.classList.add("show");

        setTimeout(() => {
            popupSuccess.classList.remove("show");
            window.location.href = "./mafia/mafiaUI/home.html";
        }, 2500);

        return;
    }

    // ================= ERROR ===================
    popupError.classList.add("show");

    setTimeout(() => {
        popupError.classList.remove("show");

        // reset input
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

    const username = document.getElementById("username").value;
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;

    const res = await fetch("https://backend-production-c187.up.railway.app/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, phone, password }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
      window.location.href = "index.html";
    }
  });
}

console.log(localStorage);