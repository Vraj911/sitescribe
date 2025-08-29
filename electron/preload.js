const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    runCommand: (folder, command) => ipcRenderer.invoke('run-command', { folder, command }),
    pickFolder: () => ipcRenderer.invoke('pick-folder'),
    pickHtmlFile: () => ipcRenderer.invoke('pick-html-file')
});