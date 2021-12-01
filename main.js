const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const contextMenu = require('electron-context-menu');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

let userDir = app.getPath('userData');
// let dbPath = path.join(userDir, 'tracker.db');
let user = app.getPath('userData').split('Users')[1].split('\\')[1];
let dbPath = `C:/Users/${user}/AppData/Roaming/tockler/tracker.db`;
let table = 'TrackItems';

ipcMain.on('askForDates', (e, arg) => {
  let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) e.reply('returnDates', err.message);
  });
  let sql = `SELECT DISTINCT date(beginDate/1000, 'unixepoch', 'localtime') as start
            FROM ${table}`;

  let allDates = [];

  db.each(sql, [], (err, row) => {
    allDates.push(row.start);
  }, () => {
    e.reply('returnDates', allDates);

    db.close(err => {
      if (err) console.log(err)
    });
  });
});


ipcMain.on('retrieve-events-by-date', (e, arg) => {
  let date = new Date(new Date(arg).getTime() + new Date(arg).getTimezoneOffset() * 60000);
  let startDate = date.getTime();
  let endDate = date.setDate(date.getDate() + 1);

  let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) console.log(err.message);
    // else console.log('Connected to Tracker db for retrieve-events-by-date.');
  });

  let sql = `SELECT app,
            title,
            beginDate as start,
            endDate as end
            FROM ${table}
            WHERE start >= ?
            AND end < ?
            AND taskName = 'AppTrackItem'`;

  let records = [];

  db.each(sql, [startDate, endDate], (err, row) => {
    records.push(row);
  }, () => {
    e.reply('return-events-by-date', records);

    db.close(err => {
      if (err) console.log(err)
      // else console.log('db closed for retrieve-events-by-date');
    });
  });
});


function createWindow() {
  let mainWindow = new BrowserWindow({
    width: 1400,//800,
    height: 740,//600,
    frame: false,
    backgroundColor: '#3a3a3a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  let menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+W',
          click() {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click() {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click() {
            mainWindow.webContents.reload();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click() {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click() {
            mainWindow.webContents.setZoomLevel(0);
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click() {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + .2);
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click() {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - .2);
          }
        }
      ],
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          click() {
            mainWindow.minimize();
          }
        },
        {
          label: 'Maximize',
          accelerator: 'CmdOrCtrl+Shift+M',
          click() {
            mainWindow.maximize();
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: 'CmdOrCtrl+F',
          click() {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        }
      ]
    }
  ])
  Menu.setApplicationMenu(menu);

  mainWindow.loadFile('./src/index.html');

  mainWindow.webContents.openDevTools();

  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    console.log('attempting to download');
    item.setSavePath(app.getPath("desktop") + "/" + item.getFilename());

    console.log(fs.existsSync(item.getSavePath()));
    if (fs.existsSync(item.getSavePath())) {
      var exist = true;
      while (exist) {
        let copyNumber = item.getSavePath().indexOf('(') >= 0 ? parseInt(item.getSavePath().split('(')[1].split(')')[0]) : 0;
        copyNumber++;
        item.setSavePath(app.getPath("desktop") + "/" + item.getFilename().replace(/.csv/, '') + `(${copyNumber}).csv`);
        exist = fs.existsSync(item.getSavePath()) ? true : false;
      }
    }


    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed')
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('Download is paused')
        } else {
          console.log(`Received bytes: ${item.getReceivedBytes()}`)
        }
      }
    })

    item.on('done', (event, state) => {
      if (state === 'completed') {
        console.log('Download successfully')
      } else {
        console.log(`Download failed: ${state}`)
      }
    })
  });
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((e) => console.log('An error occurred when creating the window.', e.message));

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

contextMenu({});

ipcMain.on('toRead', (e, arg) => {
  fs.readFile(arg, 'utf8', (error, data) => {
    if (error) throw error;
    e.reply('fromRead', data);
  });
});

ipcMain.on('write-csv', (event, arg) => {
  let writeStream = fs.createWriteStream('time.csv', 'utf8');
  writeStream.write(arg);
  let res = 'write complete';
  writeStream.on('error', (err) => {
    res = err;
  })
  writeStream.end();
  event.reply('return-csv', res);
})

ipcMain.on('title-bar-interaction', (event, arg) => {
  let mainWindow = BrowserWindow.getFocusedWindow();
  if (arg === 'min-button') {
    mainWindow.minimize();
  };
  if (arg === 'close-button') {
    mainWindow.close();
  };
  if (arg === 'max-button' || arg === 'restore-button') {
    arg === 'max-button' ? mainWindow.maximize() : mainWindow.unmaximize();
    event.reply('toggle-maximize', mainWindow.isMaximized());
  };
})

ipcMain.on('initial-zoom', (event, arg) => BrowserWindow.getFocusedWindow().webContents.setZoomLevel(JSON.parse(arg)));
ipcMain.on('get-zoom-level', (event, arg) => event.reply('return-zoom-level', BrowserWindow.getFocusedWindow().webContents.getZoomLevel()));