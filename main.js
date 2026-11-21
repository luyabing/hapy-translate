'use strict';

const {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  screen,
  session,
  shell,
  Tray,
} = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP_NAME = 'Hapy翻译';
const INTERNAL_NAME = 'hapy-translate';
const AUTHOR = 'HapyTop';
const APP_ID = 'com.hapytop.hapytranslate';
const PARTITION = 'persist:hapy-ai';
const MAX_ICON_BYTES = 800 * 1024;

// The internal name stays ASCII so Linux window managers and the desktop entry
// can match the window reliably; all visible surfaces use APP_NAME.
app.setName(INTERNAL_NAME);
app.setAppUserModelId(APP_ID);
if (process.platform === 'linux') app.setDesktopName('hapy-translate.desktop');

// Keep user data in a stable ASCII directory. Without this, Electron derives
// the folder from the Chinese product name, which is awkward to document and
// can change if the display name ever changes.
app.setPath(
  'userData',
  process.env.HAPY_CONFIG_DIR
    ? path.resolve(process.env.HAPY_CONFIG_DIR)
    : path.join(app.getPath('appData'), 'hapy-translate'),
);

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const ICON_PATH = path.join(__dirname, 'assets', 'icon.png');

const BUILTIN_SITES = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    logoFile: 'deepseek.png',
    color: '#4D6BFE',
    builtin: true,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    logoFile: 'chatgpt.png',
    color: '#111111',
    builtin: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    logoFile: 'gemini.png',
    color: '#4E7BF4',
    builtin: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    logoFile: 'claude.png',
    color: '#D97757',
    builtin: true,
  },
  {
    id: 'kimi',
    name: 'Kimi',
    url: 'https://www.kimi.com/',
    logoFile: 'kimi.png',
    color: '#16171D',
    builtin: true,
  },
  {
    id: 'doubao',
    name: '豆包',
    url: 'https://www.doubao.com/chat/',
    logoFile: 'doubao.png',
    color: '#3D7BFF',
    builtin: true,
  },
  {
    id: 'qwen',
    name: 'Qwen',
    url: 'https://chat.qwen.ai/',
    logoFile: 'qwen.png',
    color: '#3A31F4',
    builtin: true,
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.com/',
    logoFile: 'grok.png',
    color: '#111111',
    builtin: true,
  },
];

const FALLBACK_COLORS = [
  '#5B5BF0',
  '#E36A54',
  '#1D9E75',
  '#2F7CE0',
  '#B45AD6',
  '#D49A21',
  '#2D8BB5',
  '#D35577',
];

let config = null;
let mainWindow = null;
let tray = null;
let trayHintShown = false;
let trayNotification = null;
let isQuitting = false;
let saveWindowTimer = null;
let iconFetchInFlight = new Set();

const chromeMajor = (process.versions.chrome || '140').split('.')[0];
const webUserAgent =
  `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ` +
  `Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
app.userAgentFallback = webUserAgent;

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

function cleanText(value, limit = 120) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function normalizeUrl(raw) {
  if (typeof raw !== 'string') throw new Error('请输入有效的网址');
  let value = raw.trim();
  if (!value) throw new Error('请输入网站网址');
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) value = `https://${value}`;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('网址格式不正确');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('仅支持 http 或 https 网站');
  }
  if (!parsed.hostname) throw new Error('网址格式不正确');
  parsed.username = '';
  parsed.password = '';
  return parsed.toString();
}

function forumColor(id) {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

function isValidImageDataUrl(value) {
  return (
    typeof value === 'string' &&
    /^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon|ico);base64,/i.test(
      value,
    ) &&
    value.length <= MAX_ICON_BYTES * 1.4
  );
}

function defaultSiteState(def) {
  return {
    ...def,
    enabled: true,
    preload: def.id === 'deepseek',
    logo: null,
    color: def.color || forumColor(def.id),
  };
}

