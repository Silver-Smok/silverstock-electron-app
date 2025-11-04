if (require("electron-squirrel-startup")) return;
const electron = require("electron");
const {
  BrowserWindow,
  Menu,
  ipcMain,
  app,
  Notification,
  session,
  dialog,
  autoUpdater,
  shell,
} = electron;
const windowStateKeeper = require("electron-window-state");
const path = require("path");
require("electron-context-menu");
const log = require("electron-log/main");

const IS_DARWIN = process.platform === "darwin";
const PROD_URL = "https://app.silver-smok.com/";
const BETA_URL = "https://beta.app.silver-smok.com/";
const CHANNELS = {
  0: PROD_URL,
  1: BETA_URL,
};
const BASE_URL =
  "https://europe-west1-silver-smok-admin.cloudfunctions.net/checkElectronUpdate";
const UPDATE_URL = `${BASE_URL}?platform=${process.platform}&arch=${process.arch}&version=v${app.getVersion()}&electronVersion=${process.versions.electron}`;

let homeWindow;
let mainWindowState = null;
let selectedChannel = "0";
let forceProdEnv = false;

log.initialize();

// Initialize built-in auto-updater
const startUpdater = () => {
  const updateTimeout = setInterval(async () => {
    const result = await fetch(UPDATE_URL);
    if (result.status !== 204) {
      autoUpdater.checkForUpdates();
    }
  }, 300000); // Check every 5 minutes

  autoUpdater.setFeedURL(UPDATE_URL);

  // New update available - notify the renderer process
  autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName) => {
    const dialogOpts = {
      type: "info",
      buttons: ["Redémarrer", "Plus tard"],
      title: "Mise à jour de l'application",
      message: process.platform === "win32" ? releaseNotes : releaseName,
      detail:
        "Une nouvelle version de l'application a été téléchargé, merci de relancer l'application.",
    };

    homeWindow.webContents.send("appUpdate", true);

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
      if (returnValue.response === 0) {
        autoUpdater.quitAndInstall();
      } else {
        clearInterval(updateTimeout);
      }
    });
  });

  // Error during update check
  autoUpdater.on("error", (message) => {
    if (message != "Error: No update available, can't quit and install") {
      log.error("Problème lors de la mise à jour de l'application.");
      log.error(message);
    }
  });
};

startUpdater();

// Single app instance lock to prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // On macOS, we need to manually focus the app when we receive a 'second-instance' event
    if (homeWindow) {
      if (homeWindow.isMinimized()) homeWindow.restore();
      homeWindow.focus();
    }
  });

  // Create the main window when the application is ready
  app.on("ready", createWindow);

  app.on("activate", function () {
    // On macOS, it is common to recreate a window in the app when
    // the dock icon is clicked and there are no other windows open.
    if (homeWindow === null) createWindow();
  });
}

async function createWindow() {
  const template = [
    {
      label: "Édition",
      submenu: [
        {
          label: "Couper",
          role: "cut",
        },
        {
          label: "Copier",
          role: "copy",
        },
        {
          label: "Coller",
          role: "paste",
        },
        {
          label: "Tout selectionner",
          role: "selectAll",
        },
      ],
    },
    {
      label: "Présentation",
      submenu: [
        {
          label: "Recharger la page",
          accelerator: "CmdOrCtrl+R",
          click(item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.webContents.reloadIgnoringCache();
            }
          },
        },
        {
          type: "separator",
        },
        {
          label: "Réinitialiser le zoom",
          role: "resetzoom",
        },
        {
          label: "Zoom avant",
          role: "zoomin",
        },
        {
          label: "Zoom arrière",
          role: "zoomout",
        },
        {
          type: "separator",
        },
        {
          label: "Passer en plein écran",
          role: "togglefullscreen",
        },
      ],
    },
    {
      role: "window",
      label: "Fenêtre",
      submenu: [
        {
          label: "Fermer",
          accelerator: "CmdOrCtrl+W",
          role: "close",
        },
        {
          label: "Activer les outils de développement",
          accelerator: IS_DARWIN ? "Alt+Command+I" : "Ctrl+Shift+I",
          click(item, focusedWindow) {
            if (focusedWindow) {
              homeWindow.webContents.toggleDevTools();
            }
          },
        },
        {
          label: "Minimiser",
          accelerator: "CmdOrCtrl+M",
          role: "minimize",
        },
        {
          label: "Zoom",
          role: "zoom",
        },
        {
          type: "separator",
        },
        {
          label: "Tout ramener au premier plan",
          role: "front",
        },
      ],
    },
  ];

  if (IS_DARWIN) {
    template.unshift({
      label: "SilverStock",
      submenu: [
        {
          label: "À propos de SilverStock",
          role: "about",
        },
        {
          type: "separator",
        },
        {
          label: "Masquer SilverStock",
          role: "hide",
        },
        {
          label: "Masquer les autres",
          role: "hideothers",
        },
        {
          label: "Tout afficher",
          role: "unhide",
        },
        {
          type: "separator",
        },
        {
          label: "Quitter SilverStock",
          role: "quit",
        },
      ],
    });
    template[1].submenu.push(
      {
        type: "separator",
      },
      {
        label: "Synthèse vocale",
        submenu: [
          {
            label: "Commencer à parler",
            role: "startspeaking",
          },
          {
            label: "Arrêter de parler",
            role: "stopspeaking",
          },
        ],
      }
    );
  }

  const currentSession = session.defaultSession;
  currentSession.webRequest.onHeadersReceived(
    { urls: ["https://*.hiboutik.com/"] },
    (details, callback) => {
      if (
        details.responseHeaders &&
        details.responseHeaders["Set-Cookie"] &&
        details.responseHeaders["Set-Cookie"].length &&
        !details.responseHeaders["Set-Cookie"][0].includes("SameSite=None")
      ) {
        details.responseHeaders["Set-Cookie"][0] =
          details.responseHeaders["Set-Cookie"][0] + "; SameSite=None; Secure";
      }
      callback({ cancel: false, responseHeaders: details.responseHeaders });
    }
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  if (!mainWindowState) {
    mainWindowState = windowStateKeeper({
      defaultWidth: 1280,
      defaultHeight: 900,
    });
  }
  // Create the browser window.
  const options = {
    backgroundColor: "#fffff",
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 900,
    minHeight: 650,
    x: mainWindowState.x,
    y: mainWindowState.y,
    resizable: true,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      webSecurity: false,
      allowRunningInsecureContent: true,
      webgl: false,
      webaudio: false,
      contextIsolation: true, // protect against prototype pollution
      preload: path.join(__dirname, "preload.cjs"), // use
    },
  };
  homeWindow = new BrowserWindow(options);

  const cookies = await currentSession.cookies.get({
    url: PROD_URL,
  });

  if (!cookies.length) {
    await currentSession.cookies.set({
      url: PROD_URL,
      name: "channel",
      value: selectedChannel,
    });
  }

  homeWindow.loadURL(CHANNELS[selectedChannel]);
  homeWindow.on("show", function () {
    mainWindowState.manage(homeWindow);
  });
  new Notification();
}

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  session.defaultSession.clearCache();
  autoUpdater.quitAndInstall();
  app.quit();
});

