const electron = require("electron");
const { BrowserWindow, Menu, ipcMain, app, Notification, session, dialog } = electron;
const windowStateKeeper = require("electron-window-state");
const path = require("path");
require("electron-context-menu");
const log = require("electron-log/main");
const { autoUpdater } = require('electron-updater');

let homeWindow;
let mainWindowState = null;
const isDarwin = process.platform === "darwin";

log.initialize()

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: 'Download in progress',
    detail:
      'A new version has been downloaded. Restart the application to apply the updates.'
  }

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall()
  })
})

autoUpdater.on('update-not-available', (info) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: 'No Update available',
    detail:
      'No new version available...'
  }
  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) console.log('ok')
  })
})

autoUpdater.on('update-available', (event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    detail:
      'A new version is available.'
  }
  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) console.log('ok')
  })
})

autoUpdater.on('error', (message) => {
  const dialogOpts = {
    type: 'error',
    buttons: ['Restart', 'Later'],
    title: 'ERROR',
    message: message,
    detail:
      'Error during the update...'
  }
  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) console.log('ok')
  })
})

function createWindow() {
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "Silver-Smok",
    repo: "silverstock-electron-app",
  });

  autoUpdater.checkForUpdates()
  setInterval(() => {
    autoUpdater.checkForUpdates()
   }, 60000);
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
          accelerator: isDarwin ? "Alt+Command+I" : "Ctrl+Shift+I",
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

  if (isDarwin) {
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

  session.defaultSession.webRequest.onHeadersReceived(
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
    minWidth: 1200,
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
  homeWindow.loadURL(
    process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:3006"
      : "https://app.silver-smok.com/"
  );

  homeWindow.on("show", function () {
    mainWindowState.manage(homeWindow);
  });
  new Notification();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);
app.on("ready", function () {
  session.defaultSession.clearCache(null, () => {
    app.relaunch();
    app.exit();
  });
});

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on("getAppVersion", () => {
  homeWindow.webContents.send("appVersion", app.getVersion());
});

ipcMain.on("getPlatform", () => {
  homeWindow.webContents.send("platform", process.platform);
});

ipcMain.on("setBadgeCount", (event, count) => {
  if (isDarwin) {
    app.setBadgeCount(count);
  }
});

ipcMain.on("getBadgeCount", () => {
  if (isDarwin) {
    homeWindow.webContents.send("badgeCount", app.getBadgeCount());
  }
});