function normalizeSavedSite(saved) {
  if (!saved || typeof saved !== 'object') return null;
  try {
    const url = normalizeUrl(saved.url);
    const id = /^custom-[a-zA-Z0-9-]{4,80}$/.test(saved.id)
      ? saved.id
      : `custom-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
    const name = cleanText(saved.name, 30) || new URL(url).hostname.replace(/^www\./, '');
    return {
      id,
      name,
      url,
      builtin: false,
      logoFile: null,
      logo: isValidImageDataUrl(saved.logo) ? saved.logo : null,
      color: /^#[0-9a-f]{6}$/i.test(saved.color) ? saved.color : forumColor(id),
      enabled: saved.enabled !== false,
      preload: Boolean(saved.preload),
    };
  } catch {
    return null;
  }
}

function buildDefaultConfig() {
  return {
    version: 1,
    language: 'fr',
    activeSiteId: 'deepseek',
    leftWidth: 406,
    windowBounds: null,
    sites: BUILTIN_SITES.map(defaultSiteState),
  };
}

function normalizeConfig(raw) {
  const base = buildDefaultConfig();
  if (!raw || typeof raw !== 'object') return base;

  const savedSites = Array.isArray(raw.sites) ? raw.sites : [];
  const savedById = new Map();
  for (const saved of savedSites) {
    if (saved && typeof saved.id === 'string') savedById.set(saved.id, saved);
  }

  const sites = BUILTIN_SITES.map((def) => {
    const saved = savedById.get(def.id);
    const initial = defaultSiteState(def);
    if (!saved) return initial;
    return {
      ...initial,
      enabled: saved.enabled !== false,
      preload: saved.preload !== undefined ? Boolean(saved.preload) : initial.preload,
    };
  });

  for (const saved of savedSites) {
    if (BUILTIN_SITES.some((def) => def.id === saved?.id)) continue;
    const normalized = normalizeSavedSite(saved);
    if (normalized) sites.push(normalized);
  }

  const language =
    typeof raw.language === 'string' && /^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,8})?$/.test(raw.language)
      ? raw.language
      : base.language;
  const enabledSites = sites.filter((site) => site.enabled);
  let activeSiteId =
    typeof raw.activeSiteId === 'string' &&
    enabledSites.some((site) => site.id === raw.activeSiteId)
      ? raw.activeSiteId
      : enabledSites[0]?.id || null;

  let windowBounds = null;
  if (raw.windowBounds && typeof raw.windowBounds === 'object') {
    const width = Number(raw.windowBounds.width);
    const height = Number(raw.windowBounds.height);
    const x = Number(raw.windowBounds.x);
    const y = Number(raw.windowBounds.y);
    if (Number.isFinite(width) && Number.isFinite(height) && width >= 900 && height >= 600) {
      windowBounds = {
        width: Math.round(Math.min(width, 4000)),
        height: Math.round(Math.min(height, 3000)),
        ...(Number.isFinite(x) && Number.isFinite(y)
          ? { x: Math.round(x), y: Math.round(y) }
          : {}),
      };
    }
  }

  const leftWidth = Number(raw.leftWidth);

  return {
    version: 1,
    language,
    activeSiteId,
    leftWidth: Number.isFinite(leftWidth) ? Math.round(Math.min(Math.max(leftWidth, 330), 620)) : base.leftWidth,
    windowBounds,
    sites,
  };
}

function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    config = normalizeConfig(raw);
  } catch {
    config = buildDefaultConfig();
  }
  persistConfig();
  return config;
}

function persistConfig() {
  if (!config) return;
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    const temp = `${CONFIG_PATH}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(config, null, 2), 'utf8');
    fs.renameSync(temp, CONFIG_PATH);
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

function publicConfig() {
  return JSON.parse(JSON.stringify(config));
}

function broadcastSites() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sites:updated', publicConfig());
  }
}

/* -------------------------------------------------------------------------- */
/* Favicons                                                                   */
/* -------------------------------------------------------------------------- */

function sniffImageMime(buffer) {
  if (!buffer || buffer.length < 8) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') {
    return 'image/gif';
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return 'image/x-icon';
  }
  if (buffer.subarray(0, 100).toString('utf8').includes('<svg')) return 'image/svg+xml';
  return null;
}

