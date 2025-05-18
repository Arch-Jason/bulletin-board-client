const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld("sys", {
    prt: () => ipcRenderer.invoke("prt"),
    readButtons: () => ipcRenderer.invoke("readButtons")
})