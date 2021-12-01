const { Chart } = require('chart.js');
const { contextBridge, ipcRenderer, ipcMain, BrowserWindow, app } = require('electron');

let chartTop, chartLeft, chartSize = .3;
let chartVisible = true;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  "api", {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ["toRead", "createChart", "write-csv", "askForDates", 'retrieve-events-by-date','title-bar-interaction','initial-zoom','get-zoom-level'];
    if (channel === "createChart" && chartVisible) {
      const createChart = () => {
        if (document.getElementById('app-chart')) document.getElementById('app-chart').remove();
        let chart = document.createElement('canvas');
        chart.id = 'app-chart';
        chart.width = '400';
        chart.height = '400';
        chart.style.top = chartTop || '32px';//'-30%';
        chart.style.left = chartLeft || '-100px';//'20%';
        chart.style.transform = `scale(${chartSize})` || `scale(.3)`;
        chart.addEventListener('mousemove', (e) => {
          var clickX, clickY, dragX, dragY;
          chart.style.cursor = e.ctrlKey ? 'nesw-resize' : 'move';
          // chart.style.border = '15px solid darkgray';
          // chart.style.borderRadius = '50%';

          // Make Chart Draggable
          chart.addEventListener('mousedown', (e) => {
            e = e || window.event;
            e.preventDefault();
            e.stopImmediatePropagation();
            clickX = e.clientX;
            clickY = e.clientY;
            document.addEventListener('mousemove', calcObjectLoc)
          });
          const resizeObect = (e) => {
            e = e || window.event;
            e.preventDefault();
            let gbc = chart.getBoundingClientRect();
            let midX = gbc.left + (gbc.width / 2);
            let midY = gbc.top + (gbc.height / 2);
            // console.log('midX', midX, 'midY', midY)
            // console.log('left', gbc.left,'top', gbc.top);
            // console.log('width', gbc.width,'height', gbc.height);
            dragX = clickX - e.clientX;
            dragY = clickY - e.clientY;
            clickX = e.clientX;
            clickY = e.clientY;
            // console.log(chartSize)
            let growShrink, gsX, gsY;
            if (clickX < midX) {
              if (clickY < midY) gsY = dragY < 0 ? -1 : 1;
              if (clickY > midY) gsY = dragY > 0 ? -1 : 1;
              gsX *= dragX > 0 ? -1 : 1;
            }
            if (clickX > midX) {
              if (clickY < midY) gsY = dragY < 0 ? -1 : 1;
              if (clickY > midY) gsY = dragY > 0 ? -1 : 1;
              gsX *= dragX > 0 ? -1 : 1;
            }
            growShrink = gsX < 0 || gsY < 0 ? -1 : 1;
            chartSize = chartSize + (growShrink * (Math.sqrt(dragX ** 2 + dragY ** 2) / chart.offsetHeight));
            chart.style.transform = `scale(${chartSize})`;
          }
          const calcObjectLoc = (e) => {
            e = e || window.event;
            e.preventDefault();
            if (e.ctrlKey) {
              resizeObect(e);
            }
            else {
              dragX = clickX - e.clientX;
              dragY = clickY - e.clientY;
              clickX = e.clientX;
              clickY = e.clientY;
              chartTop = (chart.offsetTop - dragY) + 'px';
              chartLeft = (chart.offsetLeft - dragX) + 'px';
              chart.style.top = chartTop;
              chart.style.left = chartLeft;
            }
          }
          document.addEventListener('mouseup', (e) => {
            document.removeEventListener('mouseup', calcObjectLoc)
            document.removeEventListener('mousemove', calcObjectLoc)
          });
        });
        document.body.appendChild(chart);
        let chartInstance = new Chart(document.getElementById('app-chart').getContext('2d'), data);
        chart.addEventListener('click', (e) => {
          let activePoints = chartInstance.getElementsAtEventForMode(e, 'point', chartInstance.options);
          let firstPoint = activePoints[0];
          if (firstPoint) {
            let label = chartInstance.data.labels[firstPoint.index];
            // console.log(label);
          }
        })
        return chartInstance;
      }
      createChart();
    }
    else if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['fromRead', 'return-csv', 'returnDates', 'return-events-by-date', 'toggle-maximize','return-zoom-level','is-prod'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
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
});