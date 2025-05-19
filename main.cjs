const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const { buttonFeedback } = require("./feedbackHandler.cjs")

const createWindow = () => {
  const win = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  ipcMain.handle('prt', () => console.log("hello"))
  ipcMain.handle('readButtons', async () => await buttonFeedback())
  createWindow()
})

