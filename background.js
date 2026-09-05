// Twitch Account Switcher - Background Service Worker v1.0.8

const TWITCH_URL = "https://www.twitch.tv";
const TWITCH_DOMAIN_CLEAN = "twitch.tv"; // Chromium requires domain without leading dot!
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko"; // Standard Twitch web client ID

// Helper to fetch user details from Twitch GraphQL using auth-token
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
        query: `query CurrentUserQuery {
          currentUser {
            id
            login
            displayName
            profileImageURL(width: 70)
          }
        }`
      })
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.currentUser || null;
  } catch (err) {
    console.warn("[Twitch Switcher] Failed to query GQL user:", err);
    return null;
  }
}

// Helper to get all relevant twitch cookies
async function getTwitchCookies() {
  try {
    return await chrome.cookies.getAll({ domain: "twitch.tv" });
  } catch (e) {
    console.error("[Twitch Switcher] Error getting cookies:", e);
    return [];
  }
}

// Thoroughly remove all cookies named `name` across all subdomains
async function removeAllCookiesNamed(name) {
  const cookies = await chrome.cookies.getAll({ name });
  for (const c of cookies) {
    if (c.domain.includes("twitch.tv")) {
      const cleanDomain = c.domain.replace(/^\./, "");
      const url = (c.secure ? "https://" : "http://") + cleanDomain + (c.path || "/");
      try {
        await chrome.cookies.remove({
          url,
          name: c.name,
          storeId: c.storeId
        });
      } catch (_) {}
    }
  }
}

// Thoroughly remove all Twitch authentication and session cookies across all subdomains
async function removeAllTwitchAuthCookies() {
  const authCookieNames = [
    "auth-token",
    "login",
    "name",
    "twilight-user",
    "persistent",
    "api_token",
    "oauth_token",
    "server_session",
    "session_id",
    "passport_session"
  ];

  for (const name of authCookieNames) {
    await removeAllCookiesNamed(name);
  }
}

// Set a specific auth cookie on twitch.tv cleanly without leading dot
async function setCookieClean(name, value, expirationDate) {
  if (!name || !value) return;

  // 1. Remove old versions
  await removeAllCookiesNamed(name);

  const exp = expirationDate || Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

  // 2. Set domain cookie on twitch.tv
  try {
    await chrome.cookies.set({
      url: "https://www.twitch.tv/",
      domain: TWITCH_DOMAIN_CLEAN, // NO leading dot for Chrome cookies.set!
      path: "/",
      name: name,
      value: String(value),
      secure: true,
      sameSite: "no_restriction",
      expirationDate: exp
    });
  } catch (err) {
    console.warn(`[Twitch Switcher] Error setting domain cookie ${name}:`, err);
    // Fallback as host cookie
    try {
      await chrome.cookies.set({
        url: "https://www.twitch.tv/",
        path: "/",
        name: name,
        value: String(value),
        secure: true,
        expirationDate: exp
      });
    } catch (e2) {
      console.error(`[Twitch Switcher] Fallback set failed for ${name}:`, e2);
    }
  }

  // 3. For auth-token, also set for passport.twitch.tv
  if (name === "auth-token") {
    try {
      await chrome.cookies.set({
        url: "https://passport.twitch.tv/",
        domain: TWITCH_DOMAIN_CLEAN,
        path: "/",
        name: name,
        value: String(value),
        secure: true,
        sameSite: "no_restriction",
        expirationDate: exp
      });
    } catch (_) {}
  }
}

// Get current session details
async function getCurrentSession() {
  const cookies = await getTwitchCookies();
  const authCookie = cookies.find(c => c.name === "auth-token");
  const loginCookie = cookies.find(c => c.name === "login");
  const nameCookie = cookies.find(c => c.name === "name");

  const token = authCookie ? authCookie.value : null;
  let user = null;

  if (token) {
    user = await fetchTwitchUser(token);
  }

  if (!user && loginCookie) {
    user = {
      id: loginCookie.value,
      login: loginCookie.value,
      displayName: nameCookie ? decodeURIComponent(nameCookie.value) : loginCookie.value,
      profileImageURL: ""
    };
  }

  return {
    isLoggedIn: Boolean(token),
    authToken: token,
    user,
    cookies
  };
}

// Save or update an account in storage
async function saveAccount(accountData) {
  const { accounts = [] } = await chrome.storage.local.get("accounts");
  const index = accounts.findIndex(a => a.id === accountData.id || a.login.toLowerCase() === accountData.login.toLowerCase());

  if (index >= 0) {
    accounts[index] = { ...accounts[index], ...accountData, updatedAt: Date.now() };
  } else {
    accounts.push({ ...accountData, createdAt: Date.now(), updatedAt: Date.now() });
  }

  await chrome.storage.local.set({ accounts, activeAccountId: accountData.id });
  return accounts;
}

