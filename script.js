// ========================== LOGIN =========================== //

const login = document.getElementById("loginForm");
if (login) {
  login.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch("https://backend-production-09796.up.railway.app/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {

        window.location.href = "./mafia/mafiaUI/home.html";
    } else {
      window.location.href = "./reg.html";
    }
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

    const res = await fetch("https://backend-production-09796.up.railway.app/register", {
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