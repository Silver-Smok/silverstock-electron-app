const { contextBridge, ipcRenderer } = require("electron");

let appVersion;

contextBridge.exposeInMainWorld("electron", {
  features: {
    autoUpdater: true,
    clientInfo: true
  },
  openExternalLink(linkref) {
    ipcRenderer.send('openExternalLink', linkref)
  },
  getAppVersion() {
    return new Promise((resolve) => {
      if (appVersion) {
        return resolve(appVersion);
      }

      ipcRenderer.once("appVersion", (event, version) => {
        appVersion = version;
        resolve(version);
      });
      ipcRenderer.send("getAppVersion");
    });
  },
  getMacAddress() {
    return new Promise((resolve) => {
      ipcRenderer.once("getMacAddress", (event, macAddress) => {
        resolve(macAddress);
      });
      ipcRenderer.send("getMacAddress");
    });
  },
  getComputerHostname() {
    return new Promise((resolve) => {
      ipcRenderer.once("computerHostname", (event, hostname) => {
        resolve(hostname);
      });
      ipcRenderer.send("getComputerHostname");
    });
  },
  switchAppChannel() {
    ipcRenderer.send("switchAppChannel");
  },
  getAppChannel() {
    return new Promise((resolve) => {
      ipcRenderer.once("appChannel", (event, appChannel) => {
        resolve(appChannel);
      })
      ipcRenderer.send("getAppChannel");
    })
  },
  updateApp() {
    ipcRenderer.send("updateApp");
  },
  onAppUpdate(callback) {
    ipcRenderer.on("appUpdate", (event, updated) => {
      callback(updated);
    });
  },
  setBadgeCount(count) {
    ipcRenderer.send("setBadgeCount", count);
  },
  getBadgeCount() {
    return new Promise((resolve) => {
      ipcRenderer.once("badgeCount", (event, count) => {
        resolve(count);
      });
      ipcRenderer.send("getBadgeCount");
    });
  },
  reloadWithoutCache() {
    ipcRenderer.send("reloadWithoutCache");
  },
});
