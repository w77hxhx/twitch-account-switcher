# <img src="icons/logo-transparent.png" width="32" height="32" valign="middle" alt="Logo"> Twitch Account Switcher

Fast multi-account switching browser extension and userscript for Twitch (Manifest V3 / Tampermonkey).

## Features

- 1-click account switching directly from the Twitch user menu.
- Native Twitch dark theme integration matching Twitch UI components.
- Automatic multi-language support (30+ Twitch languages).
- Secure client-side session management (no third-party servers).
- Available as a Chromium extension or a Tampermonkey userscript.

## Installation

### Option 1: Browser Extension (Chromium)

Supported browsers: Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi, Yandex Browser.

1. Clone or download this repository:
   ```bash
   git clone https://github.com/w77hxhx/twitch-account-switcher.git
   ```
2. Open the extensions manager in your browser:
   - Chrome / Brave: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Opera: `opera://extensions/`
   - Yandex: `browser://tune/`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (Загрузить распакованное расширение).
5. Select the `twitch-account-switcher` directory containing `manifest.json`.

### Option 2: Tampermonkey / Userscript

If you use Tampermonkey, Violentmonkey, or Greasemonkey:

1. Click to install directly:
   [Install Userscript (Raw)](https://raw.githubusercontent.com/w77hxhx/twitch-account-switcher/main/twitch-account-switcher.user.js)
2. Click **Install** in the Tampermonkey prompt.

## Usage

1. Open [twitch.tv](https://www.twitch.tv).
2. Click your profile avatar in the top-right corner.
3. Click **Switch Accounts** (or **Сменить аккаунт**).
4. To add another account:
   - Click **Add account** (**Добавить аккаунт**).
   - Log in with your credentials on Twitch.
   - The account is automatically detected and saved.
5. Click any saved account in the list to switch immediately.
6. To delete an account, click the trash icon next to it.

## Privacy & Security

- All authentication tokens are stored locally on your device (`chrome.storage.local` / `GM_setValue`).
- No external tracking, analytics, or third-party servers.
- Network requests are sent exclusively to official Twitch endpoints (`twitch.tv`, `gql.twitch.tv`).

## License

MIT License.
