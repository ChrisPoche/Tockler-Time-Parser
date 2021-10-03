const { app, BrowserWindow, ipcMain } = require('electron')
const contextMenu = require('electron-context-menu');
const path = require('path');
const fs = require('fs');


function createWindow() {
  let mainWindow = new BrowserWindow({
    width: 1400,//800,
    height: 740,//600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('./src/index.html');

  mainWindow.webContents.openDevTools();

  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    console.log('attempting to download');
    item.setSavePath(app.getPath("desktop") + "/" + item.getFilename());
    
    console.log(fs.existsSync(item.getSavePath()));
    if(fs.existsSync(item.getSavePath())) {
      var exist = true;
      while(exist) {
        let copyNumber = item.getSavePath().indexOf('(') >= 0 ? parseInt(item.getSavePath().split('(')[1].split(')')[0]) : 0;
        copyNumber++;
        item.setSavePath(app.getPath("desktop") + "/" + item.getFilename().replace(/.csv/,'') + `(${copyNumber}).csv`); 
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
  let writeStream = fs.createWriteStream('time.csv','utf8');
  writeStream.write(arg);
  let res = 'write complete';
  writeStream.on('error', (err) => {
    res = err;
  })
  writeStream.end();
  event.reply('return-csv', res);
})