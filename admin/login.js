document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");
  msg.textContent = "";

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.message || "Login failed";
      return;
    }

    // Save the token + username so admin.js can use them on every request
    localStorage.setItem("gisc_admin_token", data.token);
    localStorage.setItem("gisc_admin_username", data.username);

    window.location.href = "dashboard.html";
  } catch (err) {
    msg.textContent = "Could not reach the server. Is it running?";
  }
});
