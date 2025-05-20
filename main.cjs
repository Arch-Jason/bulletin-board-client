const { app, BrowserWindow, ipcMain, session } = require('electron'); // 添加了 session
const path = require('node:path');
const { buttonFeedback } = require("./feedbackHandler.cjs");

const createWindow = () => {
  const win = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      webSecurity: true,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
  // win.webContents.openDevTools();
};

app.whenReady().then(() => {
  // 禁用 CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [''] // 清空 CSP
      }
    });
  });

  ipcMain.handle('prt', () => console.log("hello"));
  ipcMain.handle('readButtons', async () => await buttonFeedback());
  createWindow();
});