// Provide app version to renderer
ipcMain.on("getAppVersion", () => {
  homeWindow.webContents.send("appVersion", app.getVersion());
});

// Provide platform info to renderer
ipcMain.on("getPlatform", () => {
  homeWindow.webContents.send("platform", process.platform);
});

// Handle app update request from renderer
ipcMain.on("updateApp", () => {
  autoUpdater.quitAndInstall();
});

// Set badge count on macOS
ipcMain.on("setBadgeCount", (event, count) => {
  if (IS_DARWIN) {
    app.setBadgeCount(count);
  }
});

// Provide current badge count to renderer
ipcMain.on("getBadgeCount", () => {
  if (IS_DARWIN) {
    homeWindow.webContents.send("badgeCount", app.getBadgeCount());
  }
});

// Handle channel switching
ipcMain.on("switchAppChannel", async () => {
  const currentSession = session.defaultSession;

  // Clear channel related cookies
  await currentSession.clearStorageData({
    storages: ["cookies"],
  });

  // Clear Firebase IndexedDB to avoid auth issues when switching channels
  await homeWindow.webContents.executeJavaScript(
    `indexedDB.deleteDatabase('firebaseLocalStorageDb');`
  );

  // Switch channel and set cookie
  selectedChannel = selectedChannel === "0" ? "1" : "0";
  await currentSession.cookies.set({
    url: CHANNELS[selectedChannel],
    name: "channel",
    value: selectedChannel,
  });

  // Reload app with new channel
  forceProdEnv = !forceProdEnv;
  homeWindow.loadURL(CHANNELS[selectedChannel]);
});

// Provide current channel to renderer
ipcMain.on("getAppChannel", () => {
  homeWindow.webContents.send("appChannel", selectedChannel);
});

// Open external links in default browser
ipcMain.on("openExternalLink", (event, linkref) => {
  shell.openExternal(linkref);
});

// Reload without cache
ipcMain.on("reloadWithoutCache", () => {
  homeWindow.webContents.reloadIgnoringCache();
});

// Handle automatic switch to beta for Silver-Smok customers
ipcMain.on("changeToBeta", async (event, customerName) => {
  // Automatically switch to beta channel for Silver-Smok customers
  // unless forced to stay on prod environment (e.g. when user manually switched to prod)
  if (
    selectedChannel === "0" &&
    customerName === "Silver-Smok" &&
    !forceProdEnv
  ) {
    const currentSession = session.defaultSession;

    // Clear channel related cookies
    await currentSession.clearStorageData({
      storages: ["cookies"],
    });

    // Clear Firebase IndexedDB to avoid auth issues when switching channels
    await homeWindow.webContents.executeJavaScript(
      `indexedDB.deleteDatabase('firebaseLocalStorageDb');`
    );

    // Switch channel and set cookie
    selectedChannel = "1";
    await currentSession.cookies.set({
      url: CHANNELS[selectedChannel],
      name: "channel",
      value: selectedChannel,
    });

    // Reload app with new channel
    homeWindow.loadURL(CHANNELS[selectedChannel]);
  }
});
