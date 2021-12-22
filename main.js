const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

let dbPath = path.join(app.getPath('appData'), 'tockler/tracker.db');
let table = 'TrackItems';
let timeParserDbPath = path.join(app.getPath('appData'), 'time-parser/tracker.db');
let csvSavePath;

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
    });
  });
});

const updateSettings = (arg) => {
  let db = new sqlite3.Database(timeParserDbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) throw err;
  });
  let column = arg[1];
  let setVal = arg[2];
  let settingName = arg[0];
  if (settingName === 'save-location') {
    if (column === 'details' ) csvSavePath = ['Desktop', 'Downloads', 'Documents'].includes(setVal) ? setVal.toLowerCase() : setVal;
    if (column === 'enabled' && setVal === 0) csvSavePath = 'downloads';
  } 
  // console.log(arg);
  db.serialize(() => {
    if (column === 'enabled') db.run('UPDATE AppSettings SET enabled = ? WHERE name = ?', [setVal, settingName]);
    if (column === 'details') db.run('UPDATE AppSettings SET details = ? WHERE name = ?', [setVal, settingName]);
    if (settingName === 'save-location' && column === 'enabled' && setVal === 1) {
      db.get('SELECT details FROM AppSettings WHERE name = ?', [settingName], (err, row) => {
        csvSavePath = ['Desktop', 'Downloads', 'Documents'].includes(row.details) ? row.details.toLowerCase() : row.details;
      });
    }
    db.close();
  })
}

const setUpAppSettings = (e) => {
  let db = new sqlite3.Database(timeParserDbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) e.reply('config', err.message);
  });
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS AppSettings (
    name TEXT PRIMARY KEY, 
    enabled INTEGER DEFAULT 1, 
    details TEXT DEFAULT NULL, 
    UNIQUE(name)
    ) WITHOUT ROWID`);
    let sql = 'INSERT OR IGNORE INTO AppSettings (name, enabled, details) VALUES (?, ?, ?) ';
    let insert = db.prepare(sql);
    let settings = [
      { 'name': 'dark-mode', 'details': '' },
      { 'name': 'auto-tagging', 'details': '' },
      {
        'name': 'row-count',
        'details': `[
          {"global": 1, "table":"", "count": 10},
          {"global" : 0, "table": "record", "count": 10},
          {"global" : 0, "table": "tag", "count": 10},
          {"global" : 0, "table": "zoom", "count": 10},
          {"global" : 0, "table": "top-tags", "count": 20}
        ]`
      },
      { 'name': 'save-location', 'details': 'Downloads' },
      { 'name': 'zoom-level', 'details': 0 }
    ];
    settings.forEach(setting => {
      s = [setting.name, 1, setting.details];
      insert.run(s, err => {
        if (err) throw err;
      });
    });
    insert.finalize();
    let appSettings = [];
    db.each('SELECT * FROM AppSettings', [], (err, row) => {
      appSettings.push(row);
    }, () => {
      csvSavePath = 'downloads';
      e.reply('config', appSettings);
      db.close(err => {
        if (err) console.log(err)
      });
    });
  });
};

function createWindow() {
  let mainWindow = new BrowserWindow({
    width: 1400,
    height: 740,
    frame: false,
    backgroundColor: '#3a3a3a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  ipcMain.once('check-prod', (e, arg) => {
    e.reply('is-prod', app.isPackaged)
  });

  ipcMain.on('startup', (e, arg) => {
    setUpAppSettings(e);
  });

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
            updateSettings(['zoom-level', 'details', mainWindow.webContents.getZoomLevel()]);
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click() {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - .2);
            updateSettings(['zoom-level', 'details', mainWindow.webContents.getZoomLevel()]);
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

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
    const contextmenu = require('electron-context-menu');
    contextmenu({});
  }

  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    console.log('attempting to download');
    ['desktop', 'downloads', 'documents'].includes(csvSavePath) ? item.setSavePath(path.join(app.getPath(csvSavePath), item.getFilename())) : item.setSavePath(path.join(csvSavePath, item.getFilename()));
    console.log(fs.existsSync(item.getSavePath()));
    if (fs.existsSync(item.getSavePath())) {
      var exist = true;
      while (exist) {
        let copyNumber = item.getSavePath().indexOf('(') >= 0 ? parseInt(item.getSavePath().split('(')[1].split(')')[0]) : 0;
        copyNumber++;
        ['desktop', 'downloads', 'documents'].includes(csvSavePath) ? item.setSavePath(path.join(app.getPath(csvSavePath), item.getFilename().replace(/.csv/, '') + `(${copyNumber}).csv`)) : item.setSavePath(path.join(csvSavePath, item.getFilename().replace(/.csv/, '') + `(${copyNumber}).csv`));
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

ipcMain.on('toRead', (e, arg) => {
  fs.readFile(arg, 'utf8', (error, data) => {
    if (error) throw error;
    e.reply('fromRead', data);
  });
});

ipcMain.on('write-csv', (event, arg) => {
  fs.mkdir(path.join(app.getPath('temp'), 'Time Parser'), { recursive: true }, (err, directory) => {
    let writeStream = fs.createWriteStream(path.join(app.getPath('temp'), 'Time Parser', 'time.csv'), 'utf8');
    writeStream.write(arg);
    let res = ['write complete', path.join(app.getPath('temp'), 'Time Parser', 'time.csv'), app.getPath('userData')];
    writeStream.on('error', (err) => {
      res = err;
    })
    writeStream.end();
    event.reply('return-csv', res);
  });
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

ipcMain.on('set-zoom-level', (event, arg) => BrowserWindow.getFocusedWindow().webContents.setZoomLevel(JSON.parse(arg)));
ipcMain.on('get-zoom-level', (event, arg) => event.reply('return-zoom-level', BrowserWindow.getFocusedWindow().webContents.getZoomLevel()));
ipcMain.on('update-setting', (event, arg) => updateSettings(arg));
ipcMain.on('restore-default-settings', (e, arg) => {
  let db = new sqlite3.Database(timeParserDbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) throw err;
  });
  db.run('DELETE FROM AppSettings');
  BrowserWindow.getFocusedWindow().webContents.setZoomLevel(0);
  setUpAppSettings(e);
})