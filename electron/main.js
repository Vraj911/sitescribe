const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let backend;
try {
    backend = require('../backend/server.js');
    console.log('Backend loaded successfully');
} catch (error) {
    console.error('Failed to load backend:', error);
    backend = null;
}

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('run-command', async (event, { folder, command }) => {
    try {
        if (!backend) {
            return { success: false, error: 'Backend not loaded' };
        }
        const result = await backend.processCommand(folder, command);
        return { success: true, data: result };
    } catch (err) {
        console.error('Command execution error:', err);
        return { success: false, error: err.message };
    }
});
ipcMain.handle('pick-folder', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

// IPC: Open file picker dialog for HTML files
ipcMain.handle('pick-html-file', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [
            { name: 'HTML Files', extensions: ['html', 'htm'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});
