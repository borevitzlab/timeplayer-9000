import {protocol, Menu, app, BrowserWindow, globalShortcut } from 'electron';

var path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow;

var createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    backgroundColor: '#000',
    title: 'Time Player 9000',
    resizable: true,
    width: 900,
    height: 700,
  });

  // and load the index.html of the app.
  mainWindow.loadURL("appy://index.html");

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

protocol.registerStandardSchemes(['tc']);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {  

  var mMenu = [
  {
      label: 'reload',
      role: 'reload'
  },
  {
    label: 'debug',
    role: 'toggledevtools'
  }
  ];

  var menu = Menu.buildFromTemplate(mMenu);
  Menu.setApplicationMenu(menu);

  protocol.registerFileProtocol('appy', (request, callback) => {
    var url = request.url.substr(7);
    callback({path: path.normalize(`${__dirname}/${url}`)});
  }, (error) => {
    if(error)
      console.error('Failed to register protocol 0');
  });

  protocol.registerHttpProtocol('tc', (request, callback) => {
    var url = request.url.substr(5);
    callback({url: 'https://traitcapture.org/api/v3/config/by-id/' + url + '.json'});
  }, (error) => {
    if(error)
      console.error('Failed to register protocol 0');
  });

  
  globalShortcut.register('CommandOrControl+R', () => {
    mainWindow.webContents.send("TimePlayer-reload", "boop");
  });

  globalShortcut.register('CommandOrControl+N', () => {
    
  });

  createWindow();

});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.



