// Twitch Account Switcher - Content Script v1.0.10 (Clone-Based Pixel-Perfect Sizing)

(function () {
  "use strict";

  function msg(key) {
    if (typeof window.tasT === "function") {
      return window.tasT(key);
    }
    return key;
  }

  // SVG Icons (24x24 matching Twitch Dropdown Icons)
  const USER_ICON_24_SVG = `
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
  `;

  const CHEVRON_RIGHT_SVG = `
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M7.293 4.707a1 1 0 011.414 0L13.414 9.414a1 1 0 010 1.414l-4.707 4.707a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z"/>
    </svg>
  `;

  const PLUS_ICON_24_SVG = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;

  const SAVE_ICON_24_SVG = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  `;

  const TRASH_ICON_SVG = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;

  let isInjecting = false;

  // Extract current user info from DOM
  function extractCurrentUserInfo() {
    let avatarUrl = "";
    let username = "";

    const avatarImg = document.querySelector('button[data-a-target="user-menu-toggle"] img, div[data-a-target="user-menu-dropdown"] img');
    if (avatarImg && avatarImg.src) {
      avatarUrl = avatarImg.src;
    }

    const dropdown = document.querySelector('[data-a-target="user-menu-dropdown"]');
    if (dropdown) {
      const headerTextEl = dropdown.querySelector('p, h6, span[data-a-target="user-display-name"]');
      if (headerTextEl) {
        username = headerTextEl.textContent.trim();
      }
    }

    return { avatarUrl, username };
  }

  // Find user menu dropdown container
  function findUserMenuDropdown() {
    const dropdown = document.querySelector('[data-a-target="user-menu-dropdown"]');
    if (dropdown) return dropdown;

    const balloons = document.querySelectorAll('.tw-balloon, [data-popper-placement], div[role="dialog"]');
    for (const b of balloons) {
      if (b.querySelector('a[data-a-target="channel-link"], a[href*="/channel"], a[href*="/settings"], [data-a-target="user-display-name"]')) {
        return b;
      }
    }
    return null;
  }

  // Find the Channel element inside the dropdown
  function findChannelElement(dropdown) {
    const targeted = dropdown.querySelector('a[data-a-target="channel-link"], a[data-a-target="user-menu-item-channel"], a[data-a-target*="channel"]');
    if (targeted) return targeted;

    const allInteractables = dropdown.querySelectorAll('a, button, div[role="menuitem"]');
    for (const el of allInteractables) {
      const text = el.textContent.trim().toLowerCase();
      if (text === "channel" || text === "канал" || text.startsWith("channel") || text.startsWith("канал")) {
        return el;
      }
    }

    const userHeader = dropdown.querySelector('[data-a-target="user-display-name"]')?.closest('div');
    if (userHeader) {
      let next = userHeader.nextElementSibling;
      while (next) {
        const link = next.querySelector('a') || (next.tagName === 'A' ? next : null);
        if (link) return link;
        next = next.nextElementSibling;
      }
    }

    return null;
  }

  // Get the topmost item element representing Channel (e.g. <a> or wrapper div)
  function getChannelItemNode(channelEl, dropdown) {
    let item = channelEl.closest('a, button, div[role="menuitem"]') || channelEl;
    return item;
  }

  // Inject the button & expandable container using Channel cloning
  function tryInjectMenuButton() {
    if (isInjecting) return;
    isInjecting = true;

    try {
      const dropdown = findUserMenuDropdown();
      if (!dropdown) return;

      if (dropdown.querySelector("#tas-switch-accounts-btn")) {
        return;
      }

      const channelEl = findChannelElement(dropdown);
      if (!channelEl) return;

      const channelItem = getChannelItemNode(channelEl, dropdown);
      if (!channelItem) return;

      // Find the topmost container node for Channel within the menu list
      let topItem = channelItem;
      while (
        topItem.parentElement &&
        topItem.parentElement.children.length === 1 &&
        topItem.parentElement !== dropdown
      ) {
        topItem = topItem.parentElement;
      }

      // Clone topItem so any wrapper divs and classes are 100% preserved
      const itemClone = topItem.cloneNode(true);

      // Find the interactive button/link inside the clone (or the clone itself)
      const btn = itemClone.matches('a, button, div[role="menuitem"]')
        ? itemClone
        : itemClone.querySelector('a, button, div[role="menuitem"]') || itemClone;

      btn.id = "tas-switch-accounts-btn";
      btn.removeAttribute("href");
      btn.classList.add("tas-menu-item");
      btn.setAttribute("role", "button");
      btn.setAttribute("tabindex", "0");

      // Replace figure with User SVG
      const figure = itemClone.querySelector('.tw-drop-down-menu-item-figure');
      if (figure) {
        const svgWrap = figure.querySelector('.tw-svg') || figure;
        svgWrap.innerHTML = USER_ICON_24_SVG;
      }

      // Replace text with single-line title (no inline style)
      const textEl = itemClone.querySelector('.dmulkQ');
      if (textEl) {
        textEl.textContent = msg("title");
      }

      // Append chevron on the right inside dmmLGq
      const dmm = itemClone.querySelector('.dmmLGq');
      if (dmm) {
        const chev = document.createElement("div");
        chev.className = "ScSvgWrapper-sc-wkgzod-0 cwspUC tw-svg tas-chevron-wrapper";
        chev.innerHTML = CHEVRON_RIGHT_SVG;
        dmm.appendChild(chev);
      }

      // Create expandable accounts container
      const expandContainer = document.createElement("div");
      expandContainer.id = "tas-expand-container";
      expandContainer.className = "tas-expand-container";

      // Insert itemClone and expandContainer before topItem
      if (topItem.parentElement) {
        topItem.parentElement.insertBefore(itemClone, topItem);
        topItem.parentElement.insertBefore(expandContainer, topItem);
      } else {
        dropdown.insertBefore(itemClone, dropdown.firstChild);
        dropdown.insertBefore(expandContainer, dropdown.children[1]);
      }

      // Toggle expansion on click
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
          loadAndRenderAccounts(expandContainer, btn, channelItem, topItem);
        }
      });

    } finally {
      isInjecting = false;
    }
  }

  // Load and render accounts list inside the expandable container by cloning Channel item
  async function loadAndRenderAccounts(container, btn, channelItem, topItem) {
    container.innerHTML = `
      <div style="padding: 10px; display: flex; justify-content: center; align-items: center;">
        <div class="tas-spinner"></div>
      </div>
    `;

    let res;
    try {
      res = await chrome.runtime.sendMessage({ type: "GET_DATA" });
    } catch (err) {
      console.error("[Twitch Switcher] Error requesting data:", err);
      container.innerHTML = `<div style="padding: 6px 10px; color: #ff4f4d; font-size: 11px;">${err.message || "Connection error."}</div>`;
      return;
    }

    const { accounts = [], activeAccountId = null, currentSession = {} } = res || {};
    const currentUser = currentSession.user;
    const isCurrentSaved = currentUser && accounts.some((a) => a.login.toLowerCase() === currentUser.login.toLowerCase());

    container.innerHTML = "";

    const listWrap = document.createElement("div");
    listWrap.className = "tas-accounts-list";

    if (accounts.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding: 6px 10px; color: #adadb8; font-size: 11px;";
      empty.textContent = msg("noAccounts");
      listWrap.appendChild(empty);
    } else {
      accounts.forEach((acc) => {
        const isActive = activeAccountId === acc.id || (currentUser && currentUser.login.toLowerCase() === acc.login.toLowerCase());
        const avatarSrc = acc.avatar || (isActive && currentUser?.profileImageURL) || "";
        const initial = (acc.displayName || acc.login || "T")[0].toUpperCase();

        // Clone Channel topItem for each account row
        const rowClone = (topItem || channelItem).cloneNode(true);
        const row = rowClone.matches('a, button, div[role="menuitem"]')
          ? rowClone
          : rowClone.querySelector('a, button, div[role="menuitem"]') || rowClone;

        row.removeAttribute("href");
        row.id = "";
        row.className = channelItem.className + " tas-menu-item tas-account-row" + (isActive ? " tas-active" : "");
        row.setAttribute("data-id", acc.id);
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        if (isActive) row.title = msg("active");

        // Set figure to avatar
        const fig = rowClone.querySelector('.tw-drop-down-menu-item-figure');
        if (fig) {
          fig.innerHTML = avatarSrc
            ? `<img src="${avatarSrc}" alt="${acc.displayName}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; display: block;">`
            : `<div style="width: 24px; height: 24px; border-radius: 50%; background: #772ce8; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;">${initial}</div>`;
        }

        // Set text
        const txt = rowClone.querySelector('.dmulkQ');
        if (txt) {
          txt.style.cssText = "flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
          txt.innerHTML = `
            <span style="font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis;">${acc.displayName || acc.login}</span>
            <span style="font-size: 11px; color: #adadb8; overflow: hidden; text-overflow: ellipsis;">@${acc.login}</span>
          `;
        }

        // Append active badge and delete button
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
          delBtn.setAttribute("data-delete-id", acc.id);
          delBtn.title = "Delete";
          delBtn.innerHTML = TRASH_ICON_SVG;
          if (!isActive) delBtn.style.marginLeft = "auto";
          dmm.appendChild(delBtn);
        }

        listWrap.appendChild(rowClone);
      });
    }

    container.appendChild(listWrap);

    // Actions wrap
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "tas-actions-wrap";

    // Save current button
    if (!isCurrentSaved && currentSession.isLoggedIn) {
      const saveClone = (topItem || channelItem).cloneNode(true);
      const saveBtn = saveClone.matches('a, button, div[role="menuitem"]')
        ? saveClone
        : saveClone.querySelector('a, button, div[role="menuitem"]') || saveClone;

      saveBtn.removeAttribute("href");
      saveBtn.id = "tas-save-current-btn";
      saveBtn.className = channelItem.className + " tas-menu-item";
      saveBtn.style.color = "#bf94ff";

      const fig = saveClone.querySelector('.tw-drop-down-menu-item-figure');
      if (fig) {
        const svgWrap = fig.querySelector('.tw-svg') || fig;
        svgWrap.innerHTML = SAVE_ICON_24_SVG;
      }

      const txt = saveClone.querySelector('.dmulkQ');
      if (txt) {
        txt.style.cssText = "font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
        txt.textContent = `${msg("saveCurrent")} @${currentUser?.login || "user"}`;
      }

      actionsWrap.appendChild(saveClone);
    }

    // Login other button
    const loginOtherClone = (topItem || channelItem).cloneNode(true);
    const loginOtherBtn = loginOtherClone.matches('a, button, div[role="menuitem"]')
      ? loginOtherClone
      : loginOtherClone.querySelector('a, button, div[role="menuitem"]') || loginOtherClone;

    loginOtherBtn.removeAttribute("href");
    loginOtherBtn.id = "tas-login-other-btn";
    loginOtherBtn.className = channelItem.className + " tas-menu-item";

    const fig2 = loginOtherClone.querySelector('.tw-drop-down-menu-item-figure');
    if (fig2) {
      const svgWrap = fig2.querySelector('.tw-svg') || fig2;
      svgWrap.innerHTML = PLUS_ICON_24_SVG;
    }

    const txt2 = loginOtherClone.querySelector('.dmulkQ');
    if (txt2) {
      txt2.textContent = msg("loginOther");
    }

    actionsWrap.appendChild(loginOtherClone);
    container.appendChild(actionsWrap);

    // Switch Account Event
    container.querySelectorAll(".tas-account-row").forEach((row) => {
      row.addEventListener("click", async (e) => {
        if (e.target.closest(".tas-delete-btn")) return;
        const id = row.getAttribute("data-id");
        if (row.classList.contains("tas-active")) return;

        showSwitchingOverlay(container, msg("switching"));

        try {
          localStorage.removeItem("persist:root");
          localStorage.removeItem("api_token");
          sessionStorage.clear();
        } catch (_) {}

        try {
          await chrome.runtime.sendMessage({ type: "SWITCH_ACCOUNT", accountId: id });
        } catch (err) {
          alert("Error switching account: " + err.message);
          loadAndRenderAccounts(container, btn, channelItem);
        }
      });
    });

    // Delete Account Event
    container.querySelectorAll(".tas-delete-btn").forEach((btnEl) => {
      btnEl.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btnEl.getAttribute("data-delete-id");
        if (confirm(msg("deleteConfirm"))) {
          await chrome.runtime.sendMessage({ type: "REMOVE_ACCOUNT", accountId: id });
          loadAndRenderAccounts(container, btn, channelItem);
        }
      });
    });

    // Save Current Event
    container.querySelector("#tas-save-current-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const domInfo = extractCurrentUserInfo();
      const res = await chrome.runtime.sendMessage({
        type: "SAVE_CURRENT_ACCOUNT",
        avatar: domInfo.avatarUrl
      });
      if (res.success) {
        loadAndRenderAccounts(container, btn, channelItem);
      } else {
        alert(msg("saveError") + (res.error || ""));
      }
    });

    // Login Other Event (Safely log out client-side without revoking server token)
    container.querySelector("#tas-login-other-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();

      showSwitchingOverlay(container, msg("loggingOut"));

      // 1. Ensure current account is saved with its valid token
      try {
        const domInfo = extractCurrentUserInfo();
        await chrome.runtime.sendMessage({
          type: "SAVE_CURRENT_ACCOUNT",
          avatar: domInfo.avatarUrl
        });
      } catch (_) {}

      // 2. Clear client storage so Twilight does not rehydrate old user
      try {
        localStorage.removeItem("persist:root");
        localStorage.removeItem("api_token");
        sessionStorage.clear();
      } catch (_) {}

      // 3. Remove auth cookies client-side (NEVER send revoking logout to Twitch server!)
      await chrome.runtime.sendMessage({ type: "LOGOUT_FOR_NEW_ACCOUNT_COOKIES" });

      // 4. Navigate directly to Twitch login
      window.location.href = "https://www.twitch.tv/login";
    });
  }

  // Show switching loader overlay
  function showSwitchingOverlay(container, text) {
    const overlay = document.createElement("div");
    overlay.className = "tas-switching-overlay";
    overlay.innerHTML = `
      <div class="tas-spinner"></div>
      <div>${text}</div>
    `;
    container.style.position = "relative";
    container.appendChild(overlay);
  }

  // Fast Burst Trigger
  function fastBurstCheck() {
    tryInjectMenuButton();
    [10, 25, 50, 100, 180, 300, 500].forEach((delay) => {
      setTimeout(tryInjectMenuButton, delay);
    });
  }

  document.addEventListener("pointerdown", (e) => {
    if (e.target.closest('button[data-a-target="user-menu-toggle"], [data-a-target="user-menu-toggle"], .tw-avatar, [data-a-target="user-menu-dropdown"]')) {
      fastBurstCheck();
    }
  }, true);

  document.addEventListener("click", () => {
    fastBurstCheck();
  }, true);

  // Observer for reactive DOM updates
  const observer = new MutationObserver(() => {
    tryInjectMenuButton();
  });

  function startObserver() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      tryInjectMenuButton();
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        observer.observe(document.body, { childList: true, subtree: true });
        tryInjectMenuButton();
      });
    }
  }

  startObserver();
  setInterval(tryInjectMenuButton, 1000);
})();
