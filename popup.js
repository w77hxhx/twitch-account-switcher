// Twitch Account Switcher - Popup Script v1.0.8 (Multi-language i18n)

function msg(key) {
  if (typeof window.tasT === "function") {
    return window.tasT(key);
  }
  return key;
}

const TRASH_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
`;

let currentData = null;

async function loadData() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_DATA" });
    if (!res || !res.success) {
      document.getElementById("global-status").textContent = "Error";
      return;
    }

    currentData = res;
    renderUI();
  } catch (err) {
    console.error("Popup load error:", err);
    document.getElementById("global-status").textContent = "Offline";
  }
}

function renderUI() {
  const { accounts = [], activeAccountId, currentSession = {} } = currentData;
  const user = currentSession.user;

  // Localize static labels
  document.getElementById("lbl-current-session").textContent = msg("currentSession");
  document.getElementById("lbl-btn-login-other").textContent = msg("loginOther");
  document.getElementById("lbl-btn-open-twitch").textContent = msg("openTwitch");

  // Status indicator
  const statusEl = document.getElementById("global-status");
  if (currentSession.isLoggedIn) {
    statusEl.textContent = msg("statusOnline");
    statusEl.className = "status-indicator online";
  } else {
    statusEl.textContent = msg("statusOffline");
    statusEl.className = "status-indicator";
  }

  // Current session card
  const avatarWrapper = document.getElementById("current-avatar-container");
  const nameEl = document.getElementById("current-user-name");
  const loginEl = document.getElementById("current-user-login");
  const saveBtn = document.getElementById("popup-save-current");

  if (currentSession.isLoggedIn && user) {
    nameEl.textContent = user.displayName || user.login;
    loginEl.textContent = "@" + user.login;
    if (user.profileImageURL) {
      avatarWrapper.innerHTML = `<img src="${user.profileImageURL}" alt="${user.login}">`;
    } else {
      avatarWrapper.innerHTML = `<div class="avatar-placeholder">${(user.displayName || user.login)[0].toUpperCase()}</div>`;
    }

    const isAlreadySaved = accounts.some(a => a.login.toLowerCase() === user.login.toLowerCase());
    if (isAlreadySaved) {
      saveBtn.textContent = "✓ " + msg("active");
      saveBtn.className = "save-current-btn saved";
      saveBtn.disabled = true;
    } else {
      saveBtn.textContent = "+ " + msg("saveCurrent");
      saveBtn.className = "save-current-btn";
      saveBtn.disabled = false;
    }
  } else {
    nameEl.textContent = msg("statusOffline");
    loginEl.textContent = "twitch.tv";
    avatarWrapper.innerHTML = `<div class="avatar-placeholder">?</div>`;
    saveBtn.style.display = "none";
  }

  // Accounts list
  const container = document.getElementById("accounts-container");
  if (accounts.length === 0) {
    container.innerHTML = `<div class="empty-state">${msg("noAccounts")}</div>`;
  } else {
    container.innerHTML = accounts.map(acc => {
      const isActive = activeAccountId === acc.id || (user && user.login.toLowerCase() === acc.login.toLowerCase());
      const avatarSrc = acc.avatar || (isActive && user?.profileImageURL) || "";
      const initial = (acc.displayName || acc.login || "T")[0].toUpperCase();

      return `
        <div class="account-item ${isActive ? "active" : ""}" data-id="${acc.id}" title="${isActive ? msg("active") : ""}">
          <div class="account-left">
            ${
              avatarSrc
                ? `<img class="account-avatar" src="${avatarSrc}" alt="${acc.displayName}">`
                : `<div class="account-avatar">${initial}</div>`
            }
            <div class="account-meta">
              <div class="account-name">${acc.displayName || acc.login}</div>
              <div class="account-login">@${acc.login}</div>
            </div>
          </div>
          <div class="account-right">
            ${isActive ? `<span class="active-pill">${msg("active")}</span>` : ""}
            <button class="del-account-btn" data-delete-id="${acc.id}" title="Delete">
              ${TRASH_SVG}
            </button>
          </div>
        </div>
      `;
    }).join("");

    // Attach row events
    container.querySelectorAll(".account-item").forEach(item => {
      item.addEventListener("click", async (e) => {
        if (e.target.closest(".del-account-btn")) return;
        const id = item.getAttribute("data-id");
        if (item.classList.contains("active")) return;

        item.style.opacity = "0.5";
        await chrome.runtime.sendMessage({ type: "SWITCH_ACCOUNT", accountId: id });
        window.close();
      });
    });

    // Delete buttons
    container.querySelectorAll(".del-account-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-delete-id");
        if (confirm(msg("deleteConfirm"))) {
          await chrome.runtime.sendMessage({ type: "REMOVE_ACCOUNT", accountId: id });
          loadData();
        }
      });
    });
  }
}

// Event Listeners
document.getElementById("popup-save-current")?.addEventListener("click", async () => {
  const saveBtn = document.getElementById("popup-save-current");
  saveBtn.disabled = true;
  saveBtn.textContent = "...";
  const res = await chrome.runtime.sendMessage({ type: "SAVE_CURRENT_ACCOUNT" });
  if (res.success) {
    loadData();
  } else {
    alert(res.error || "Error saving account");
    saveBtn.disabled = false;
    saveBtn.textContent = "+ Save";
  }
});

document.getElementById("btn-login-other")?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "LOGOUT_FOR_NEW_ACCOUNT" });
  window.close();
});

document.getElementById("btn-open-twitch")?.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://www.twitch.tv" });
  window.close();
});

// Init
loadData();
