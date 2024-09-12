if (require('electron-squirrel-startup')) return;
const electron = require("electron");
const { BrowserWindow, Menu, ipcMain, app, Notification, session, dialog, autoUpdater, shell } = electron;
const windowStateKeeper = require("electron-window-state");
const path = require("path");
require("electron-context-menu");
const log = require("electron-log/main");
const getmac = require('getmac').default;
const os = require('os'); 

let homeWindow;
let mainWindowState = null;
const isDarwin = process.platform === "darwin";
const channelUrls = ["https://app.silver-smok.com/", "https://beta.app.silver-smok.com/"];
let channelSelected = 0;
let forceProdEnv = false;

log.initialize()

const startUpdater = () => {
  const updateTimeout = setInterval(async () => {
    const result = await fetch(`https://europe-west1-silver-smok-admin.cloudfunctions.net/checkElectronUpdate?platform=${process.platform}&arch=${process.arch}&version=v${app.getVersion()}`)
    if (result.status !== 204) {
      autoUpdater.checkForUpdates();
    }
  }, 60000);

  const updateUrl = `https://europe-west1-silver-smok-admin.cloudfunctions.net/checkElectronUpdate?platform=${
    process.platform
  }&arch=${process.arch}&version=v${app.getVersion()}`;

  autoUpdater.setFeedURL(updateUrl);
  
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
        cancelTimeout(updateTimeout);
      }
    });
  });
  
  autoUpdater.on("error", (message) => {
    if (message != "Error: No update available, can't quit and install") {
      log.error("Problème lors de la mise à jour de l'application.");
      log.error(message);
    }
  });
};

startUpdater();

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
          role: "selectAll"
        }
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

  const cookies = await session.defaultSession.cookies.get({ url: "https://app.silver-smok.com/" });
  
  if (!cookies.length) {
    await session.defaultSession.cookies.set({
      url: "https://app.silver-smok.com/",
      name: "channel",
      value: channelSelected.toString(),
    });
  }

  homeWindow.loadURL(
    process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:3006"
      : channelUrls[channelSelected]
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

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  session.defaultSession.clearCache();
  autoUpdater.quitAndInstall();
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

ipcMain.on("updateApp", () => {
  autoUpdater.quitAndInstall();
})

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

ipcMain.on("switchAppChannel", async () => {
  
  const prodCookies = await session.defaultSession.cookies.get({ url: "https://app.silver-smok.com/" });
  const betaCookies = await session.defaultSession.cookies.get({ url: "https://beta.app.silver-smok.com/" });

  prodCookies.length ? channelSelected = 1 : channelSelected = 0;

  if (prodCookies) {
    await session.defaultSession.cookies.remove("https://app.silver-smok.com/", "channel")
    await session.defaultSession.cookies.set({
      url: "https://beta.app.silver-smok.com/",
      name: "channel",
      value: channelSelected.toString(),
    });
  } else if (betaCookies) {
    await session.defaultSession.cookies.remove("https://beta.app.silver-smok.com/", "channel")
    await session.defaultSession.cookies.set({
      url: "https://app.silver-smok.com/",
      name: "channel",
      value: channelSelected.toString(),
    });
  }

  forceProdEnv = !forceProdEnv;
  homeWindow.loadURL(channelUrls[channelSelected]);
})

ipcMain.on("getAppChannel", () => {
  homeWindow.webContents.send("appChannel", channelSelected.toString());
})

ipcMain.on('openExternalLink', (event, linkref) => {
  shell.openExternal(linkref)
})

ipcMain.on('reloadWithoutCache', () => {
  homeWindow.webContents.reloadIgnoringCache();
})

ipcMain.on('getClientInformations', () => {
  homeWindow.webContents.send("clientInformations", getmac(), os.hostname(), app.getVersion());
})

ipcMain.on("changeToBeta", async (event, customerName) =>{
  if (channelSelected.toString() === "0" && customerName === "Silver-Smok" && !forceProdEnv) {
    channelSelected = 1;

    await session.defaultSession.cookies.remove("https://app.silver-smok.com/", "channel")
    await session.defaultSession.cookies.set({
      url: "https://beta.app.silver-smok.com/",
      name: "channel",
      value: channelSelected.toString(),
    });
    
    homeWindow.loadURL(channelUrls[channelSelected])
  }
});