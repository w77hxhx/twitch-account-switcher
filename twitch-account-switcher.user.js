// ==UserScript==
// @name         Twitch Account Switcher
// @namespace    https://github.com/w77hxhx/twitch-account-switcher
// @version      1.1.0
// @description  Fast multi-account switching directly inside the Twitch user menu.
// @author       w77hxhx
// @match        https://*.twitch.tv/*
// @match        https://twitch.tv/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/w77hxhx/twitch-account-switcher/main/twitch-account-switcher.user.js
// @downloadURL  https://raw.githubusercontent.com/w77hxhx/twitch-account-switcher/main/twitch-account-switcher.user.js
// @homepageURL  https://greasyfork.org/en/scripts/594393-twitch-account-switcher
// @supportURL   https://github.com/w77hxhx/twitch-account-switcher/issues
// @icon         https://raw.githubusercontent.com/w77hxhx/twitch-account-switcher/main/icons/icon48.png
// ==/UserScript==

(function () {
  "use strict";

  const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

  // Internationalization dictionary
  const TAS_I18N = {
    en: { title: "Switch Accounts", active: "Active", loginOther: "Add account", saveCurrent: "Save", noAccounts: "No saved accounts", switching: "Switching...", loggingOut: "Logging out...", deleteConfirm: "Remove this account from switcher?" },
    ru: { title: "Сменить аккаунт", active: "Активен", loginOther: "Добавить аккаунт", saveCurrent: "Сохранить", noAccounts: "Нет сохранённых аккаунтов", switching: "Переключение...", loggingOut: "Выход...", deleteConfirm: "Удалить этот аккаунт из переключателя?" },
    de: { title: "Konto wechseln", active: "Aktiv", loginOther: "Konto hinzufügen", saveCurrent: "Speichern", noAccounts: "Keine gespeicherten Konten", switching: "Wechseln...", loggingOut: "Abmelden...", deleteConfirm: "Dieses Konto entfernen?" },
    fr: { title: "Changer de compte", active: "Actif", loginOther: "Ajouter un compte", saveCurrent: "Enregistrer", noAccounts: "Aucun compte enregistré", switching: "Changement...", loggingOut: "Déconnexion...", deleteConfirm: "Supprimer ce compte de la liste ?" },
    es: { title: "Cambiar cuenta", active: "Activo", loginOther: "Añadir cuenta", saveCurrent: "Guardar", noAccounts: "No hay cuentas guardadas", switching: "Cambiando...", loggingOut: "Cerrando sesión...", deleteConfirm: "¿Eliminar esta cuenta?" },
    pt: { title: "Alternar conta", active: "Ativo", loginOther: "Adicionar conta", saveCurrent: "Salvar", noAccounts: "Nenhuma conta salva", switching: "Alternando...", loggingOut: "Saindo...", deleteConfirm: "Remover esta conta?" },
    it: { title: "Cambia account", active: "Attivo", loginOther: "Aggiungi account", saveCurrent: "Salva", noAccounts: "Nessun account salvato", switching: "Cambio in corso...", loggingOut: "Disconnessione...", deleteConfirm: "Rimuovere questo account?" },
    pl: { title: "Przełącz konto", active: "Aktywny", loginOther: "Dodaj konto", saveCurrent: "Zapisz", noAccounts: "Brak zapisanych kont", switching: "Przełączanie...", loggingOut: "Wylogowywanie...", deleteConfirm: "Usunąć to konto?" },
    tr: { title: "Hesap değiştir", active: "Etkin", loginOther: "Hesap ekle", saveCurrent: "Kaydet", noAccounts: "Kayıtlı hesap yok", switching: "Değiştiriliyor...", loggingOut: "Çıkış yapılıyor...", deleteConfirm: "Bu hesap kaldırılsın mı?" },
    ja: { title: "アカウント切替", active: "アクティブ", loginOther: "アカウント追加", saveCurrent: "保存", noAccounts: "アカウントなし", switching: "切替中...", loggingOut: "ログアウト中...", deleteConfirm: "このアカウントを削除しますか？" },
    ko: { title: "계정 전환", active: "활성", loginOther: "계정 추가", saveCurrent: "저장", noAccounts: "저장된 계정 없음", switching: "전환 중...", loggingOut: "로그아웃 중...", deleteConfirm: "이 계정을 삭제하시겠습니까?" },
    zh: { title: "切换账号", active: "当前使用", loginOther: "添加账号", saveCurrent: "保存", noAccounts: "暂无账号", switching: "切换中...", loggingOut: "退出中...", deleteConfirm: "是否移除此账号？" },
    "zh-TW": { title: "切換帳號", active: "使用中", loginOther: "新增帳號", saveCurrent: "儲存", noAccounts: "尚無帳號", switching: "切換中...", loggingOut: "登出中...", deleteConfirm: "是否移除此帳號？" },
    uk: { title: "Змінити акаунт", active: "Активний", loginOther: "Додати акаунт", saveCurrent: "Зберегти", noAccounts: "Немає збережених акаунтів", switching: "Перемикання...", loggingOut: "Вихід...", deleteConfirm: "Видалити цей акаунт?" }
  };

  function getLocale() {
    const lang = (document.documentElement.lang || navigator.language || "en").toLowerCase();
    if (lang.startsWith("zh-tw") || lang.startsWith("zh-hk")) return "zh-TW";
    if (lang.startsWith("zh")) return "zh";
    for (const k of Object.keys(TAS_I18N)) {
      if (lang.startsWith(k)) return k;
    }
    return "en";
  }

  function msg(key) {
    const dict = TAS_I18N[getLocale()] || TAS_I18N.en;
    return dict[key] || TAS_I18N.en[key] || key;
  }

  // Cookie helpers
  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return m ? m[1] : null;
  }

  function setCookie(name, value) {
    const exp = new Date(Date.now() + 365 * 24 * 3600 * 1000).toUTCString();
    document.cookie = `${name}=${value}; domain=.twitch.tv; path=/; expires=${exp}; secure; SameSite=None`;
  }

  function removeCookie(name) {
    document.cookie = `${name}=; domain=.twitch.tv; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; SameSite=None`;
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; SameSite=None`;
  }

  function removeAllAuthCookies() {
    const names = ["auth-token", "login", "name", "twilight-user", "persistent", "api_token", "oauth_token", "server_session", "session_id", "passport_session"];
    for (const n of names) {
      removeCookie(n);
    }
  }

  // Fetch Twitch user details via GQL
  async function fetchTwitchUser(authToken) {
    if (!authToken) return null;
    try {
      const res = await fetch("https://gql.twitch.tv/gql", {
        method: "POST",
        headers: {
          "Client-Id": TWITCH_CLIENT_ID,
          "Authorization": "OAuth " + authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: `query { currentUser { id login displayName profileImageURL(width: 70) } }`
        })
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data?.currentUser || null;
    } catch (_) {
      return null;
    }
  }

  // Storage helpers
  function getAccounts() {
    return GM_getValue("accounts", []);
  }

  function setAccounts(accs) {
    GM_setValue("accounts", accs);
  }

  function getActiveAccountId() {
    return GM_getValue("activeAccountId", null);
  }

  function setActiveAccountId(id) {
    GM_setValue("activeAccountId", id);
  }

  // Auto-sync active user token
  async function autoSyncSession() {
    const token = getCookie("auth-token");
    if (!token) return;

    const user = await fetchTwitchUser(token);
    if (!user || !user.login) return;

    const accounts = getAccounts();
    const idx = accounts.findIndex(a => a.login.toLowerCase() === user.login.toLowerCase());

    if (idx >= 0) {
      if (accounts[idx].authToken !== token) {
        accounts[idx].authToken = token;
        accounts[idx].updatedAt = Date.now();
      }
      if (user.profileImageURL) accounts[idx].avatar = user.profileImageURL;
      setAccounts(accounts);
      setActiveAccountId(accounts[idx].id);
    } else {
      const newAcc = {
        id: user.id || user.login,
        login: user.login,
        displayName: user.displayName || user.login,
        avatar: user.profileImageURL || "",
        authToken: token,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      accounts.push(newAcc);
      setAccounts(accounts);
      setActiveAccountId(newAcc.id);
    }
  }

  // Switch account
  function switchAccount(account) {
    if (!account || !account.authToken) return;
    removeAllAuthCookies();

    setCookie("auth-token", account.authToken);
    if (account.login) setCookie("login", account.login);
    if (account.displayName) setCookie("name", encodeURIComponent(account.displayName));

    setActiveAccountId(account.id);

    try {
      localStorage.removeItem("persist:root");
      localStorage.removeItem("api_token");
      sessionStorage.clear();
    } catch (_) {}

    window.location.reload();
  }

  // Safe client-side logout to add another account
  function logoutForNewAccount() {
    removeAllAuthCookies();
    setActiveAccountId(null);

    try {
      localStorage.removeItem("persist:root");
      localStorage.removeItem("api_token");
      sessionStorage.clear();
    } catch (_) {}

    window.location.href = "https://www.twitch.tv/login";
  }

  // SVG Icons
  const USER_ICON_SVG = `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`;
  const CHEVRON_SVG = `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M7.293 4.707a1 1 0 011.414 0L13.414 9.414a1 1 0 010 1.414l-4.707 4.707a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z"/></svg>`;
  const PLUS_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  const SAVE_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
  const TRASH_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

  // Inject Styles
  GM_addStyle(`
    .tas-menu-item { cursor: pointer !important; user-select: none !important; text-decoration: none !important; max-width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; }
    #tas-switch-accounts-btn, .tas-account-row, #tas-save-current-btn, #tas-login-other-btn { padding-top: 2px !important; padding-bottom: 2px !important; min-height: 28px !important; max-width: 100% !important; box-sizing: border-box !important; }
    #tas-switch-accounts-btn .dmmLGq, .tas-account-row .dmmLGq, #tas-save-current-btn .dmmLGq, #tas-login-other-btn .dmmLGq { min-height: 28px !important; max-width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; }
    .tas-menu-item .dmulkQ { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; min-width: 0 !important; flex: 1 1 auto !important; font-size: 13px !important; }
    .tas-chevron-wrapper { margin-left: auto !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: transform 0.2s ease !important; color: #adadb8 !important; flex-shrink: 0 !important; width: 16px !important; height: 16px !important; }
    .tas-chevron-wrapper svg { width: 16px !important; height: 16px !important; }
    .tas-menu-item:hover .tas-chevron-wrapper { color: #efeff1 !important; }
    .tas-menu-item.tas-open .tas-chevron-wrapper { transform: rotate(90deg) !important; color: #efeff1 !important; }
    .tas-expand-container { display: none !important; }
    .tas-expand-container.tas-visible { display: flex !important; flex-direction: column !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; background-color: transparent !important; border: none !important; box-shadow: none !important; overflow: hidden !important; }
    .tas-accounts-list, .tas-actions-wrap { display: flex !important; flex-direction: column !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
    .tas-delete-btn { display: none !important; align-items: center !important; justify-content: center !important; width: 20px !important; height: 20px !important; border-radius: 4px !important; background: transparent !important; border: none !important; color: #adadb8 !important; cursor: pointer !important; margin-left: 6px !important; padding: 0 !important; flex-shrink: 0 !important; transition: color 0.12s, background-color 0.12s !important; }
    .tas-account-row:hover .tas-delete-btn { display: flex !important; }
    .tas-delete-btn:hover { color: #ff4f4d !important; background-color: rgba(255, 79, 77, 0.15) !important; }
    .tas-badge-active { font-size: 10px !important; font-weight: 500 !important; color: #00f59b !important; margin-left: auto !important; display: flex !important; align-items: center !important; gap: 3px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
    .tas-badge-active::before { content: "" !important; width: 5px !important; height: 5px !important; background-color: #00f59b !important; border-radius: 50% !important; display: inline-block !important; }
    .tas-switching-overlay { position: absolute !important; inset: 0 !important; background: rgba(14, 14, 16, 0.9) !important; backdrop-filter: blur(2px) !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; gap: 8px !important; color: #efeff1 !important; font-size: 12px !important; font-weight: 500 !important; z-index: 1000 !important; border-radius: 4px !important; }
    .tas-spinner { width: 18px !important; height: 18px !important; border: 2px solid rgba(255, 255, 255, 0.2) !important; border-top-color: #9146ff !important; border-radius: 50% !important; animation: tasSpin 0.7s linear infinite !important; }
    @keyframes tasSpin { to { transform: rotate(360deg); } }
  `);

  let isInjecting = false;

  function tryInjectMenu() {
    if (isInjecting) return;
    isInjecting = true;

    try {
      const dropdown = document.querySelector('[data-a-target="user-menu-dropdown"]');
      if (!dropdown || dropdown.querySelector("#tas-switch-accounts-btn")) return;

      const channelLink = dropdown.querySelector('a[data-a-target="channel-link"], a[href*="/channel"]');
      if (!channelLink) return;

      const channelItem = channelLink.closest('a, button, div[role="menuitem"]') || channelLink;
      if (!channelItem) return;

      let topItem = channelItem;
      while (topItem.parentElement && topItem.parentElement.children.length === 1 && topItem.parentElement !== dropdown) {
        topItem = topItem.parentElement;
      }

      const itemClone = topItem.cloneNode(true);
      const btn = itemClone.matches('a, button, div[role="menuitem"]') ? itemClone : (itemClone.querySelector('a, button, div[role="menuitem"]') || itemClone);

      btn.id = "tas-switch-accounts-btn";
      btn.removeAttribute("href");
      btn.classList.add("tas-menu-item");
      btn.setAttribute("role", "button");
      btn.setAttribute("tabindex", "0");

      const fig = itemClone.querySelector('.tw-drop-down-menu-item-figure');
      if (fig) {
        const svgWrap = fig.querySelector('.tw-svg') || fig;
        svgWrap.innerHTML = USER_ICON_SVG;
      }

      const textEl = itemClone.querySelector('.dmulkQ');
      if (textEl) {
        textEl.textContent = msg("title");
      }

      const dmm = itemClone.querySelector('.dmmLGq');
      if (dmm) {
        const chev = document.createElement("div");
        chev.className = "ScSvgWrapper-sc-wkgzod-0 cwspUC tw-svg tas-chevron-wrapper";
        chev.innerHTML = CHEVRON_SVG;
        dmm.appendChild(chev);
      }

      const expandContainer = document.createElement("div");
      expandContainer.id = "tas-expand-container";
      expandContainer.className = "tas-expand-container";

      if (topItem.parentElement) {
        topItem.parentElement.insertBefore(itemClone, topItem);
        topItem.parentElement.insertBefore(expandContainer, topItem);
      }

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const isOpen = btn.classList.contains("tas-open");
        if (isOpen) {
          btn.classList.remove("tas-open");
          expandContainer.classList.remove("tas-visible");
        } else {
          btn.classList.add("tas-open");
          expandContainer.classList.add("tas-visible");
          renderAccounts(expandContainer, channelItem, topItem);
        }
      });

    } finally {
      isInjecting = false;
    }
  }

  function renderAccounts(container, channelItem, topItem) {
    container.innerHTML = "";
    const accounts = getAccounts();
    const currentLogin = (getCookie("login") || "").toLowerCase();
    const activeId = getActiveAccountId();

    const listWrap = document.createElement("div");
    listWrap.className = "tas-accounts-list";

    if (accounts.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding: 6px 10px; color: #adadb8; font-size: 11px;";
      empty.textContent = msg("noAccounts");
      listWrap.appendChild(empty);
    } else {
      accounts.forEach(acc => {
        const isActive = activeId === acc.id || (currentLogin && acc.login.toLowerCase() === currentLogin);
        const rowClone = (topItem || channelItem).cloneNode(true);
        const row = rowClone.matches('a, button, div[role="menuitem"]') ? rowClone : (rowClone.querySelector('a, button, div[role="menuitem"]') || rowClone);

        row.removeAttribute("href");
        row.id = "";
        row.className = channelItem.className + " tas-menu-item tas-account-row" + (isActive ? " tas-active" : "");
        row.setAttribute("data-id", acc.id);
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");

        const fig = rowClone.querySelector('.tw-drop-down-menu-item-figure');
        if (fig) {
          fig.innerHTML = acc.avatar
            ? `<img src="${acc.avatar}" alt="${acc.displayName}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; display: block;">`
            : `<div style="width: 24px; height: 24px; border-radius: 50%; background: #772ce8; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;">${(acc.displayName || acc.login || "T")[0].toUpperCase()}</div>`;
        }

        const txt = rowClone.querySelector('.dmulkQ');
        if (txt) {
          txt.style.cssText = "flex: 1 1 auto; min-width: 0; display: flex; align-items: baseline; gap: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
          txt.innerHTML = `
            <span style="font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${acc.displayName || acc.login}</span>
            <span style="font-size: 11px; color: #adadb8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">@${acc.login}</span>
          `;
        }

        const dmm = rowClone.querySelector('.dmmLGq');
        if (dmm) {
          if (isActive) {
            const badge = document.createElement("span");
            badge.className = "tas-badge-active";
            badge.textContent = msg("active");
            dmm.appendChild(badge);
          }

          const delBtn = document.createElement("button");
          delBtn.className = "tas-delete-btn";
          delBtn.title = "Delete";
          delBtn.innerHTML = TRASH_SVG;
          if (!isActive) delBtn.style.marginLeft = "auto";

          delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (confirm(msg("deleteConfirm"))) {
              const updated = getAccounts().filter(a => a.id !== acc.id);
              setAccounts(updated);
              renderAccounts(container, channelItem, topItem);
            }
          });

          dmm.appendChild(delBtn);
        }

        row.addEventListener("click", (e) => {
          if (e.target.closest(".tas-delete-btn")) return;
          if (isActive) return;
          switchAccount(acc);
        });

        listWrap.appendChild(rowClone);
      });
    }

    container.appendChild(listWrap);

    // Actions wrap
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "tas-actions-wrap";

    // Add account button
    const loginOtherClone = (topItem || channelItem).cloneNode(true);
    const loginOtherBtn = loginOtherClone.matches('a, button, div[role="menuitem"]') ? loginOtherClone : (loginOtherClone.querySelector('a, button, div[role="menuitem"]') || loginOtherClone);

    loginOtherBtn.removeAttribute("href");
    loginOtherBtn.id = "tas-login-other-btn";
    loginOtherBtn.className = channelItem.className + " tas-menu-item";

    const fig2 = loginOtherClone.querySelector('.tw-drop-down-menu-item-figure');
    if (fig2) {
      const svgWrap = fig2.querySelector('.tw-svg') || fig2;
      svgWrap.innerHTML = PLUS_SVG;
    }

    const txt2 = loginOtherClone.querySelector('.dmulkQ');
    if (txt2) {
      txt2.textContent = msg("loginOther");
    }

    loginOtherBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      logoutForNewAccount();
    });

    actionsWrap.appendChild(loginOtherClone);
    container.appendChild(actionsWrap);
  }

  // Auto-sync active user token
  autoSyncSession();

  // Observer to inject into user dropdown
  const observer = new MutationObserver(() => {
    tryInjectMenu();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
