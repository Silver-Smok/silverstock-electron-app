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
  updateApp() {
    ipcRenderer.send("updateApp");
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
