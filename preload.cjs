const { contextBridge, ipcRenderer } = require("electron");

let appVersion;

contextBridge.exposeInMainWorld("electron", {
  features: {
    autoUpdater: true,
    clientInfo: true,
    forceBeta: true
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
  getClientInformations() {
    return new Promise((resolve) => {
      ipcRenderer.once("clientInformations", (event, macAddress, hostname, electronVersion) => {
        const data = {
          macAddress: macAddress,
          hostname: hostname,
          electronVersion: electronVersion
        }
        resolve(data);
      });
      ipcRenderer.send("getClientInformations");
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
  changeToBeta(companyName) {
    ipcRenderer.send("changeToBeta", companyName);
  }
});
