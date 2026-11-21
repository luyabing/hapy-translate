'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('hapy', {
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),

  setLanguage: (code) => ipcRenderer.invoke('config:set-language', code),
  setActiveSite: (siteId) => ipcRenderer.invoke('config:set-active-site', siteId),
  setLeftWidth: (width) => ipcRenderer.invoke('config:set-left-width', width),

  addSite: (payload) => ipcRenderer.invoke('site:add', payload),
  updateSite: (id, patch) => ipcRenderer.invoke('site:update', { id, ...patch }),
  deleteSite: (id) => ipcRenderer.invoke('site:delete', id),

  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),

  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),

  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowToggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  getWindowState: () => ipcRenderer.invoke('window:get-state'),

  onSitesUpdated: (callback) => subscribe('sites:updated', callback),
  onWindowState: (callback) => subscribe('window:state', callback),
  onShortcutReload: (callback) => subscribe('shortcut:reload', callback),
  onTrayRefresh: (callback) => subscribe('tray:refresh', callback),
  onTrayOpenSettings: (callback) => subscribe('tray:open-settings', callback),
});
