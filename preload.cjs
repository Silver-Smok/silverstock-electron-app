const { contextBridge, ipcRenderer, shell } = require("electron");

let appVersion;

contextBridge.exposeInMainWorld("electron", {
  shell,
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
  checkUpdate() {
    return new Promise((resolve) => {
      ipcRenderer.once("canUpdate", (event, canUpdate) => {
        resolve(canUpdate);
      })
      ipcRenderer.send("checkUpdate");
    })
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
});