async function fetchBuffer(url, timeout = 9000, { allowHttpError = false } = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': webUserAgent,
      Accept: 'text/html,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok && !allowHttpError) throw new Error(`HTTP ${response.status}`);
  return {
    response,
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

function resolveIconCandidates(html, pageUrl) {
  const candidates = [];
  const linkPattern = /<link\b[^>]*>/gi;
  const tags = html.match(linkPattern) || [];
  for (const tag of tags) {
    const relMatch = tag.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rel = (relMatch?.[1] || relMatch?.[2] || relMatch?.[3] || '').toLowerCase();
    if (!rel.includes('icon')) continue;
    const hrefMatch = tag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = (hrefMatch?.[1] || hrefMatch?.[2] || hrefMatch?.[3] || '').trim();
    if (!href || href.startsWith('data:')) continue;
    try {
      const resolved = new URL(href, pageUrl).toString();
      if (!/^https?:/i.test(resolved)) continue;
      const isApple = rel.includes('apple-touch');
      const sizes = (tag.match(/\bsizes\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i) || []).slice(1).find(Boolean) || '';
      let score = isApple ? 50 : 30;
      if (/\b(32x32|64x64|128x128|180x180|192x192|256x256)\b/.test(sizes)) score += 15;
      if (/\bsvg\b/.test(String(tag))) score += 10;
      candidates.push({ url: resolved, score });
    } catch {
      /* ignore an invalid relative icon */
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.map((item) => item.url);
}

async function imageToDataUrl(url) {
  // Some favicon services answer 404 while still returning a usable fallback
  // image, so let the content sniffing decide whether the payload is valid.
  const { response, buffer } = await fetchBuffer(url, 8000, { allowHttpError: true });
  if (!buffer.length || buffer.length > MAX_ICON_BYTES) throw new Error('Icon is too large');
  const headerType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  const sniffed = sniffImageMime(buffer);
  let mime = sniffed || (headerType.startsWith('image/') ? headerType : null);
  if (!mime || !/^image\//.test(mime)) throw new Error('Not an image');
  if (mime === 'image/vnd.microsoft.icon' || mime === 'image/ico') mime = 'image/x-icon';
  if (!/^image\/(?:png|jpeg|jpg|webp|gif|svg\+xml|x-icon)$/i.test(mime)) {
    if (!sniffed) throw new Error('Unsupported icon format');
    mime = sniffed;
  }
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function fetchSiteLogo(site) {
  const pageUrl = site.url;
  const origin = new URL(pageUrl).origin;
  const candidates = [];

  try {
    const { response, buffer } = await fetchBuffer(pageUrl, 9000);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('xml') || contentType.includes('svg')) {
      const sniffed = sniffImageMime(buffer);
      if (sniffed) return `data:${sniffed};base64,${buffer.toString('base64')}`;
    }
    if (contentType.includes('html') || buffer.subarray(0, 500).toString('utf8').includes('<')) {
      const html = buffer.subarray(0, 600000).toString('utf8');
      candidates.push(...resolveIconCandidates(html, pageUrl));
    }
  } catch {
    /* The favicon endpoints below may still work. */
  }

  candidates.push(`${origin}/favicon.ico`, `${origin}/favicon.png`);

  for (const candidate of [...new Set(candidates)].slice(0, 8)) {
    try {
      return await imageToDataUrl(candidate);
    } catch {
      /* try the next candidate */
    }
  }

  // Last-resort public favicon service. The app remains useful offline because
  // the UI has its own monogram fallback.
  try {
    const host = new URL(pageUrl).hostname;
    return await imageToDataUrl(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`);
  } catch {
    return null;
  }
}

function hydrateCustomLogo(siteId) {
  if (iconFetchInFlight.has(siteId)) return;
  const site = config?.sites.find((item) => item.id === siteId && !item.builtin);
  if (!site || site.logo) return;
  iconFetchInFlight.add(siteId);
  fetchSiteLogo(site)
    .then((logo) => {
      const current = config?.sites.find((item) => item.id === siteId);
      if (!logo || !current) return;
      current.logo = logo;
      persistConfig();
      broadcastSites();
    })
    .catch(() => {})
    .finally(() => iconFetchInFlight.delete(siteId));
}

/* -------------------------------------------------------------------------- */
/* Window                                                                     */
/* -------------------------------------------------------------------------- */

function safeWindowBounds(saved) {
  if (!saved) return { width: 1380, height: 880, center: true };
  const displays = screen.getAllDisplays();
  const visible = displays.some((display) => {
    const area = display.workArea;
    return (
      Number.isFinite(saved.x) &&
      Number.isFinite(saved.y) &&
      saved.x < area.x + area.width - 80 &&
      saved.y < area.y + area.height - 80 &&
      saved.x + saved.width > area.x + 80 &&
      saved.y + saved.height > area.y + 40
    );
  });
  return {
    width: saved.width,
    height: saved.height,
    ...(visible ? { x: saved.x, y: saved.y } : { center: true }),
  };
}

function sendWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('window:state', {
    maximized: mainWindow.isMaximized(),
    minimized: mainWindow.isMinimized(),
  });
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed() || !config) return;
  if (!mainWindow.isMinimized() && !mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
    const bounds = mainWindow.getBounds();
    config.windowBounds = bounds;
    persistConfig();
  }
}

function scheduleWindowSave() {
  clearTimeout(saveWindowTimer);
  saveWindowTimer = setTimeout(saveWindowState, 450);
}

function createWindow() {
  const bounds = safeWindowBounds(config.windowBounds);
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    frame: false,
    backgroundColor: '#10121A',
    title: APP_NAME,
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      spellcheck: true,
    },
  });

  Menu.setApplicationMenu(null);

  // Harden every embedded page. The renderer never controls these values; the
  // trusted main process pins the session, disables Node, and only allows web
  // URLs to be attached.
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.sandbox = true;
    params.partition = PARTITION;
    try {
      const parsed = new URL(params.src);
      if (!['http:', 'https:'].includes(parsed.protocol)) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    sendWindowState();
    if (process.env.HAPY_CAPTURE) {
      setTimeout(captureForDiagnostics, Number(process.env.HAPY_CAPTURE_DELAY || 5500));
    }
  });

  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.on('minimize', () => {
    sendWindowState();
    updateTrayMenu();
  });
  mainWindow.on('restore', () => {
    sendWindowState();
    updateTrayMenu();
  });
  mainWindow.on('show', updateTrayMenu);
  mainWindow.on('hide', updateTrayMenu);
  mainWindow.on('resize', scheduleWindowSave);
  mainWindow.on('move', scheduleWindowSave);
  mainWindow.on('close', (event) => {
    saveWindowState();
    // Keep the app available from the tray when the user closes the window.
    if (isQuitting || !tray) return;
    event.preventDefault();
    mainWindow.hide();
    updateTrayMenu();
    notifyTrayOnce();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    updateTrayMenu();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
  attachShortcutHandler(mainWindow.webContents);

  if (process.env.HAPY_CAPTURE) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(captureForDiagnostics, Number(process.env.HAPY_CAPTURE_DELAY || 5500));
    });
  }
}

async function captureForDiagnostics() {
  if (!mainWindow || !process.env.HAPY_CAPTURE) return;
  try {
    const image = await mainWindow.capturePage();
    await fs.promises.writeFile(process.env.HAPY_CAPTURE, image.toPNG());
    console.log(`Screenshot written to ${process.env.HAPY_CAPTURE}`);
    if (process.env.HAPY_CAPTURE_EXIT === '1') {
      setTimeout(() => app.quit(), 400);
    }
  } catch (error) {
    console.error('Could not capture window:', error);
  }
}

/* -------------------------------------------------------------------------- */
/* System tray                                                                */
/* -------------------------------------------------------------------------- */

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    updateTrayMenu();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  updateTrayMenu();
}

function hideMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  saveWindowState();
  mainWindow.hide();
  updateTrayMenu();
}

function toggleMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    showMainWindow();
    return;
  }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) hideMainWindow();
  else showMainWindow();
}

function sendToRenderer(channel) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const dispatch = () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel);
  };
  if (mainWindow.webContents.isLoadingMainFrame()) {
    mainWindow.webContents.once('did-finish-load', dispatch);
  } else {
    dispatch();
  }
}

function trayMenuTemplate() {
  const hasWindow = Boolean(mainWindow && !mainWindow.isDestroyed());
  const canHide = hasWindow && mainWindow.isVisible() && !mainWindow.isMinimized();
  return [
    {
      label: canHide ? '隐藏主窗口' : '显示主窗口',
      click: () => (canHide ? hideMainWindow() : showMainWindow()),
    },
    {
      label: '刷新当前 AI 页面',
      enabled: hasWindow,
      click: () => sendToRenderer('tray:refresh'),
    },
    {
      label: '网站与预加载设置',
      enabled: hasWindow,
      click: () => {
        showMainWindow();
        sendToRenderer('tray:open-settings');
      },
    },
    { type: 'separator' },
    { label: `退出 ${APP_NAME}`, click: quitFromTray },
  ];
}

function updateTrayMenu() {
  if (!tray) return;
  try {
    tray.setContextMenu(Menu.buildFromTemplate(trayMenuTemplate()));
  } catch (error) {
    console.error('Could not update tray menu:', error);
  }
}

function createTray() {
  if (tray) return;
  try {
    const source = nativeImage.createFromPath(ICON_PATH);
    if (source.isEmpty()) return;
    tray = new Tray(source.resize({ width: 24, height: 24, quality: 'best' }));
    tray.setToolTip(`${APP_NAME} · AI 翻译工作台`);
    updateTrayMenu();
    if (process.platform !== 'linux') tray.on('click', toggleMainWindow);
    tray.on('double-click', showMainWindow);
  } catch (error) {
    console.error('Could not create tray icon:', error);
    tray = null;
  }
}

function notifyTrayOnce() {
  if (trayHintShown) return;
  trayHintShown = true;
  if (!Notification.isSupported()) return;
  try {
    trayNotification = new Notification({
      title: APP_NAME,
      body: '窗口已收起到系统托盘，点击托盘图标可以重新打开。',
      icon: ICON_PATH,
      silent: true,
    });
    trayNotification.on('click', showMainWindow);
    trayNotification.on('close', () => {
      trayNotification = null;
    });
    trayNotification.show();
  } catch {
    /* Notifications are an optional convenience. */
  }
}

function quitFromTray() {
  isQuitting = true;
  app.quit();
}

function attachShortcutHandler(contents) {
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const key = String(input.key || '').toLowerCase();
    if (key === 'f5' || (input.control && key === 'r')) {
      event.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('shortcut:reload');
    } else if (input.control && input.shift && key === 'i') {
      // Keep DevTools available to the app window, but not to the embedded
      // third-party sites unless they are inspected from the main process.
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Context menus                                                              */
/* -------------------------------------------------------------------------- */

function buildContextMenuTemplate(params, contents) {
  const template = [];
  const isWebview = contents.getType() === 'webview';

  if (params.linkURL && /^https?:/i.test(params.linkURL)) {
    template.push({
      label: '在系统浏览器中打开链接',
      click: () => shell.openExternal(params.linkURL),
    });
    template.push({
      label: '复制链接地址',
      click: () => clipboard.writeText(params.linkURL),
    });
    template.push({ type: 'separator' });
  }

  if (params.isEditable) {
    template.push(
      { label: '撤销', click: () => contents.undo(), enabled: params.editFlags.canUndo },
      { label: '重做', click: () => contents.redo(), enabled: params.editFlags.canRedo },
      { type: 'separator' },
      { label: '剪切', click: () => contents.cut(), enabled: params.editFlags.canCut },
      { label: '复制', click: () => contents.copy(), enabled: params.editFlags.canCopy },
      { label: '粘贴', click: () => contents.paste(), enabled: params.editFlags.canPaste },
      { label: '全选', click: () => contents.selectAll() },
    );
  } else {
    if (params.selectionText) {
      template.push({ label: '复制', click: () => contents.copy() });
    }
    if (params.mediaType === 'image' && params.srcURL) {
      template.push({
        label: '复制图片',
        click: () => {
          try {
            contents.copyImageAt(params.x, params.y);
          } catch {
            /* The image may have disappeared before the click. */
          }
        },
      });
      template.push({
        label: '复制图片地址',
        click: () => clipboard.writeText(params.srcURL),
      });
    }
    if (template.length) {
      template.push({ type: 'separator' });
      template.push({ label: '全选', click: () => contents.selectAll() });
    }
  }

  if (isWebview) {
    if (template.length) template.push({ type: 'separator' });
    template.push({ label: '重新加载', click: () => contents.reload() });
    const pageUrl = contents.getURL();
    if (/^https?:/i.test(pageUrl)) {
      template.push({
        label: '在系统浏览器中打开此页面',
        click: () => shell.openExternal(pageUrl),
      });
    }
  }

  // Avoid a menu made only of separators.
  return template.some((item) => item.type !== 'separator') ? template : [];
}

/* -------------------------------------------------------------------------- */
/* Browser sessions and popups                                                */
/* -------------------------------------------------------------------------- */

function configureSession() {
  const aiSession = session.fromPartition(PARTITION);
  aiSession.setUserAgent(webUserAgent);
  const allowedPermissions = new Set(['clipboard-sanitized-write']);
  aiSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(allowedPermissions.has(permission));
  });
  aiSession.setPermissionCheckHandler((_webContents, permission) => {
    return allowedPermissions.has(permission);
  });
}

app.on('web-contents-created', (_event, contents) => {
  attachShortcutHandler(contents);

  contents.on('context-menu', (_contextEvent, params) => {
    const isMainUi = mainWindow && contents === mainWindow.webContents;
    if (contents.getType() !== 'webview' && !isMainUi) return;
    const template = buildContextMenuTemplate(params, contents);
    if (!template.length) return;
    Menu.buildFromTemplate(template).popup({
      window: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
    });
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (!/^https?:/i.test(url)) return { action: 'deny' };

    // The main UI never opens child windows. Embedded AI sites occasionally
    // need a popup for sign-in, so those are kept inside the app and share the
    // persistent browser session.
    if (contents.getType() === 'webview') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 560,
          height: 760,
          minWidth: 420,
          minHeight: 520,
          parent: mainWindow || undefined,
          modal: false,
          autoHideMenuBar: true,
          backgroundColor: '#ffffff',
          icon: ICON_PATH,
          title: `${APP_NAME} · 登录`,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: false,
          },
        },
      };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });
});

/* -------------------------------------------------------------------------- */
/* IPC                                                                        */
/* -------------------------------------------------------------------------- */

ipcMain.handle('app:bootstrap', () => ({
  config: publicConfig(),
  meta: {
    name: APP_NAME,
    author: AUTHOR,
    version: app.getVersion(),
    platform: process.platform,
    userAgent: webUserAgent,
    partition: PARTITION,
  },
}));

ipcMain.handle('config:set-language', (_event, language) => {
  if (typeof language === 'string' && /^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,8})?$/.test(language)) {
    config.language = language;
    persistConfig();
  }
  return config.language;
});

ipcMain.handle('config:set-active-site', (_event, siteId) => {
  if (typeof siteId === 'string' && config.sites.some((site) => site.id === siteId && site.enabled)) {
    config.activeSiteId = siteId;
    persistConfig();
  }
  return config.activeSiteId;
});

ipcMain.handle('config:set-left-width', (_event, width) => {
  const parsed = Number(width);
  if (Number.isFinite(parsed)) {
    config.leftWidth = Math.round(Math.min(Math.max(parsed, 330), 620));
    persistConfig();
  }
  return config.leftWidth;
});

ipcMain.handle('site:add', async (_event, payload = {}) => {
  try {
    const url = normalizeUrl(payload.url);
    const duplicate = config.sites.find((site) => {
      try {
        return new URL(site.url).href.replace(/\/$/, '') === new URL(url).href.replace(/\/$/, '');
      } catch {
        return false;
      }
    });
    if (duplicate) {
      return { ok: false, error: `网站已存在：${duplicate.name}` };
    }
    const name = cleanText(payload.name, 30) || new URL(url).hostname.replace(/^www\./, '');
    const id = `custom-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
    const site = {
      id,
      name,
      url,
      builtin: false,
      logoFile: null,
      logo: null,
      color: forumColor(id),
      enabled: true,
      preload: Boolean(payload.preload),
    };
    config.sites.push(site);
    config.activeSiteId = site.id;
    persistConfig();
    broadcastSites();
    hydrateCustomLogo(site.id);
    return { ok: true, siteId: site.id, sites: publicConfig().sites, config: publicConfig() };
  } catch (error) {
    return { ok: false, error: error.message || '无法添加这个网站' };
  }
});

ipcMain.handle('site:update', (_event, payload = {}) => {
  const site = config.sites.find((item) => item.id === payload.id);
  if (!site) return { ok: false, error: '网站不存在' };
  if (payload.enabled !== undefined) site.enabled = Boolean(payload.enabled);
  if (payload.preload !== undefined) site.preload = Boolean(payload.preload);
  if (payload.name !== undefined && !site.builtin) {
    const name = cleanText(payload.name, 30);
    if (name) site.name = name;
  }
  if (!site.enabled && config.activeSiteId === site.id) {
    config.activeSiteId = config.sites.find((item) => item.enabled)?.id || null;
  }
  if (site.enabled && payload.makeActive) config.activeSiteId = site.id;
  persistConfig();
  broadcastSites();
  return { ok: true, config: publicConfig() };
});

ipcMain.handle('site:delete', (_event, siteId) => {
  const site = config.sites.find((item) => item.id === siteId);
  if (!site || site.builtin) return { ok: false, error: '内置网站不能删除' };
  config.sites = config.sites.filter((item) => item.id !== siteId);
  if (config.activeSiteId === siteId) {
    config.activeSiteId = config.sites.find((item) => item.enabled)?.id || null;
  }
  persistConfig();
  broadcastSites();
  return { ok: true, config: publicConfig() };
});

ipcMain.handle('clipboard:read', () => clipboard.readText());
ipcMain.handle('clipboard:write', (_event, text) => {
  if (typeof text === 'string') clipboard.writeText(text);
  return true;
});

ipcMain.handle('app:open-external', async (_event, rawUrl) => {
  try {
    const url = new URL(String(rawUrl));
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    await shell.openExternal(url.toString());
    return true;
  } catch {
    return false;
  }
});

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:toggle-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

ipcMain.handle('window:get-state', () => ({
  maximized: Boolean(mainWindow?.isMaximized()),
  minimized: Boolean(mainWindow?.isMinimized()),
}));

/* -------------------------------------------------------------------------- */
/* Lifecycle                                                                  */
/* -------------------------------------------------------------------------- */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('will-quit', () => {
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });

  app.whenReady().then(() => {
    loadConfig();
    configureSession();
    for (const site of config.sites) {
      if (!site.builtin && !site.logo) hydrateCustomLogo(site.id);
    }
    if (process.platform === 'linux') {
      try {
        const image = nativeImage.createFromPath(ICON_PATH);
        if (!image.isEmpty()) app.dock?.setIcon?.(image);
      } catch {
        /* dock icon is not available on all desktop environments */
      }
    }
    createWindow();
    createTray();
    app.on('activate', () => {
      showMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    // With a tray icon the app can keep running without a window; the tray
    // menu can recreate it. Without a tray, preserve the normal quit behavior.
    if (!tray) app.quit();
  });
}