// Switch account by setting cookies cleanly and reloading tabs
async function switchAccount(accountId, tabId) {
  const { accounts = [] } = await chrome.storage.local.get("accounts");
  const target = accounts.find(a => a.id === accountId);

  if (!target || !target.authToken) {
    throw new Error("Target account not found or has no auth token.");
  }

  // 1. Thoroughly remove all old auth cookies first
  await removeAllTwitchAuthCookies();

  // 2. Set the target account cookies
  if (target.cookies && Array.isArray(target.cookies)) {
    for (const c of target.cookies) {
      if (["auth-token", "login", "name", "twilight-user", "persistent"].includes(c.name)) {
        await setCookieClean(c.name, c.value, c.expirationDate);
      }
    }
  }

  // Guarantee that auth-token and login are set
  await setCookieClean("auth-token", target.authToken);
  if (target.login) {
    await setCookieClean("login", target.login);
  }
  if (target.displayName) {
    await setCookieClean("name", encodeURIComponent(target.displayName));
  }

  await chrome.storage.local.set({ activeAccountId: target.id });

  // 3. Reload Twitch tabs with bypassCache
  if (tabId) {
    chrome.tabs.reload(tabId, { bypassCache: true });
  } else {
    const tabs = await chrome.tabs.query({ url: "*://*.twitch.tv/*" });
    for (const tab of tabs) {
      chrome.tabs.reload(tab.id, { bypassCache: true });
    }
  }

  return target;
}

// Logout session client-side so user can log into a new account without invalidating server token
async function logoutForNewAccount(tabId) {
  // 1. Auto-save current session first so it is never lost!
  try {
    const session = await getCurrentSession();
    if (session.isLoggedIn && session.user && session.authToken) {
      await saveAccount({
        id: session.user.id || session.user.login,
        login: session.user.login,
        displayName: session.user.displayName || session.user.login,
        avatar: session.user.profileImageURL || "",
        authToken: session.authToken,
        cookies: session.cookies.filter(c => ["auth-token", "login", "name", "twilight-user"].includes(c.name))
      });
    }
  } catch (e) {
    console.warn("Could not auto-save account before logout:", e);
  }

  // 2. Thoroughly strip all auth cookies client-side
  await removeAllTwitchAuthCookies();
  await chrome.storage.local.set({ activeAccountId: null });

  // 3. Navigate tab to Twitch login page directly (NEVER to /logout which revokes token on server!)
  const targetUrl = "https://www.twitch.tv/login";
  if (tabId) {
    chrome.tabs.update(tabId, { url: targetUrl });
  } else {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.update(tabs[0].id, { url: targetUrl });
    }
  }
}

// Delete account from storage
async function removeAccount(accountId) {
  const { accounts = [], activeAccountId } = await chrome.storage.local.get(["accounts", "activeAccountId"]);
  const filtered = accounts.filter(a => a.id !== accountId);
  const newActiveId = activeAccountId === accountId ? (filtered[0]?.id || null) : activeAccountId;
  await chrome.storage.local.set({ accounts: filtered, activeAccountId: newActiveId });
  return filtered;
}

// Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "GET_DATA": {
          const { accounts = [], activeAccountId = null } = await chrome.storage.local.get(["accounts", "activeAccountId"]);
          const session = await getCurrentSession();

          let matchedActiveId = activeAccountId;
          let needSave = false;

          // Auto-sync & auto-heal: if currently logged in, ensure account exists and has fresh token!
          if (session.user && session.isLoggedIn && session.authToken) {
            const foundIdx = accounts.findIndex(a => a.login.toLowerCase() === session.user.login.toLowerCase());
            const relevantCookies = (session.cookies || []).filter(c => ["auth-token", "login", "name", "twilight-user"].includes(c.name));

            if (foundIdx >= 0) {
              matchedActiveId = accounts[foundIdx].id;
              // If token in browser is newer/valid, update the stored token immediately!
              if (accounts[foundIdx].authToken !== session.authToken) {
                accounts[foundIdx].authToken = session.authToken;
                accounts[foundIdx].cookies = relevantCookies;
                accounts[foundIdx].updatedAt = Date.now();
                needSave = true;
              }
              if (session.user.profileImageURL && accounts[foundIdx].avatar !== session.user.profileImageURL) {
                accounts[foundIdx].avatar = session.user.profileImageURL;
                needSave = true;
              }
            } else {
              // Auto-save currently logged-in account
              const newAcc = {
                id: session.user.id || session.user.login,
                login: session.user.login,
                displayName: session.user.displayName || session.user.login,
                avatar: session.user.profileImageURL || "",
                authToken: session.authToken,
                cookies: relevantCookies,
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              accounts.push(newAcc);
              matchedActiveId = newAcc.id;
              needSave = true;
            }
          }

          if (needSave || activeAccountId !== matchedActiveId) {
            await chrome.storage.local.set({ accounts, activeAccountId: matchedActiveId });
          }

          sendResponse({
            success: true,
            accounts,
            activeAccountId: matchedActiveId,
            currentSession: session
          });
          break;
        }

        case "SAVE_CURRENT_ACCOUNT": {
          const session = await getCurrentSession();
          if (!session.isLoggedIn || !session.authToken) {
            sendResponse({ success: false, error: "Вы не авторизованы в Twitch." });
            return;
          }

          let user = session.user;
          if (!user || !user.login || user.login === "unknown") {
            user = await fetchTwitchUser(session.authToken);
          }

          const loginName = user?.login || message.login || "unknown";
          const displayName = user?.displayName || message.displayName || loginName;
          const avatarUrl = user?.profileImageURL || message.avatar || "";

          const newAccount = {
            id: user?.id || loginName,
            login: loginName,
            displayName: displayName,
            avatar: avatarUrl,
            authToken: session.authToken,
            cookies: session.cookies.filter(c => ["auth-token", "login", "name", "twilight-user", "persistent"].includes(c.name))
          };

          const accounts = await saveAccount(newAccount);
          sendResponse({ success: true, account: newAccount, accounts });
          break;
        }

        case "SWITCH_ACCOUNT": {
          const tabId = sender.tab ? sender.tab.id : message.tabId;
          const switched = await switchAccount(message.accountId, tabId);
          sendResponse({ success: true, account: switched });
          break;
        }

        case "LOGOUT_FOR_NEW_ACCOUNT_COOKIES": {
          await removeAllTwitchAuthCookies();
          sendResponse({ success: true });
          break;
        }

        case "LOGOUT_FOR_NEW_ACCOUNT": {
          const tabId = sender.tab ? sender.tab.id : message.tabId;
          await logoutForNewAccount(tabId);
          sendResponse({ success: true });
          break;
        }

        case "REMOVE_ACCOUNT": {
          const accounts = await removeAccount(message.accountId);
          sendResponse({ success: true, accounts });
          break;
        }

        default:
          sendResponse({ success: false, error: "Неизвестный тип сообщения: " + message.type });
      }
    } catch (err) {
      console.error("[Twitch Switcher] Error handling message:", err);
      sendResponse({ success: false, error: err.message || "Внутренняя ошибка расширения." });
    }
  })();

  return true;
});

// Automatically keep saved accounts in sync whenever user logs in or auth-token changes
chrome.cookies.onChanged.addListener(async (changeInfo) => {
  const { cookie, removed } = changeInfo;
  if (removed || !cookie || cookie.name !== "auth-token") return;
  if (!cookie.domain.includes("twitch.tv") || !cookie.value) return;

  try {
    const user = await fetchTwitchUser(cookie.value);
    if (!user || !user.login) return;

    const { accounts = [] } = await chrome.storage.local.get("accounts");
    const idx = accounts.findIndex(a => a.login.toLowerCase() === user.login.toLowerCase());

    const cookies = await getTwitchCookies();
    const relevantCookies = cookies.filter(c => ["auth-token", "login", "name", "twilight-user"].includes(c.name));

    if (idx >= 0) {
      accounts[idx].authToken = cookie.value;
      accounts[idx].displayName = user.displayName || accounts[idx].displayName;
      accounts[idx].avatar = user.profileImageURL || accounts[idx].avatar;
      accounts[idx].cookies = relevantCookies;
      accounts[idx].updatedAt = Date.now();
      await chrome.storage.local.set({ accounts, activeAccountId: accounts[idx].id });
    } else {
      const newAcc = {
        id: user.id || user.login,
        login: user.login,
        displayName: user.displayName || user.login,
        avatar: user.profileImageURL || "",
        authToken: cookie.value,
        cookies: relevantCookies,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      accounts.push(newAcc);
      await chrome.storage.local.set({ accounts, activeAccountId: newAcc.id });
    }
  } catch (err) {
    console.warn("[Twitch Switcher] Error in cookie change sync:", err);
  }
});
