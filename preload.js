const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  "api", {
  send: (channel, data) => {
    let validChannels = [
      "toRead", 
      "write-csv", 
      "askForDates", 
      'retrieve-events-by-date',
      'title-bar-interaction',
      'initial-zoom',
      'get-zoom-level',
      'update-setting',
      'get-setting-details'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = [
      'fromRead', 
      'return-csv', 
      'returnDates', 
      'return-events-by-date', 
      'toggle-maximize',
      'return-zoom-level',
      'is-prod', 
      'config',
      'return-setting-details'
    ];
    if (validChannels.includes(channel)) {
      if (channel === 'return-events-by-date') {
        ipcRenderer.once(channel, (event, ...args) => {
          return func(args)
        })
      }
      else ipcRenderer.once(channel, (event, ...args) => func(args));
    }
  }
}
);

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }
  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
  ipcRenderer.send('check-prod','check');
  ipcRenderer.send('startup','start');
});