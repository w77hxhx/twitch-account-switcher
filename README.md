# Twitch Account Switcher

Fast multi-account switching browser extension for Twitch (Manifest V3).

## Features

- 1-click account switching directly from the Twitch user menu.
- Native Twitch dark theme integration matching Twitch UI components.
- Automatic multi-language support (30+ Twitch languages).
- Secure client-side session management (no third-party servers).
- Extension popup toolbar menu with session overview and quick actions.

## Installation

Supported browsers: Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi, Yandex Browser, and other Chromium-based browsers.

1. Download or clone this repository:
   ```bash
   git clone https://github.com/w77hxhx/twitch-account-switcher.git
   ```
2. Open the extensions page in your browser:
   - Chrome / Brave: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Opera: `opera://extensions/`
   - Yandex: `browser://tune/`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (Загрузить распакованное расширение).
5. Select the `twitch-account-switcher` directory containing `manifest.json`.

## Usage

1. Navigate to [twitch.tv](https://www.twitch.tv).
2. Click your profile avatar in the top-right corner.
3. Click **Switch Accounts** (or **Сменить аккаунт**).
4. To add another account:
   - Click **Add account** (**Добавить аккаунт**).
   - Log in with your other Twitch credentials.
   - The account is automatically saved to your switcher list.
5. Click on any saved account in the list to switch instantly.
6. To remove an account, click the trash icon next to it in the list.

## Privacy & Security

- All authentication tokens and cookies are stored strictly in your browser's local storage (`chrome.storage.local`).
- No telemetry, analytics, or external API calls to third-party servers.
- Requests are sent exclusively to official Twitch endpoints (`twitch.tv`, `gql.twitch.tv`).

## License

MIT License.
