let dataLoaded = false;
let refreshedApps = false;
let removedApps = [];
let globalRecords = [];
let chartIncludeRemoved = true;
let tableTab = document.createElement('div');
let filterTitle = '';
let editMode = false;
// let showCount = 10, goToPage = 1, pageCount = 1;
// let showCountTags = 10, goToPageTags = 1, pageCountTags = 1;
// let showCountZoom = 10, goToPageZoom = 1, pageCountZoom = 1;
// let sortByHeader = {
//     app: '',
//     title: '',
//     start: '',
//     end: '',
//     duration: '',
// }
// let sortByHeaderTags = {
//     app: '',
//     title: '',
//     duration: '',
// }
// let tableTop, tableLeft, tagTableTop, tagTableLeft, zoomTableTop, zoomTableLeft;
// let filterBoxRechecked = false;
// let visibleRecords, tagVisibleRecords, zoomVisibleRecords;
let tags = [];
let dWR = []; // Days With Records
let dragTag, dropTag;
let filteredRecords = [], tagID, zoomTags = []; // Global table trackers


let table = ['record', 'tag', 'zoom'].reduce((prev, t) => ({ ...prev, [`${t}-show`]: 10, [`${t}-go-to-page`]: 1, [`${t}-page-count`]: 1, [`${t}-top`]: '', [`${t}-left`]: '' }), {});
let sortByHeader = {
    'record': {
        'app': '',
        'title': '',
        'start': '',
        'end': '',
        'duration': ''
    },
    'tag': {
        'app': '',
        'title': '',
        'duration': ''
    },
    'zoom': {
        'tags': '',
        'duration': '',
        'start': '',
        'end': ''
    }
}
let visibleRecords = {
    'record': [],
    'tag': [],
    'zoom': []
};



const dateInputHandler = (e) => {
    // console.log(e.type);
    if (e.type === 'blur') {
        if (dWR.includes(e.target.value)) {
            grabRecordsFromDatePicker(e.target.value)
        };
    }
    if (e.type === 'keyup') {
        if (e.key === 'Enter') {
            document.getElementById('date-input').blur();
        }
    }
}


window.addEventListener('load', () => {
    createTitlebar();
    createDragAndDropArea();
    let dateInput = document.getElementById('date-input');
    window.api.send('askForDates', 'no-options');
    window.api.receive('returnDates', (dates) => {
        dWR = dates[0];
        dateInput.min = dWR[0];
        dateInput.max = dWR[dWR.length - 1];
        dateInput.value = dWR[dWR.length - 1];
    });
    dateInput.addEventListener('blur', dateInputHandler);
    dateInput.addEventListener('keyup', dateInputHandler);
    dateInput.addEventListener('change', (e) => {
        if (!dWR.includes(e.target.value)) {
            dateInput.style.color = 'red';
            dateInput.style.fontWeight = '900';
        }
        else {
            dateInput.style.removeProperty('color');
            dateInput.style.removeProperty('font-weight');
        }
    });
    document.getElementById('csv-input').addEventListener('change', (e) => {
        if (document.getElementById('container').childElementCount > 1) document.getElementById('error-invalid').remove();
        files = e.target.files
        parseFile(files);
    })
    document.getElementById('upload-file').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('csv-input').click();
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === 'e' && !dataLoaded && !e.ctrlKey) {
            document.getElementById('csv-input').click();
        }
        if (e.key === 'e' && e.ctrlKey && dataLoaded) {
            editMode = !editMode;
            // console.log('Edit Mode:', editMode);
            toggleCloseButtons();
        }
        if (((e.key === '-' && e.ctrlKey) || (e.key === '=' && e.ctrlKey)) && document.getElementById('record-table')) {
            // console.log('resize font');
            resizeTableColumns();
        }
        if ((e.key === 'd' && e.ctrlKey) && document.getElementById('record-table')) {
            downloadCSV();
        }
        if ((e.key === 'f' && e.ctrlKey)) {
            document.getElementById('titlebar').style.visibility.length > 0 ? document.getElementById('titlebar').style.removeProperty('visibility') : document.getElementById('titlebar').style.visibility = 'hidden';
        }
        if (e.key === 'M' && e.ctrlKey && e.shiftKey) {
            let id = document.getElementById('window-controls').classList.length > 0 ? 'restore-button' : 'max-button';
            titleBarInteraction(id);
        }
    });
    document.getElementById('window-controls').addEventListener('click', (e) => {
        let id = e.target.id ? e.target.id : e.target.parentNode.id;
        titleBarInteraction(id);
    });
});
const createTitlebar = () => {
    let header = document.createElement('header');
    header.id = 'titlebar';
    let dragRegion = document.createElement('div');
    dragRegion.id = 'drag-region';
    header.appendChild(dragRegion);
    let windowTitle = document.createElement('div');
    windowTitle.id = 'window-title';
    let img = document.createElement('img');
    img.id = 'icon';
    img.src = '../assets/icons/win/icon.png';
    img.alt = 'icon';
    windowTitle.appendChild(img);
    let span = document.createElement('span');
    span.innerText = 'Time Parser';
    windowTitle.appendChild(span);
    let windowControls = document.createElement('div');
    ['min-button', 'max-button', 'restore-button', 'close-button'].forEach(id => {
        let button = document.createElement('div');
        button.id = id;
        button.classList = 'button';
        let type = id.split('-')[0];
        let icon = document.createElement('img');
        icon.classList = 'icon';
        icon.srcset = `icons/${type}-k-10.png 1x, icons/${type}-k-12.png 1.25x, icons/${type}-k-15.png 1.5x, icons/${type}-k-15.png 1.75x, icons/${type}-k-20.png 2x, icons/${type}-k-20.png 2.25x, icons/${type}-k-24.png 2.5x, icons/${type}-k-30.png 3x, icons/${type}-k-30.png 3.5x`
        icon.draggable = false;
        button.appendChild(icon);
        windowControls.appendChild(button);
    })
    windowControls.id = 'window-controls';
    dragRegion.appendChild(windowTitle);
    dragRegion.appendChild(windowControls);
    document.body.prepend(header);
}


const titleBarInteraction = (id) => {
    window.api.send('title-bar-interaction', id);
    window.api.receive('toggle-maximize', (arr) => {
        if (arr[0]) {
            document.getElementById('window-controls').classList.add('maximized');
        } else {
            document.getElementById('window-controls').classList.remove('maximized');
        }
    })
}


const grabRecordsFromDatePicker = (date) => {
    document.getElementById('date-input').classList = 'data-loaded';
    window.api.send('retrieve-events-by-date', date);
    window.api.receive('return-events-by-date', (arr) => {
        removedApps = [];
        if (document.getElementById('instructions')) document.getElementById('instructions').remove();
        if (document.getElementById('csv-input')) document.getElementById('csv-input').remove();
        let records = arr[0].map((r, id) => {
            let dur = (r.end - r.start) / 1000;
            let mm = ((Math.floor(dur / 60) < 10) ? ("0" + Math.floor(dur / 60)) : Math.floor(dur / 60));
            let ss = ((Math.floor(dur % 60) < 10) ? ("0" + Math.floor(dur % 60)) : Math.floor(dur % 60));

            return {
                id,
                'checked': true,
                'app': cleanUpAppName(r.app),
                'title': r.title.replace(/"/g, '').replace(/●/g, '').replace(/\%2f?F?/g, '/').trim(),
                'start': new Date(new Date(r.start).getTime() - new Date(r.start).getTimezoneOffset() * 60000).toISOString().replace('T', ' ').split('.')[0],
                'end': new Date(new Date(r.end).getTime() - new Date(r.end).getTimezoneOffset() * 60000).toISOString().replace('T', ' ').split('.')[0],
                dur,
                'duration': `${mm}:${ss}`,
                tags: []
            }

        });
        tags = [];
        if (document.getElementById('tag-section')) document.getElementById('tag-section').remove();
        zoomTags = [];
        if (document.getElementById('zoom-section')) document.getElementById('zoom-section').remove();
        filteredRecords = [];
        postDataRetrieval(records);
    });
};

const toggleCloseButtons = () => {
    ['app-chart', 'record-section'].forEach((id) => {
        if (editMode) {
            // console.log("Edit Mode:",document.getElementById(id));
            if (document.getElementById(id).style.visibility !== 'hidden') {
                // console.log(id);
                let element = document.getElementById(id);
                let gbcr = element.getBoundingClientRect();
                let closeX = id === 'app-chart' ? gbcr.left + (gbcr.width * .875) : gbcr.left + gbcr.width + 2;
                let closeY = id === 'app-chart' ? gbcr.top + (gbcr.top * .15) : gbcr.top - 30;
                let closeButton = document.createElement('div');
                closeButton.id = `close-${id}`;
                closeButton.innerText = 'X';
                closeButton.classList = 'close-button'
                closeButton.style.left = closeX + 'px';
                closeButton.style.top = closeY + 'px';
                closeButton.addEventListener('click', () => {
                    console.log('Minimizing:', id);
                    element.style.visibility = 'hidden';
                    closeButton.remove();
                })
                document.body.appendChild(closeButton);
            };
        }
        else if (!editMode) {
            if (document.getElementById(id).style.visibility !== 'hidden') {
                document.getElementById(`close-${id}`).remove();
            }
        }
    })
};

const aggregateRecords = () => {
    if (document.getElementsByClassName('close-button')[0] && document.getElementsByClassName('close-button')[0].id !== 'close-tag-section') document.getElementsByClassName('close-button')[0].remove();
    let apps = [...new Set(globalRecords.filter(r => r.checked && !removedApps.includes(r.app)).map(r => r.app))].sort();
    let appAgg = [];
    apps.forEach((app, index) => {
        let dur = globalRecords.filter(r => r.app === app && r.checked).map(r => r.dur).reduce((a, b) => a + b);
        let hh = ((Math.floor(dur / 3600) < 10) ? ("0" + Math.floor(dur / 3600)) : Math.floor(dur / 3600));
        let mm = ((Math.floor(dur % 3600 / 60) < 10) ? ("0" + Math.floor(dur % 3600 / 60)) : Math.floor(dur % 3600 / 60));
        let ss = ((Math.floor(dur % 3600 % 60) < 10) ? ("0" + Math.floor(dur % 3600 % 60)) : Math.floor(dur % 3600 % 60));
        let duration = `${hh}:${mm}:${ss}`;
        appAgg.push({ app, dur, duration });
        if (index === (apps.length - 1) && removedApps.length > 0 && chartIncludeRemoved) {
            dur = globalRecords.filter(r => removedApps.includes(r.app)).map(r => r.dur).reduce((a, b) => a + b);
            hh = ((Math.floor(dur / 3600) < 10) ? ("0" + Math.floor(dur / 3600)) : Math.floor(dur / 3600));
            mm = ((Math.floor(dur % 3600 / 60) < 10) ? ("0" + Math.floor(dur % 3600 / 60)) : Math.floor(dur % 3600 / 60));
            ss = ((Math.floor(dur % 3600 % 60) < 10) ? ("0" + Math.floor(dur % 3600 % 60)) : Math.floor(dur % 3600 % 60));
            duration = `${hh}:${mm}:${ss}`;
            appAgg.push({ app: '[Redacted]', dur, duration });
            apps.push('[Redacted]');
        }
    });
    let opt = {
        type: 'doughnut',
        data: {
            labels: apps,
            datasets: [{
                data: appAgg.map(a => a.dur / 3600),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.4)',
                    'rgba(54, 162, 235, 0.4)',
                    'rgba(255, 206, 86, 0.4)',
                    'rgba(75, 192, 192, 0.4)',
                    'rgba(153, 102, 255, 0.4)',
                    'rgba(255, 159, 64, 0.4)'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            animation: false,
            plugins: {
                tooltip: {
                    usePointStyle: true,
                    bodyFont: {
                        size: 30,
                    },
                    bodyAlign: 'right',
                    padding: 12,
                    boxWidth: 50
                },
                legend: {
                    display: false
                }
            }
        }
    };
    window.api.send('createChart', opt);

    let appChart = document.getElementById('app-chart');
    appChart.addEventListener('dblclick', (e) => {
        chartIncludeRemoved = !chartIncludeRemoved;
        aggregateRecords();
    });

    let all = globalRecords.map(r => r.dur).reduce((a, b) => a + b);
    let active = globalRecords.filter(r => !removedApps.includes(r.app) && r.checked).map(r => r.dur);
    active = active.length > 0 ? active.reduce((a, b) => a + b) : 0;
    let tag = globalRecords.filter(r => !removedApps.includes(r.app) && r.checked && r.tags.includes(parseInt(tagID))).map(r => r.dur);
    tag = tag.length > 0 ? tag.reduce((a, b) => a + b) : 0;
    let durationVals = [active, all, tag].map(dur => {
        let hh = ((Math.floor(dur / 3600) < 10) ? ("0" + Math.floor(dur / 3600)) : Math.floor(dur / 3600));
        let mm = ((Math.floor(dur % 3600 / 60) < 10) ? ("0" + Math.floor(dur % 3600 / 60)) : Math.floor(dur % 3600 / 60));
        let ss = ((Math.floor(dur % 3600 % 60) < 10) ? ("0" + Math.floor(dur % 3600 % 60)) : Math.floor(dur % 3600 % 60));
        return `${hh}:${mm}:${ss}`;
    });

    let tagDur = document.getElementById('tag-section') ? `&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;${tags.filter(tag => tag.id === parseInt(tagID)).map(tag => tag.name)[0]}: ${durationVals[2]}` : '';
    let durationDiv = document.getElementById('duration');
    durationDiv.innerHTML = chartIncludeRemoved ? `Duration (hh:mm:ss): ${durationVals[0]} / ${durationVals[1]}` + tagDur : `Duration (hh:mm:ss): ${durationVals[0]}` + tagDur;
}

const parseFile = (files) => {
    // //console.log(files);
    document.getElementById('date-input').classList = 'data-loaded';
    window.api.send('toRead', files[0].path);
    window.api.receive('fromRead', (str) => {
        let csv = str[0];
        let arr = csv.split('\n')
        if (arr[0] !== 'App;Type;Title;Begin;End') {
            let err = document.createElement('p');
            err.id = 'error-invalid';
            err.classList = 'error'
            err.innerText = 'Invalid file uploaded. Please select a Tockler CSV.';
            document.getElementById('container').appendChild(err);
        }
        else {
            removedApps = [];
            document.getElementById('instructions').remove();
            document.getElementById('csv-input').remove();
            // //console.log(arr);
            if (arr[arr.length - 1].trim().length < 1) arr.pop();
            arr.shift();
            let records = arr.map((r, id) => {
                let rec = r.split(';');
                let dur = (Date.parse(rec[4]) - Date.parse(rec[3])) / 1000;
                let mm = ((Math.floor(dur / 60) < 10) ? ("0" + Math.floor(dur / 60)) : Math.floor(dur / 60));
                let ss = ((Math.floor(dur % 60) < 10) ? ("0" + Math.floor(dur % 60)) : Math.floor(dur % 60));
                return {
                    id,
                    'checked': true,
                    'app': cleanUpAppName(rec[0]),
                    'title': rec[2].replace(/"/g, '').replace(/●/g, '').replace(/\%2f?F?/g, '/').trim(),
                    'start': rec[3],
                    'end': rec[4],
                    dur,
                    'duration': `${mm}:${ss}`,
                    tags: []
                }
            });
            postDataRetrieval(records);
        }
    })
};

const addTagsToZoomMeetings = (zoomOrigin, row) => {
    // console.log(row.id, 'Zoom Origin', zoomOrigin)
    zoomTags[zoomTags.length - 1].end = row.id;
    let title = `Zoom from: ${zoomOrigin.app}`;
    if (zoomOrigin.tags.length > 0) zoomOrigin.tags.forEach(t => row.tags.push(t));
    if (zoomOrigin.tags.length === 0) {
        let title = zoomOrigin.app === 'Slack' ? `${zoomOrigin.title.split('|')[0].trim()} - ${zoomOrigin.title.split('|')[1].trim()}` : zoomOrigin.title
        if (tags.filter(tag => tag.name === title).length === 0) createNewTag(title, row.tags, row.id)
        else {
            globalRecords[row.id].tags.push(tags.filter(tag => tag.name === title)[0].id);
            // if (visibleRecords.includes(row.id)) drawTag(globalRecords[row.id].tags, 'record-' + row.id);
            if (visibleRecords['record'].includes(row.id)) drawTag(globalRecords[row.id].tags, 'record-' + row.id);
        }
    }
    if (tags.filter(tag => tag.name === title).length === 0) createNewTag(title, row.tags, row.id)
    if (tags.filter(tag => tag.name === title).length > 0 && !globalRecords[row.id].tags.includes(tags.filter(tag => tag.name === title)[0].id)) {
        globalRecords[row.id].tags.push(tags.filter(tag => tag.name === title)[0].id);
        // if (visibleRecords.includes(row.id)) drawTag(globalRecords[row.id].tags, 'record-' + row.id);
        if (visibleRecords['record'].includes(row.id)) drawTag(globalRecords[row.id].tags, 'record-' + row.id);
    }
}

const modifySort = (e, type) => {
    let val = e.target.id.includes('zoom-tl-th') ? 'tags' : e.target.id.split('-')[2];
    if (val !== 'bar' && val) {
        sortByHeader[type][val] = sortByHeader[type][val] === '' ? 'asc' : sortByHeader[type][val] === 'asc' ? 'desc' : '';
        table[`${type}-go-to-page`] = 1;
        filteredRecords = filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords;
        createTable(type);
    }
}

const createTable = (type) => {
    if (!document.getElementById(`${type}-section`)) {
        let section = document.createElement('div');
        section.id = `${type}-section`;
        document.getElementById('container').appendChild(section);
    }
    let results;
    if (type === 'record') results = filteredRecords.filter(r => !removedApps.includes(r.app));
    if (type === 'tag') results = globalRecords.filter(r => r.tags.includes(parseInt(tagID)));
    if (type === 'zoom') results = zoomTags;
    if (results.length > 0) {
        table[`${type}-page-count`] = results.length === 0 ? 1 : Math.ceil(results.length / table[`${type}-show`])
        table[`${type}-go-to-page`] = table[`${type}-go-to-page`] > table[`${type}-page-count`] ? table[`${type}-page-count`] : table[`${type}-go-to-page`];
        if (document.getElementById(`${type}-go-to-page`)) document.getElementById(`${type}-go-to-page`).value = table[`${type}-go-to-page`];
        if (document.getElementById(`${type}-go-to-page`)) document.getElementById(`${type}-go-to-page`).max = table[`${type}-page-count`];
        if (document.getElementById(`${type}-page-numbering`)) document.getElementById(`${type}-page-numbering`).innerText = `Page ${table[`${type}-go-to-page`]} of ${table[`${type}-page-count`]}`;
        if (document.getElementsByClassName(`${type}-page-arrows`).length > 0) {
            [...document.getElementsByClassName('left')].forEach(arrow => {
                // arrow.style.color = goToPage === 1 ? 'gray' : 'black';
                arrow.style.color = table[`${type}-go-to-page`] === 1 ? 'gray' : 'black';
            });
            [...document.getElementsByClassName('right')].forEach(arrow => {
                // arrow.style.color = goToPage === pageCount ? 'gray' : 'black';
                arrow.style.color = table[`${type}-go-to-page`] === table[`${type}-page-count`] ? 'gray' : 'black';
            });
            if (document.getElementsByClassName(`${type}-page-arrows`).length > 0) {
                [...document.getElementsByClassName('left')].forEach(arrow => {
                    // arrow.style.color = goToPage === 1 ? 'gray' : 'black';
                    arrow.style.color = table[`${type}-go-to-page`] === 1 ? 'gray' : 'black';
                });
                [...document.getElementsByClassName('right')].forEach(arrow => {
                    // arrow.style.color = goToPage === pageCount ? 'gray' : 'black';
                    arrow.style.color = table[`${type}-go-to-page`] === table[`${type}-page-count`] ? 'gray' : 'black';
                });
            }
        }
        let section = document.getElementById(`${type}-section`);
        section.style.position = 'absolute';
        let top = {
            'record': 'calc(5vh + 3em)',
            'tag': 'calc(41vh + 3em)',
            'zoom': 'calc(41vh + 3em)'
        };
        let left = {
            'record': '300px',
            'tag': '300px',
            'zoom': '800px'
        };
        section.style.top = table[`${type}-top`] || top[type];
        section.style.left = table[`${type}-left`] || left[type];
        let tableTag = document.createElement('table');
        tableTag.id = `${type}-table`
        let thead = document.createElement('thead');
        let hr = document.createElement('tr');
        hr.id = `${type}-table-header`;
        let header = {
            // 'record': [`${type}-tl-th`, ...Object.keys(sortByHeader['record'])],
            // 'tag': [`${type}-tl-th`, ...Object.keys(sortByHeader['tag'])],
            // 'zoom': [...Object.keys(sortByHeader['zoom'])]
            'record': [`${type}-tl-th`, 'app', 'title', 'start', 'end', 'duration', 'tags'],
            'tag': [`${type}-tl-th`, 'app', 'title', 'duration', 'tags'],
            'zoom': ['tags', 'duration', 'start', 'end']
        };
        header[type].forEach((h, index) => {
            let th = document.createElement('th');
            th.innerHTML = `${h}<span>${sortByHeader[type][h] === 'asc' ? ' &#129041;' : sortByHeader[type][h] === 'desc' ? ' &#129043;' : ''}</span>`;
            th.id = `${type}-header-${h}`;
            th.classList = 'header';
            th.addEventListener('click', (e) => modifySort(e, type));
            if (index === header[type].length - 2 || (index === header[type].length - 1 && type === 'zoom')) { // Close Button Tag and Zoom
                let closeButton = document.createElement('div');
                closeButton.id = `close-${type}-section`;
                closeButton.innerText = 'X';
                closeButton.classList = `close-button close-section`;
                closeButton.style.removeProperty('left');
                closeButton.addEventListener('click', (e) => {
                    e.stopImmediatePropagation();
                    document.getElementById(`${type}-section`).remove();
                    aggregateRecords();
                });
                th.appendChild(closeButton);
            }
            if (index === 0) {
                th.id = `${type}-tl-th`;
                th.classList = 'header';
                th.innerHTML = type === 'zoom' ? `tags<span>${sortByHeader[type][h] === 'asc' ? ' &#129041;' : sortByHeader[type][h] === 'desc' ? ' &#129043;' : ''}</span>` : '';
                th.style.cursor = 'move';
                // Make table draggable
                var clickX, clickY, dragX, dragY;
                section.addEventListener('mousedown', (e) => {
                    if (e.target.id === `${type}-tl-th`) {
                        e = e || window.event;
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        clickX = e.clientX;
                        clickY = e.clientY;
                        document.addEventListener('mousemove', calcTableLoc)
                    }
                });
                const calcTableLoc = (e) => {
                    e = e || window.event;
                    e.preventDefault();
                    dragX = clickX - e.clientX;
                    dragY = clickY - e.clientY;
                    clickX = e.clientX;
                    clickY = e.clientY;
                    // tableTop = (recordSection.offsetTop - dragY) + 'px';
                    table[`${type}-top`] = (section.offsetTop - dragY) + 'px';
                    // tableLeft = (recordSection.offsetLeft - dragX) + 'px';
                    table[`${type}-left`] = (section.offsetLeft - dragX) + 'px';
                    // recordSection.style.top = tableTop;
                    section.style.top = table[`${type}-top`];
                    // recordSection.style.left = tableLeft;
                    section.style.left = table[`${type}-left`];
                }
                section.addEventListener('mouseup', (e) => {
                    document.removeEventListener('mousemove', calcTableLoc);
                    section.removeEventListener('mouseup', calcTableLoc);
                    let maxHeight;
                    if (table[`${type}-top`]) maxHeight = window.innerHeight - parseInt(table[`${type}-top`].replace('px', '')) - (window.innerHeight * .05)
                    section.style.maxHeight = maxHeight + 'px';
                });
            }
            hr.appendChild(th);
            if (type === 'record' && h === 'title') {
                let input = document.createElement('input');
                input.id = 'title-search-bar';
                input.value = filterTitle || '';
                input.addEventListener('change', (e) => {
                    filterTitle = e.target.value;
                    let relatedTags = tags.filter(t => t.name.toLowerCase().includes(filterTitle.toLowerCase())).map(t => t.id);
                    filteredRecords = filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase()) || r.tags.some(t => relatedTags.includes(t))) : globalRecords;
                    createTable('record');
                    document.getElementById(`${type}-go-to-page`).max = table[`${type}-page-count`];
                })
                th.appendChild(input);
            }
        });
        thead.appendChild(hr);
        tableTag.appendChild(thead);
        let tbody = document.createElement('tbody');
        Object.keys(sortByHeader[type]).forEach(key => {
            if (sortByHeader[type][key].length > 0) results = sortByHeader[type][key] === 'asc' ? results.sort((a, b) => a[key] > b[key] ? 1 : -1) : results.sort((a, b) => a[key] < b[key] ? 1 : -1);
        });
        visibleRecords[type] = [];
        for (let i = (table[`${type}-go-to-page`] - 1) * table[`${type}-show`]; i < (table[`${type}-go-to-page`] * table[`${type}-show`]) - (table[`${type}-go-to-page`] === table[`${type}-page-count`] ? table[`${type}-show`] - (results.length % table[`${type}-show`]) : 0); i++) {
            let tr = document.createElement('tr');
            tr.id = `${type}-${results[i][type === 'zoom' ? 'start' : 'id']}`;
            visibleRecords[type].push(results[i][type === 'zoom' ? 'start' : 'id']);
            tr.classList = `${type}-row`;
            if (type !== 'zoom') { // Checkboxes / Record and Tag
                let firstCol = document.createElement('td');
                firstCol.classList = 'check-col';
                let checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = results[i].checked;
                checkbox.id = `check-${type}-${results[i].id}`;
                checkbox.addEventListener('change', (e) => {
                    e.stopImmediatePropagation();
                    let id = e.target.id.substring(`check-${type}-`.length);
                    globalRecords[id].checked = e.target.checked;
                    aggregateRecords();
                });
                tr.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'INPUT') {
                        if (![...e.target.classList][0].includes('tag')) {
                            let id = [...e.target.classList][0].includes('tool') ? e.target.parentElement.parentElement.id.substring(`${type}-`.length) : e.target.parentElement.id.substring(`${type}-`.length);
                            let cb = document.getElementById(`check-${type}-${id}`);
                            globalRecords[id].checked = !cb.checked;
                            if (document.querySelector(`#check-${type === 'record' ? 'tag' : 'record'}-${id}`)) document.querySelector(`#check-${type === 'record' ? 'tag' : 'record'}-${id}`).checked = !cb.checked;
                            cb.checked = !cb.checked;
                            ['tag-table', 'record-table'].forEach(tbl => {
                                if (document.getElementById(tbl)) {
                                    let selectAllVisibleID = `select-all-visible-${type}`;
                                    let visibleCount = [...document.getElementById(tbl).querySelectorAll('tr')].length - 1;
                                    let selectAllVisible = document.getElementById(selectAllVisibleID);
                                    let visibleChecked = [...document.getElementById(tbl).querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== selectAllVisibleID).length;
                                    if (visibleChecked === visibleCount) {
                                        selectAllVisible.checked = true;
                                        selectAllVisible.indeterminate = false;
                                    }
                                    if (visibleChecked < visibleCount) {
                                        selectAllVisible.checked = false;
                                        selectAllVisible.indeterminate = true;
                                        if (visibleChecked === 0) {
                                            selectAllVisible.checked = false;
                                            selectAllVisible.indeterminate = false;
                                        }
                                    }
                                }
                            })
                            aggregateRecords();
                        }
                    }
                });
                firstCol.appendChild(checkbox);
                tr.appendChild(firstCol);
                let row = [];
                header[type].forEach((col, index) => index > 0 && results.length > 0 ? row.push(results[i][col]) : row.push(''));
                row.shift(); // may need to remove this
                row.map((val, index) => {
                    let td = document.createElement('td');
                    td.innerText = val;
                    if (index === 0) td.classList = 'app-col';
                    if (index === 1) {
                        let tooltTip = document.createElement('span');
                        tooltTip.classList = 'tool-tip';
                        tooltTip.innerText = val;
                        td.appendChild(tooltTip);
                        td.classList = 'title-col';
                        td.addEventListener('mouseover', (e) => {
                            let coord = e.target.getBoundingClientRect();
                            tooltTip.style.left = coord.x + 'px';
                            tooltTip.style.top = coord.y + .4 + 'px';
                        })
                    }
                    if (index === 2 || (type === 'record' && index === 3 || index === 4)) td.classList = 'time-col';
                    if ((type === 'tag' && index === 3) || (type === 'record' && index === 5)) {
                        td.innerText = '';
                        td.classList = 'tags-col';
                        td.addEventListener('mouseenter', () => {
                            if (!document.getElementById('tag-search')) {
                                let addTag = document.createElement('span');
                                addTag.classList = 'add-tag';
                                addTag.innerText = '+';
                                td.appendChild(addTag);
                                addTag.addEventListener('click', (e) => {
                                    let addTagDiv = document.createElement('div');
                                    addTagDiv.style.display = 'inline-block';
                                    let tagSearch = document.createElement('input');
                                    tagSearch.id = 'tag-search';
                                    tagSearch.type = 'text';
                                    tagSearch.addEventListener('focus', searchTags);
                                    tagSearch.addEventListener('keyup', searchTags);
                                    tagSearch.addEventListener('blur', removeSearchTagsDropdown);
                                    addTagDiv.appendChild(tagSearch);
                                    td.appendChild(addTagDiv);
                                    document.getElementById('tag-search').focus();
                                    addTag.remove();
                                });
                            }
                        });
                        td.addEventListener('mouseleave', (e) => {
                            let addTag = document.getElementsByClassName('add-tag')[0];
                            if (addTag) addTag.remove();
                        });
                    }
                    tr.appendChild(td);
                })

            }
            if (type === 'zoom') {
                header[type].forEach((val, index) => {
                    let td = document.createElement('td');
                    if (index === 0) { // Tags
                        td.classList = 'tags-col';
                        td.addEventListener('mouseenter', () => {
                            if (!document.getElementById('tag-search')) {
                                let addTag = document.createElement('span');
                                addTag.classList = 'add-tag';
                                addTag.innerText = '+';
                                td.appendChild(addTag);
                                addTag.addEventListener('click', (e) => {
                                    let addTagDiv = document.createElement('div');
                                    addTagDiv.style.display = 'inline-block';
                                    let tagSearch = document.createElement('input');
                                    tagSearch.id = 'tag-search';
                                    tagSearch.type = 'text';
                                    tagSearch.addEventListener('focus', searchTags);
                                    tagSearch.addEventListener('keyup', searchTags);
                                    tagSearch.addEventListener('blur', removeSearchTagsDropdown);
                                    addTagDiv.appendChild(tagSearch);
                                    td.appendChild(addTagDiv);
                                    document.getElementById('tag-search').focus();
                                    addTag.remove();
                                });
                            }
                        });
                        td.addEventListener('mouseleave', (e) => {
                            let addTag = document.getElementsByClassName('add-tag')[0];
                            if (addTag) addTag.remove();
                        });
                    }
                    if (index === 1) { // Duration
                        let dur = (Date.parse(globalRecords[results[i].end].end) - Date.parse(globalRecords[results[i].start].start)) / 1000;
                        let hh = ((Math.floor(dur / 3600) < 10) ? ("0" + Math.floor(dur / 3600)) : Math.floor(dur / 3600));
                        let mm = ((Math.floor(dur % 3600 / 60) < 10) ? ("0" + Math.floor(dur % 3600 / 60)) : Math.floor(dur % 3600 / 60));
                        let ss = ((Math.floor(dur % 3600 % 60) < 10) ? ("0" + Math.floor(dur % 3600 % 60)) : Math.floor(dur % 3600 % 60));
                        td.innerText = `${hh}:${mm}:${ss}`;
                        results[i].duration = dur;
                    }
                    if (index > 0) td.classList = 'time-col';
                    if (index === 2) td.innerText = globalRecords[results[i].start].start;
                    if (index === 3) td.innerText = globalRecords[results[i].end].end;
                    tr.appendChild(td);
                })
            }
            tbody.appendChild(tr);
        }
        tableTag.appendChild(tbody);
        if (type === 'record' || type === 'tag') {
            let selectAllVisible = document.createElement('input');
            selectAllVisible.id = `select-all-visible-${type}`;
            selectAllVisible.type = 'checkbox';
            let visibleChecked = [...tableTag.querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== `select-all-visible-${type}`).length;
            let visibleCount = [...tableTag.querySelectorAll('tr')].length - 1;
            if (visibleChecked === visibleCount) {
                selectAllVisible.checked = true;
                selectAllVisible.indeterminate = false;
            }
            if (visibleChecked < visibleCount) {
                selectAllVisible.checked = false;
                selectAllVisible.indeterminate = true;
                if (visibleChecked === 0) {
                    selectAllVisible.checked = false;
                    selectAllVisible.indeterminate = false;
                }
            }
            selectAllVisible.addEventListener('change', (e) => {
                let allCheckboxes = [...tableTag.querySelectorAll('input[type="checkbox"]')].filter(c => c.id !== `select-all-visible-${type}`)
                allCheckboxes.forEach(i => {
                    let id = i.id.split('-')[2];
                    globalRecords[id].checked = selectAllVisible.checked;
                    if (document.querySelector(`#check-${type === 'record' ? 'tag' : 'record'}-${id}`)) document.querySelector(`#check-${type === 'record' ? 'tag' : 'record'}-${id}`).checked = selectAllVisible.checked;
                    i.checked = selectAllVisible.checked;
                });
                ['tag-table', 'record-table'].forEach(tbl => {
                    if (document.getElementById(tbl)) {
                        let selectAllVisibleID = `select-all-visible-${type}`;
                        let visibleCount = [...document.getElementById(tbl).querySelectorAll('tr')].length - 1;
                        let selectAllVisible = document.getElementById(selectAllVisibleID);
                        let visibleChecked = [...document.getElementById(tbl).querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== selectAllVisibleID).length;
                        if (visibleChecked === visibleCount) {
                            selectAllVisible.checked = true;
                            selectAllVisible.indeterminate = false;
                        }
                        if (visibleChecked < visibleCount) {
                            selectAllVisible.checked = false;
                            selectAllVisible.indeterminate = true;
                            if (visibleChecked === 0) {
                                selectAllVisible.checked = false;
                                selectAllVisible.indeterminate = false;
                            }
                        }
                    }
                })
            })
            hr.childNodes[0].appendChild(selectAllVisible)
        }
        if (document.getElementById(`${type}-table`)) document.getElementById(`${type}-table`).remove();
        section.prepend(tableTag);
        // aggregateRecords();
        // Draw tags after table is drawn
        document.getElementById(`${type}-table`).childNodes[1].childNodes.forEach(row => {
            if (globalRecords[row.id.split('-')[1]]) {
                let val = globalRecords[row.id.split('-')[1]].tags;
                drawTag(val, row.id);
            }
        });
        if (document.getElementById(`${type}-page-controls`) === null) {
            let pageControlBar = document.createElement('div');
            pageControlBar.id = (`${type}-page-controls`);
            // Go to Page
            let goToPageLabel = document.createElement('label');
            let goToPageInput = document.createElement('input');
            goToPageLabel.innerText = 'Go to Page:';
            goToPageInput.type = 'number';
            goToPageInput.id = `${type}-go-to-page`;
            goToPageInput.value = table[`${type}-go-to-page`];
            goToPageInput.min = 1;
            goToPageInput.max = table[`${type}-page-count`];
            goToPageInput.addEventListener('change', (e) => {
                table[`${type}-go-to-page`] = e.target.value > table[`${type}-page-count`] ? parseInt(table[`${type}-page-count`]) : parseInt(e.target.value);
                if (!isNaN(table[`${type}-go-to-page`])) document.getElementById(`${type}-go-to-page`).value = table[`${type}-go-to-page`];
                if (table[`${type}-go-to-page`] < 1 || isNaN(table[`${type}-go-to-page`])) {
                    table[`${type}-go-to-page`] = 1;
                    document.getElementById(`${type}-go-to-page`).value = 1;
                }
                createTable(type);
            });
            pageControlBar.appendChild(goToPageLabel);
            pageControlBar.appendChild(goToPageInput);
            // Page # of #
            let pageNumLabel = document.createElement('label');
            pageNumLabel.innerText = `Page ${table[`${type}-go-to-page`]} of ${table[`${type}-page-count`]}`;
            pageNumLabel.id = `${type}-page-numbering`;
            pageControlBar.prepend(pageNumLabel);
            // Left Arrows
            let leftArrowBox = document.createElement('div');
            leftArrowBox.id = `left-arrows-${type}`;
            let leftSingleArrow = document.createElement('label');
            leftSingleArrow.id = `previous-page-arrow-${type}`;
            leftSingleArrow.addEventListener('click', (e) => {
                table[`${type}-go-to-page`] = table[`${type}-go-to-page`] !== 1 ? table[`${type}-go-to-page`] - 1 : 1;
                document.getElementById(`${type}-go-to-page`).value = table[`${type}-go-to-page`];
                createTable(type);
            });
            leftSingleArrow.style.color = table[`${type}-go-to-page`] === 1 ? 'gray' : 'black';
            leftSingleArrow.innerHTML = '&#8249;';
            leftSingleArrow.classList = 'left page-arrows';
            leftArrowBox.prepend(leftSingleArrow);

            let leftDoubleArrow = document.createElement('label');
            leftDoubleArrow.id = `first-page-arrow-${type}`;
            leftDoubleArrow.addEventListener('click', (e) => {
                table[`${type}-go-to-page`] = 1;
                document.getElementById(`${type}-go-to-page`).value = table[`${type}-go-to-page`];
                createTable();
            });
            leftDoubleArrow.style.color = table[`${type}-go-to-page`] === 1 ? 'gray' : 'black';
            leftDoubleArrow.innerHTML = '&#171;';
            leftDoubleArrow.classList = 'left page-arrows';
            leftArrowBox.prepend(leftDoubleArrow);
            pageControlBar.prepend(leftArrowBox);
            // Show # dropdown
            let showDropdown = document.createElement('select');
            showDropdown.id = `${type}-show`;
            showDropdown.value = table[`${type}-show`];
            for (let i = 10; i <= 50; i += 10) {
                let option = document.createElement('option');
                option.value = i;
                option.innerText = i;
                option.id = `show-${i}`;
                if (table[`${type}-show`] === i) option.selected = 'selected';
                showDropdown.appendChild(option);
            }
            showDropdown.addEventListener('change', (e) => {
                table[`${type}-show`] = parseInt(e.target.value);
                document.getElementById(`${type}-go-to-page`).max = Math.ceil(results.length / table[`${type}-show`]);
                createTable(type);
                // createZoomTable();
            })
            let showLabel = document.createElement('label');
            showLabel.innerText = 'Show ';
            pageControlBar.appendChild(showLabel);
            pageControlBar.appendChild(showDropdown);
            // Right Arrows
            let rightArrowBox = document.createElement('div');
            rightArrowBox.id = `right-arrows-${type}`;
            let rightSingleArrow = document.createElement('label');
            rightSingleArrow.id = `next-page-arrow-${type}`;
            rightSingleArrow.addEventListener('click', (e) => {
                table[`${type}-go-to-page`] = table[`${type}-go-to-page`] !== table[`${type}-page-count`] ? table[`${type}-go-to-page`] + 1 : table[`${type}-page-count`];
                document.getElementById(`${type}-go-to-page`).value = table[`${type}-go-to-page`];
                createTable(type);
            });
            rightSingleArrow.style.color = table[`${type}-go-to-page`] === table[`${type}-page-count`] ? 'gray' : 'black';
            rightSingleArrow.innerHTML = '&#8250;';
            rightSingleArrow.classList = 'right page-arrows';
            rightArrowBox.appendChild(rightSingleArrow);

            let rightDoubleArrow = document.createElement('label');
            rightDoubleArrow.id = `last-page-arrow-${type}`;
            rightDoubleArrow.addEventListener('click', (e) => {
                table[`${type}-go-to-page`] = table[`${type}-page-count`];
                document.getElementById(`${type}-go-to-page`).value = table[`${type}-go-to-page`];
                createTable(type);
            });
            rightDoubleArrow.style.color = table[`${type}-go-to-page`] === table[`${type}-page-count`] ? 'gray' : 'black';
            rightDoubleArrow.innerHTML = '&#187;';
            rightDoubleArrow.classList = 'right page-arrows';
            rightArrowBox.appendChild(rightDoubleArrow);
            pageControlBar.appendChild(rightArrowBox);
            section.appendChild(pageControlBar);
        }
        if (type === 'record') resizeTableColumns();
        aggregateRecords();
    }
}

// const createZoomTable = () => {
//     if (!document.getElementById('zoom-section')) {
//         let zoomSection = document.createElement('div');
//         zoomSection.id = 'zoom-section';
//         document.getElementById('container').appendChild(zoomSection);
//     }

//     pageCountZoom = zoomTags.length === 0 ? 1 : Math.ceil(zoomTags.length / showCountZoom);
//     goToPageZoom = goToPageZoom > pageCountZoom ? pageCountZoom : goToPageZoom;
//     if (document.getElementById('go-to-page-zoom')) document.getElementById('go-to-page-zoom').value = goToPageZoom;
//     if (document.getElementById('go-to-page-zoom')) document.getElementById('go-to-page-zoom').max = pageCountZoom;
//     if (document.getElementById('page-numbering-zoom')) document.getElementById('page-numbering-zoom').innerText = `Page ${goToPageZoom} of ${pageCountZoom}`;
//     if (document.getElementsByClassName('page-arrows-zoom').length > 0) {
//         [...document.getElementsByClassName('left')].forEach(arrow => {
//             arrow.style.color = goToPageZoom === 1 ? 'gray' : 'black';
//         });
//         [...document.getElementsByClassName('right')].forEach(arrow => {
//             arrow.style.color = goToPageZoom === pageCountZoom ? 'gray' : 'black';
//         });
//     }

//     let zoomSection = document.getElementById('zoom-section');
//     zoomSection.style.position = 'absolute';
//     zoomSection.style.top = zoomTableTop || '41vh';
//     zoomSection.style.left = zoomTableLeft || '800px';
//     let table = document.createElement('table');
//     table.id = 'zoom-table';
//     let thead = document.createElement('thead');
//     let hr = document.createElement('tr');
//     hr.id = 'zoom-table-header';
//     let header = ['tags', 'duration', 'start', 'end'];
//     header.forEach(h => {
//         let th = document.createElement('th');
//         th.innerHTML = `${h.replace(h[0], h[0].toUpperCase())}`;
//         th.id = `zoom-header-${h}`;
//         if (h === 'tags') {
//             th.id = 'zoom-tl-th';
//             th.style.cursor = 'move';
//             // Make Record Table Draggable
//             var clickX, clickY, dragX, dragY;
//             zoomSection.addEventListener('mousedown', (e) => {
//                 if (e.target.id === 'zoom-tl-th') {
//                     e = e || window.event;
//                     e.preventDefault();
//                     e.stopImmediatePropagation();
//                     clickX = e.clientX;
//                     clickY = e.clientY;
//                     document.addEventListener('mousemove', calcTableLoc)
//                 }
//             });
//             const calcTableLoc = (e) => {
//                 e = e || window.event;
//                 e.preventDefault();
//                 dragX = clickX - e.clientX;
//                 dragY = clickY - e.clientY;
//                 clickX = e.clientX;
//                 clickY = e.clientY;
//                 zoomTableTop = (zoomSection.offsetTop - dragY) + 'px';
//                 zoomTableLeft = (zoomSection.offsetLeft - dragX) + 'px';
//                 zoomSection.style.top = zoomTableTop;
//                 zoomSection.style.left = zoomTableLeft;
//             }
//             zoomSection.addEventListener('mouseup', (e) => {
//                 document.removeEventListener('mousemove', calcTableLoc);
//                 zoomSection.removeEventListener('mouseup', calcTableLoc);
//                 let maxHeight;
//                 if (zoomTableTop) maxHeight = window.innerHeight - parseInt(zoomTableTop.replace('px', '')) - (window.innerHeight * .05)
//                 zoomSection.style.maxHeight = maxHeight + 'px';
//             });
//         }
//         if (h === 'end') {
//             let closeButton = document.createElement('div');
//             closeButton.id = `close-zoom-section`;
//             closeButton.innerText = 'X';
//             closeButton.classList = 'close-button close-zooms';
//             closeButton.style.removeProperty('left');
//             closeButton.addEventListener('click', (e) => {
//                 e.stopImmediatePropagation();
//                 document.getElementById('zoom-section').remove();
//             });
//             th.appendChild(closeButton);
//         }
//         hr.appendChild(th);
//     });
//     thead.appendChild(hr);
//     table.appendChild(thead);
//     let tbody = document.createElement('tbody');

//     zoomVisibleRecords = [];
//     for (let i = (goToPageZoom - 1) * showCountZoom; i < (goToPageZoom * showCountZoom) - (goToPageZoom === pageCountZoom ? showCountZoom - (zoomTags.length % showCountZoom) : 0); i++) {
//         let tr = document.createElement('tr');
//         tr.id = `zoom-${zoomTags[i].start}`;
//         zoomVisibleRecords.push(zoomTags[i].start);
//         tr.classList = 'zoom-row';
//         header.forEach((val, index) => {

//             let td = document.createElement('td');
//             if (index === 0) { // Tags
//                 td.classList = 'tags-col';
//                 td.addEventListener('mouseenter', (e) => {
//                     if (!document.getElementById('tag-search')) {
//                         let addTag = document.createElement('span');
//                         addTag.classList = 'add-tag';
//                         addTag.innerText = '+';
//                         td.appendChild(addTag);
//                         addTag.addEventListener('click', (e) => {
//                             let addTagDiv = document.createElement('div');
//                             addTagDiv.style.display = 'inline-block';
//                             let tagSearch = document.createElement('input');
//                             tagSearch.id = 'tag-search';
//                             tagSearch.type = 'text';
//                             tagSearch.addEventListener('focus', searchTags);
//                             tagSearch.addEventListener('keyup', searchTags);
//                             tagSearch.addEventListener('blur', removeSearchTagsDropdown);
//                             addTagDiv.appendChild(tagSearch);
//                             td.appendChild(addTagDiv);
//                             document.getElementById('tag-search').focus();
//                             addTag.remove();
//                         });
//                     }
//                 });
//                 td.addEventListener('mouseleave', (e) => {
//                     let addTag = document.getElementsByClassName('add-tag')[0];
//                     if (addTag) addTag.remove();
//                 });
//             }
//             if (index === 1) { // Duration
//                 let dur = (Date.parse(globalRecords[zoomTags[i].end].end) - Date.parse(globalRecords[zoomTags[i].start].start)) / 1000;
//                 let hh = ((Math.floor(dur / 3600) < 10) ? ("0" + Math.floor(dur / 3600)) : Math.floor(dur / 3600));
//                 let mm = ((Math.floor(dur % 3600 / 60) < 10) ? ("0" + Math.floor(dur % 3600 / 60)) : Math.floor(dur % 3600 / 60));
//                 let ss = ((Math.floor(dur % 3600 % 60) < 10) ? ("0" + Math.floor(dur % 3600 % 60)) : Math.floor(dur % 3600 % 60));
//                 td.innerText = `${hh}:${mm}:${ss}`;
//             }
//             if (index > 0) td.classList = 'time-col';
//             if (index === 2) td.innerText = globalRecords[zoomTags[i].start].start;
//             if (index === 3) td.innerText = globalRecords[zoomTags[i].end].end;
//             tr.appendChild(td);
//         })
//         tbody.appendChild(tr);
//     }
//     table.appendChild(tbody);
//     if (document.getElementById('zoom-table')) document.getElementById('zoom-table').remove();
//     zoomSection.prepend(table);
//     // Draw tags after table is drawn
//     document.getElementById('zoom-table').childNodes[1].childNodes.forEach(row => {
//         let val = globalRecords[row.id.split('-')[1]].tags;
//         drawTag(val, row.id);
//     })

//     if (document.getElementById('zoom-page-controls') === null) {
//         let pageControlBar = document.createElement('div');
//         pageControlBar.id = 'zoom-page-controls';
//         // Go to Page
//         let goToPageLabel = document.createElement('label');
//         let goToPageInput = document.createElement('input');
//         goToPageLabel.innerText = 'Go to Page:';
//         goToPageInput.type = 'number';
//         goToPageInput.id = 'go-to-page-zoom';
//         goToPageInput.value = goToPageZoom;
//         goToPageInput.min = 1;
//         goToPageInput.max = pageCountZoom;
//         goToPageInput.addEventListener('change', (e) => {
//             goToPageZoom = e.target.value > pageCountZoom ? parseInt(pageCountZoom) : parseInt(e.target.value);
//             if (!isNaN(goToPageZoom)) document.getElementById('go-to-page-zoom').value = goToPageZoom;
//             if (goToPageZoom < 1 || isNaN(goToPageZoom)) {
//                 goToPageZoom = 1;
//                 document.getElementById('go-to-page-zoom').value = 1;
//             }
//             createZoomTable();
//         });
//         pageControlBar.appendChild(goToPageLabel);
//         pageControlBar.appendChild(goToPageInput);
//         // Page # of #
//         let pageNumLabel = document.createElement('label');
//         pageNumLabel.innerText = `Page ${goToPageZoom} of ${pageCountZoom}`;
//         pageNumLabel.id = 'page-numbering-zoom';
//         pageControlBar.prepend(pageNumLabel);
//         // Left Arrows
//         let leftArrowBox = document.createElement('div');
//         leftArrowBox.id = 'left-arrows-zoom';
//         let leftSingleArrow = document.createElement('label');
//         leftSingleArrow.id = 'previous-page-arrow-zoom';
//         leftSingleArrow.addEventListener('click', (e) => {
//             goToPageZoom = goToPageZoom !== 1 ? goToPageZoom - 1 : 1;
//             document.getElementById('go-to-page-zoom').value = goToPageZoom;
//             createZoomTable();
//         });
//         leftSingleArrow.style.color = goToPageZoom === 1 ? 'gray' : 'black';
//         leftSingleArrow.innerHTML = '&#8249;';
//         leftSingleArrow.classList = 'left page-arrows';
//         leftArrowBox.prepend(leftSingleArrow);

//         let leftDoubleArrow = document.createElement('label');
//         leftDoubleArrow.id = 'first-page-arrow-zoom';
//         leftDoubleArrow.addEventListener('click', (e) => {
//             goToPageZoom = 1;
//             document.getElementById('go-to-page-zoom').value = goToPageZoom;
//             createZoomTable();
//         });
//         leftDoubleArrow.style.color = goToPageZoom === 1 ? 'gray' : 'black';
//         leftDoubleArrow.innerHTML = '&#171;';
//         leftDoubleArrow.classList = 'left page-arrows';
//         leftArrowBox.prepend(leftDoubleArrow);
//         pageControlBar.prepend(leftArrowBox);
//         // Show # dropdown
//         let showDropdown = document.createElement('select');
//         showDropdown.id = 'show-record-count-zoom';
//         showDropdown.value = showCountZoom;
//         for (let i = 10; i <= 50; i += 10) {
//             let option = document.createElement('option');
//             option.value = i;
//             option.innerText = i;
//             option.id = `show-${i}`;
//             if (showCountZoom === i) option.selected = 'selected';
//             showDropdown.appendChild(option);
//         }
//         showDropdown.addEventListener('change', (e) => {
//             showCountZoom = parseInt(e.target.value);
//             document.getElementById('go-to-page-zoom').max = Math.ceil(zoomTags.length / showCountZoom);
//             createZoomTable();
//         })
//         let showLabel = document.createElement('label');
//         showLabel.innerText = 'Show ';
//         pageControlBar.appendChild(showLabel);
//         pageControlBar.appendChild(showDropdown);
//         // Right Arrows
//         let rightArrowBox = document.createElement('div');
//         rightArrowBox.id = 'right-arrows-zoom';
//         let rightSingleArrow = document.createElement('label');
//         rightSingleArrow.id = 'next-page-arrow-zoom';
//         rightSingleArrow.addEventListener('click', (e) => {
//             goToPageZoom = goToPageZoom !== pageCountZoom ? goToPageZoom + 1 : pageCountZoom;
//             document.getElementById('go-to-page-zoom').value = goToPageZoom;
//             createZoomTable();
//         });
//         rightSingleArrow.style.color = goToPageZoom === pageCountZoom ? 'gray' : 'black';
//         rightSingleArrow.innerHTML = '&#8250;';
//         rightSingleArrow.classList = 'right page-arrows';
//         rightArrowBox.appendChild(rightSingleArrow);

//         let rightDoubleArrow = document.createElement('label');
//         rightDoubleArrow.id = 'last-page-arrow-zoom';
//         rightDoubleArrow.addEventListener('click', (e) => {
//             goToPageZoom = pageCountZoom;
//             document.getElementById('go-to-page-zoom').value = goToPageZoom;
//             createZoomTable();
//         });
//         rightDoubleArrow.style.color = goToPageZoom === pageCountZoom ? 'gray' : 'black';
//         rightDoubleArrow.innerHTML = '&#187;';
//         rightDoubleArrow.classList = 'right page-arrows';
//         rightArrowBox.appendChild(rightDoubleArrow);
//         pageControlBar.appendChild(rightArrowBox);
//         zoomSection.appendChild(pageControlBar);
//     }
// }

const postDataRetrieval = (records) => {
    document.getElementById('date-input').value = records[0].start.split(' ')[0];
    globalRecords = records;
    filteredRecords = records;
    let apps = [...new Set(records.map(r => r.app))];
    dataLoaded = true;

    if (!document.getElementById('record-section')) {
        let recordSection = document.createElement('div');
        recordSection.id = 'record-section';
        document.getElementById('container').appendChild(recordSection);
    }

    // Populate most useful apps
    apps.forEach(app => {
        let prefApps = ['Slack', 'Chrome', 'Zoom', 'Excel', 'Outlook', 'OneDrive', 'Winword'];
        if (prefApps.filter(a => a === app).length < 1) removedApps.push(app);
    });
    refreshedApps = true;

    createAppFilter(apps);
    createTable('record');
    // grabRecords(records);

    // Auto Tagging - filters are currently hardcoded to specific outputs related to our tooling. May implement custom filter creation when database or local storage are added
    let filters = [/0[2-3]\d{6}\s?\-?/, /[A-Z]{3,7}\-\d+/, /[P-p]ower [A-a]utomate|\b[F-f]low[s]?\b/, /[J-j]ira/, /[S-s]alesforce /, /DRAFT \-/, /relonemajorincidentmgrtransitions/, / [T-t]ransition/, /\(?rca|RCA\)?/, /[P-p]ager[D-d]uty/]
    filters.forEach(filter => {
        globalRecords.filter(r => filter.test(r.title)).forEach(row => {
            let title = row.title.match(filter)[0];
            if (title.match(/DRAFT \-/) || title.match(/\(?rca|RCA\)?/)) title = 'RCA';
            if (title.match(/relonemajorincidentmgrtransitions/) || title.match(/ [T-t]ransition/)) title = 'Ticket Transition';
            if (title.match(/[A-Z]{3,7}\-\d+/)) {
                let months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                if (title.includes('UTF')) return;
                if (months.includes(title.split('-')[0].toLowerCase())) return;
            }
            title = title.replace(/-$/, '').trim();
            if (title.match(/[P-p]ower [A-a]utomate/) || title.match(/\b[F-f]low[s]?\b/)) title = 'Automation';
            if (title.match(/jira/) || title.match(/salesforce/)) title = title[0].toUpperCase() + title.substring(1);
            tags.filter(tag => tag.name === title).length === 0 ? createNewTag(title, row.tags, row.id) : globalRecords[row.id].tags.push(tags.filter(tag => tag.name === title)[0].id);
        });
    });
    // Zoom Meeting Tags
    let zoomOrigin;
    globalRecords.filter(r => r.app === 'Zoom' || (['Chrome', 'Firefox', 'Msedge'].includes(r.app) && r.title.includes('Launch Meeting - Zoom'))).forEach(row => {
        let zoomConnectionId;
        if ((row.app === 'Zoom' && (row.title === 'Connecting…' || (row.title === 'Zoom Meeting' && !zoomOrigin))) || (row.app !== 'Zoom')) {
            zoomConnectionId = row.id
            zoomTags.push({ 'start': zoomConnectionId, 'end': 0, 'duration': 0 });
            for (let i = zoomConnectionId > 5 ? zoomConnectionId - 6 : 0; i < zoomConnectionId; i++) {
                if ((globalRecords[i].app === 'Outlook' && !globalRecords[i].title.match(/Reminder\(s\)/)) || (globalRecords[i].app === 'Slack')) zoomOrigin = globalRecords[i];
            }
            // console.log(zoomOrigin)
        };
        if (zoomOrigin) {
            addTagsToZoomMeetings(zoomOrigin, row)
            if (row.title === 'End Meeting or Leave Meeting?') zoomOrigin = null;
        }
    });

    if (!document.getElementById('download-csv')) {

        let downloadBttn = document.createElement('button');
        downloadBttn.id = 'download-csv';
        downloadBttn.addEventListener('click', downloadCSV);
        downloadBttn.innerText = 'Download CSV';
        document.body.appendChild(downloadBttn);
    }

    if (!document.getElementById('zoom-table-button')) {
        let zTB = document.createElement('button');
        zTB.id = 'zoom-table-button';
        zTB.innerText = 'Zoom Table'
        // zTB.addEventListener('click', createZoomTable);
        zTB.addEventListener('click', () => {
            createTable('zoom');
        });
        document.body.appendChild(zTB);
    }
    if (!document.getElementById('toggle-dark-mode')) {
        let tDM = document.createElement('button');
        tDM.id = 'toggle-dark-mode';
        let status = document.body.classList.length > 0 ? 'Disable' : 'Enable';
        tDM.innerText = `${status} Dark Mode`;
        tDM.addEventListener('click', () => {
            document.body.classList.length > 0 ? document.body.classList.remove('dark-mode') : document.body.classList.add('dark-mode');
            status = document.body.classList.length > 0 ? 'Disable' : 'Enable';
            tDM.innerText = `${status} Dark Mode`;
        });
        document.body.appendChild(tDM);
    }

}

const downloadCSV = () => {
    let filteredResults = globalRecords.filter(r => !removedApps.includes(r.app) && r.checked);
    let exportVals = 'app,title,start,end,dur,duration,tags\n' + filteredResults.map(r => `${r.app},${r.title.replace(/,/g, ';')},${r.start},${r.end},${r.dur},${r.duration},${r.tags.map(id => tags.filter(t => t.id === id)[0].name + ';').join('')}\n`).join('');
    let subject = filteredResults[0].start.split(' ')[0].split('-')[1] + '-' + filteredResults[0].start.split(' ')[0].split('-')[2] + '_' + filteredResults[filteredResults.length - 1].start.split(' ')[0].split('-')[1] + '-' + filteredResults[filteredResults.length - 1].start.split(' ')[0].split('-')[2] + '_time_tracking';
    window.api.send('write-csv', exportVals);
    window.api.receive('return-csv', (data) => {
        if (data[0] === 'write complete') {
            let a = document.createElement('a');
            a.href = '../time.csv'; //local test
            // a.href = '../../../time.csv'; //desktop app test
            a.id = 'file-link';
            a.download = `${subject}.csv`;
            a.style.visibility = 'hidden';
            document.body.appendChild(a);
            document.getElementById('file-link').click();
            document.getElementById('file-link').remove();
            let downloadSuccess = document.createElement('p');
            downloadSuccess.innerText = 'CSV successfully downloaded to your desktop'
            downloadSuccess.id = 'download-success';
            document.body.appendChild(downloadSuccess);
            downloadSuccess.addEventListener('animationend', () => downloadSuccess.remove());
        }
    });
}

const cleanUpAppName = (app) => {
    let upperCase = /[A-Z]{4}/;
    app = upperCase.test(app) ? (app[0].toUpperCase() + app.substring(1).toLowerCase()).replace('Onenote', 'OneNote') : app[0].toUpperCase() + app.substring(1);
    return app.replace('.exe', '').replace('.EXE', '');
}

const createNewTag = (name, val = null, recordID = null) => {
    tags.push({ 'id': tags.length, name });
    if (recordID && val) {
        let record = globalRecords[recordID];
        record.tags.push(tags.length - 1);
        let rowID = `record-${recordID}`;
        [...document.getElementById('record-table').childNodes[1].childNodes].forEach(row => {
            if (row.id.includes(rowID)) {
                drawTag(val, rowID)
            }
        })
    }
}

let hover = -1;
const searchTags = (e) => {
    if (e.type === 'focus') hover = -1;
    let addTagDiv = document.getElementById('tag-search').parentNode;
    let td = addTagDiv.parentNode;
    let searchInput = document.getElementById('tag-search').value.toLowerCase();
    let resultsDropdown = document.createElement('div');
    resultsDropdown.id = 'tags-dropdown';
    let rowTags = [...td.childNodes].filter(t => t.className.indexOf('tag-') > -1).map(t => parseInt(t.className.substring(t.className.indexOf('tag-') + 4)));
    let sortedTags = tags.filter(t => !rowTags.includes(t.id)).filter(t => t.name.toLowerCase().includes(searchInput)).filter((t, i) => i < 10).sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
    sortedTags.push({ 'id': -1, 'name': 'Add Tag' });
    for (let i = 0; i < sortedTags.length; i++) {
        let result = document.createElement('p');
        if ((searchInput.trim().length > 0 && sortedTags[i].name === 'Add Tag') || (sortedTags[i].name !== 'Add Tag' && (searchInput.trim().length === 0 || sortedTags[i].name.toLowerCase().indexOf(searchInput) > -1))) {
            result.classList = 'tag-search-result';
            result.innerText = sortedTags[i].name;
            result.addEventListener('mousedown', (e) => {
                let record = globalRecords[td.parentNode.id.substring(td.parentNode.id.indexOf('-') + 1)];
                if (sortedTags[i].name !== 'Add Tag') {
                    record.tags.push(tags.filter(tag => tag.name === e.target.innerText)[0].id);
                    drawTag(record.tags, `${visibleRecords['record'].includes(record.id) ? 'record' : 'zoom'}-${record.id}`);
                }
                if (sortedTags[i].name === 'Add Tag' && document.getElementById('tag-search').value.length > 0 && document.getElementById('tag-search').value.toLowerCase() !== 'add tag' && tags.filter(tag => tag.name === document.getElementById('tag-search').value.trim().toLowerCase()).length === 0) handleAddTag(td);
            });
            resultsDropdown.appendChild(result);
        }
    }
    if (document.getElementById('tags-dropdown')) document.getElementById('tags-dropdown').remove();
    if (resultsDropdown.childNodes.length > 0) addTagDiv.appendChild(resultsDropdown);
    document.querySelectorAll('.tag-search-result').forEach(t => t.addEventListener('mouseenter', (e) => {
        hover = -1;
        if (document.querySelector('.key-focus')) document.querySelector('.key-focus').classList.remove('key-focus');
    }))
    if (e.type === 'keyup' && e.key === 'Enter' && document.getElementById('tag-search').value.length > 0 && hover < 0) handleAddTag(td);
    if (e.type === 'keyup' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        if (hover === -1 && e.key === 'ArrowDown') {
            document.querySelector('.tag-search-result').classList.add('key-focus');
            hover++;
        }
        else if (hover === 0 && e.key === 'ArrowUp') {
            document.getElementById('tag-search').focus();
            hover = -1;
        }
        else if (hover >= 0 && hover < document.querySelectorAll('.tag-search-result').length) {
            hover += e.key === 'ArrowUp' ? -1 : 1
            document.querySelectorAll('.tag-search-result')[hover].classList.add('key-focus');
        }
    }
    if (e.type === 'keyup' && e.key === 'Enter' && hover >= 0) handleAddTag(td);
};

const handleAddTag = (td) => {
    let searchVal = hover >= 0 && document.querySelectorAll('.tag-search-result').length > 0 && document.querySelectorAll('.tag-search-result')[hover].innerText.toLowerCase() !== 'add tag' ? document.querySelectorAll('.tag-search-result')[hover].innerText : document.getElementById('tag-search').value.trim();
    let record = globalRecords[td.parentNode.id.substring(td.parentNode.id.indexOf('-') + 1)];
    let existingTag = tags.filter(tag => tag.name.toLowerCase() === searchVal.toLowerCase());
    if (existingTag.length === 0) createNewTag(searchVal, record.tags, record.id)
    if (existingTag.length > 0) {
        let tagID = existingTag[0].id;
        if (globalRecords[record.id].tags.filter(t => t === tagID).length === 0) {
            globalRecords[record.id].tags.push(tagID);
            drawTag(globalRecords[record.id].tags, `record-${record.id}`);
        }
    }
    if (document.getElementById('tag-search')) document.getElementById('tag-search').blur();
}

const removeSearchTagsDropdown = () => {
    document.getElementById('tag-search').parentNode.remove();
}
const drawTag = (val, rowID) => {
    let td = document.getElementById(rowID).childNodes.length > 5 ? document.getElementById(rowID).childNodes[6] : document.getElementById(rowID).childNodes.length > 4 ? document.getElementById(rowID).childNodes[4] : document.getElementById(rowID).childNodes[0];
    let existingTags = [...td.childNodes].filter(tag => tag.className.includes('tag-'));
    val.forEach((tid) => {
        if (existingTags.filter(tag => tag.className.includes(tid)).length === 0) {
            let t = tags.filter(tag => tag.id === tid)[0];
            let tag = document.createElement('p');
            tag.innerText = t.name;
            tag.classList = `tags tag-${t.id}`;
            tag.addEventListener('mouseenter', (e) => {
                let x = document.createElement('span');
                x.classList = 'delete-tag';
                x.innerText = 'x'
                tag.appendChild(x);
                x.addEventListener('click', (e) => {
                    e.stopImmediatePropagation();
                    let idToRemove = parseInt(e.target.parentNode.classList[1].split('-')[1]);
                    if (/^\d+$/.test(idToRemove)) {
                        let id = e.target.parentNode.parentNode.parentNode.id;
                        let fromTag = e.target.parentNode.parentNode.parentNode.id.includes('tag') ? true : false;
                        id = id.substring(id.indexOf('-') + 1);
                        globalRecords[id].tags = globalRecords[id].tags.filter(t => t !== idToRemove);
                        tag.remove();
                        // if (fromTag && visibleRecords.includes(parseInt(id))) {
                        if (fromTag && visibleRecords['record'].includes(parseInt(id))) {
                            document.getElementById(`record-${id}`).childNodes[6].childNodes.forEach(t => {
                                if ([...t.classList].includes(`tag-${idToRemove}`)) t.remove();
                            })
                        }
                        // if (tagVisibleRecords.includes(parseInt(id)) && parseInt(tagID) === idToRemove) {
                        if (visibleRecords['tag'].includes(parseInt(id)) && parseInt(tagID) === idToRemove) {
                            // tagVisibleRecords.filter(r => r !== parseInt(id)).length > 0 ? createTagTable() : document.getElementById('tag-section').remove();
                            visibleRecords['tag'].filter(r => r !== parseInt(id)).length > 0 ? createTable('tag') : document.getElementById('tag-section').remove();
                        };
                        if (document.getElementsByClassName('add-tag')[0]) document.getElementsByClassName('add-tag')[0].remove();
                    };
                })
            });
            tag.addEventListener('mouseleave', (e) => {
                let x = tag.childNodes[tag.childNodes.length - 1];
                x.remove();
            })
            tag.addEventListener('click', (e) => {
                tagID = [...e.target.classList].filter(t => t.includes('tag-'))[0].split('-')[1];
                createTable('tag')
                //createTagTable();
            })
            tag.draggable = true;
            tag.addEventListener('drag', (e) => {
                dragTag = [...e.target.classList][1];
                dropTag = null;
            });
            tag.addEventListener('dragend', (e) => {
                if (!dropTag || dragTag === dropTag) dragTag = null; // drop isn't on another tag, clear value
            })
            tag.addEventListener('dragover', (e) => {
                e.preventDefault();
            })
            tag.addEventListener('drop', (e) => {
                e.preventDefault();
                dropTag = e.target.classList[1];
                if (!dropTag || dragTag === dropTag) dragTag = null;
                if (dragTag && dropTag) mergeTagModal();
            })
            td.appendChild(tag);
        }
    })
}

const mergeTagModal = () => {
    let modalBackground = document.createElement('div');
    modalBackground.id = 'modal-background';
    modalBackground.addEventListener('click', () => {
        modalBackground.remove();
        if (document.getElementById('merge-tag-modal')) document.getElementById('merge-tag-modal').remove();
    })
    document.body.appendChild(modalBackground);
    let modal = document.createElement('div');
    modal.id = 'merge-tag-modal';
    let winWidth = window.innerWidth - 240;
    let width = winWidth * .6 > 800 ? 800 : winWidth * .6;
    let height = width * .66;
    modal.style.width = width + 'px';
    modal.style.height = height + 'px';
    modal.style.left = `${(window.innerWidth / 2) - (width / 2) + 240}px`;
    modal.style.top = `${(window.innerHeight / 2) - (height / 2)}px`;
    let text = document.createElement('h1');
    text.innerText = 'What would you like to do?';
    text.style.marginBottom = `${height * .1}px`;
    modal.appendChild(text);
    let tagOptions = ['merge', 'parent-child'];
    tagOptions.forEach(id => {
        let p = document.createElement('div');
        p.style.width = `${width * .8}px`;
        p.style.marginLeft = `${width * .1}px`;
        p.id = id;
        p.classList = 'tag-option'
        p.innerHTML = id === 'merge' ? `<h2>Merge tags: combine tags with the option to rename</h2> <h3>${tags.filter(t => t.id === parseInt(dropTag.split('-')[1]))[0].name} &#8594;&#8592; ${tags.filter(t => t.id === parseInt(dragTag.split('-')[1]))[0].name}</h3>` : `<span style='color:darkgray;'><h2>Parent-child tagging: Coming Soon</h2> <h3 style='color:darkgray;'>${tags.filter(t => t.id === parseInt(dropTag.split('-')[1]))[0].name} <br><span style='line-height:1.5;margin-left:${width * .04}px;'>&#8627; ${tags.filter(t => t.id === parseInt(dragTag.split('-')[1]))[0].name}</span></h3></span>`;
        modal.appendChild(p);
        p.addEventListener('click', (e) => {
            let id = e.target.parentNode.id === 'merge-tag-modal' ? e.target.id : e.target.parentNode.id ? e.target.parentNode.id : e.target.parentNode.parentNode.id ? e.target.parentNode.parentNode.id : e.target.parentNode.parentNode.parentNode.id;
            if (id === 'merge') {
                document.getElementById(id).style.backgroundColor = 'gray';
                tagOptions.filter(o => o !== id).forEach(o => {
                    document.getElementById(o).addEventListener('animationend', () => {
                        document.getElementById(o).style.visibility = 'hidden';
                        let tagName = document.createElement('input');
                        tagName.type = 'text';
                        tagName.style.width = `${width * .56}px`;
                        tagName.placeholder = `${tags.filter(t => t.id === parseInt(dropTag.split('-')[1]))[0].name}-${tags.filter(t => t.id === parseInt(dragTag.split('-')[1]))[0].name}`;
                        const newTagName = () => {
                            let input = modal.querySelector('input');
                            let title = input.value.length === 0 ? input.placeholder : input.value;
                            if (tags.filter(tag => tag.name === title).length === 0) {
                                createNewTag(title);
                                replaceTags(tags.filter(tag => tag.name === title)[0].id, [parseInt(dropTag.split('-')[1]), parseInt(dragTag.split('-')[1])]);
                                modalBackground.click();
                            }
                            else {
                                let modalBoundary = modal.getBoundingClientRect();
                                let error = document.createElement('p');
                                error.id = 'tag-exists-error';
                                error.innerText = `A tag named "${title}" already exists`;
                                error.addEventListener('animationend', () => error.remove());
                                error.style.top = `${modalBoundary.bottom - 130}px`;
                                error.style.left = `${modalBoundary.left + (width * .325)}px`;
                                modal.appendChild(error);
                            }
                        }
                        tagName.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') newTagName();
                        })
                        let tagLabel = document.createElement('label');
                        tagLabel.innerText = 'Merged tag name:'
                        let tagDiv = document.createElement('div');
                        tagDiv.id = 'merge-tag-input';
                        tagDiv.appendChild(tagLabel);
                        tagDiv.appendChild(tagName);
                        tagDiv.style.width = `${width * .8}px`;
                        tagDiv.style.marginLeft = `${width * .1}px`;
                        document.getElementById(o).remove();
                        modal.appendChild(tagDiv);
                        tagName.focus();
                        let button = document.createElement('button');
                        button.innerText = 'Merge';
                        button.id = 'merge-button';
                        button.style.margin = `${width * .05}px 0 0 ${width * .87}px`;
                        button.addEventListener('click', newTagName)
                        modal.appendChild(button);
                    })
                    document.getElementById(o).classList.add('hide-option');
                })
            }
        })
    })
    document.body.appendChild(modal);
};

const replaceTags = (mergedID, oldTagIDs) => {
    let records = globalRecords.filter(r => r.tags.includes(oldTagIDs[0]) || r.tags.includes(oldTagIDs[1]))
    records.forEach(r => {
        globalRecords[r.id].tags = [...globalRecords[r.id].tags, mergedID].filter(tag => tag !== oldTagIDs[0] && tag !== oldTagIDs[1]);
    });
    createTable('record');
    //grabRecords(globalRecords);
    if (document.getElementById('tag-section')) {
        tagID = mergedID;
        createTable('tag');
        // createTagTable();
    }
}

// const createTagTable = () => {
//     if (!document.getElementById('tag-section')) {
//         let tagSection = document.createElement('div');
//         tagSection.id = 'tag-section';
//         document.getElementById('container').appendChild(tagSection);
//     }

//     let filteredRecordTags = globalRecords.filter(r => r.tags.includes(parseInt(tagID)));
//     if (filteredRecordTags.length > 0) {
//         pageCountTags = filteredRecordTags.length === 0 ? 1 : Math.ceil(filteredRecordTags.length / showCountTags);
//         goToPageTags = goToPageTags > pageCountTags ? pageCountTags : goToPageTags;
//         if (document.getElementById('go-to-page-tags')) document.getElementById('go-to-page-tags').value = goToPageTags;
//         if (document.getElementById('go-to-page-tags')) document.getElementById('go-to-page-tags').max = pageCountTags;
//         if (document.getElementById('page-numbering-tags')) document.getElementById('page-numbering-tags').innerText = `Page ${goToPageTags} of ${pageCountTags}`;
//         if (document.getElementsByClassName('page-arrows-tags').length > 0) {
//             [...document.getElementsByClassName('left')].forEach(arrow => {
//                 arrow.style.color = goToPageTags === 1 ? 'gray' : 'black';
//             });
//             [...document.getElementsByClassName('right')].forEach(arrow => {
//                 arrow.style.color = goToPageTags === pageCountTags ? 'gray' : 'black';
//             });
//         }


//         let tagSection = document.getElementById('tag-section');
//         tagSection.style.position = 'absolute';
//         tagSection.style.top = tagTableTop || '41vh';
//         tagSection.style.left = tagTableLeft || '300px';
//         let table = document.createElement('table');
//         table.id = 'tag-table';
//         let thead = document.createElement('thead');
//         let hr = document.createElement('tr');
//         hr.id = 'tag-table-header';
//         let topLeftTH = document.createElement('th');
//         topLeftTH.id = 'tag-tl-th';
//         topLeftTH.style.cursor = 'move';
//         // Make Record Table Draggable
//         var clickX, clickY, dragX, dragY;
//         tagSection.addEventListener('mousedown', (e) => {
//             if (e.target.id === 'tag-tl-th') {
//                 e = e || window.event;
//                 e.preventDefault();
//                 e.stopImmediatePropagation();
//                 clickX = e.clientX;
//                 clickY = e.clientY;
//                 document.addEventListener('mousemove', calcTableLoc)
//             }
//         });
//         const calcTableLoc = (e) => {
//             e = e || window.event;
//             e.preventDefault();
//             dragX = clickX - e.clientX;
//             dragY = clickY - e.clientY;
//             clickX = e.clientX;
//             clickY = e.clientY;
//             tagTableTop = (tagSection.offsetTop - dragY) + 'px';
//             tagTableLeft = (tagSection.offsetLeft - dragX) + 'px';
//             tagSection.style.top = tagTableTop;
//             tagSection.style.left = tagTableLeft;
//         }
//         tagSection.addEventListener('mouseup', (e) => {
//             document.removeEventListener('mousemove', calcTableLoc);
//             tagSection.removeEventListener('mouseup', calcTableLoc);
//             let maxHeight;
//             if (tagTableTop) maxHeight = window.innerHeight - parseInt(tagTableTop.replace('px', '')) - (window.innerHeight * .05)
//             tagSection.style.maxHeight = maxHeight + 'px';
//         });
//         hr.appendChild(topLeftTH);
//         let header = ['app', 'title', 'duration', 'tags'];
//         header.forEach(h => {
//             let th = document.createElement('th');
//             th.innerHTML = `${h.replace(h[0], h[0].toUpperCase())}<span style="line-height: 1.2">${sortByHeaderTags[h] === 'asc' ? ' &#129041;' : sortByHeaderTags[h] === 'desc' ? ' &#129043;' : ''}</span>`;
//             th.id = `tag-header-${h}`;
//             th.addEventListener('click', (e) => {
//                 let val = e.target.id.split('-')[2];
//                 if (val !== 'section' && val) {
//                     sortByHeaderTags[val] = sortByHeaderTags[val] === '' ? 'asc' : sortByHeaderTags[val] === 'asc' ? 'desc' : '';
//                     goToPageTags = 1;
//                     createTagTable();
//                 }
//             });
//             if (h === 'tags') {
//                 let closeButton = document.createElement('div');
//                 closeButton.id = `close-tag-section`;
//                 closeButton.innerText = 'X';
//                 closeButton.classList = 'close-button close-tags';
//                 closeButton.style.removeProperty('left');
//                 closeButton.addEventListener('click', (e) => {
//                     e.stopImmediatePropagation();
//                     document.getElementById('tag-section').remove();
//                     aggregateRecords();
//                 });
//                 th.appendChild(closeButton);
//             }
//             hr.appendChild(th);
//         });
//         thead.appendChild(hr);
//         table.appendChild(thead);
//         let tbody = document.createElement('tbody');

//         let len = filteredRecordTags.length === 0 ? 1 : filteredRecordTags.length > showCountTags ? showCountTags : filteredRecordTags.length;

//         Object.keys(sortByHeaderTags).forEach(key => {
//             if (sortByHeaderTags[key].length > 0) filteredRecordTags = sortByHeaderTags[key] === 'asc' ? filteredRecordTags.sort((a, b) => a[key] > b[key] ? 1 : -1) : filteredRecordTags.sort((a, b) => a[key] < b[key] ? 1 : -1);
//         })

//         tagVisibleRecords = [];
//         for (let i = (goToPageTags - 1) * showCountTags; i < (goToPageTags * showCountTags) - (goToPageTags === pageCountTags ? showCountTags - (filteredRecordTags.length % showCountTags) : 0); i++) {
//             let tr = document.createElement('tr');
//             tr.id = `tag-${filteredRecordTags[i].id}`;
//             tagVisibleRecords.push(filteredRecordTags[i].id);
//             tr.classList = 'tag-row';
//             let firstCol = document.createElement('td');
//             firstCol.classList = 'check-col';
//             let checkbox = document.createElement('input');
//             checkbox.type = 'checkbox';
//             checkbox.checked = filteredRecordTags[i].checked;
//             checkbox.id = `check-tag-${filteredRecordTags[i].id}`;
//             // CREATE EVENT LISTENER WHEN CHECKBOX IS CHANGED OR ROW IS CLICKED ON TO UPDATE CHECKED STATUS OF THE GLOBAL RECORD
//             checkbox.addEventListener('change', (e) => {
//                 e.stopImmediatePropagation();
//                 let id = e.target.id.substring('check-tag-'.length);
//                 globalRecords[id].checked = e.target.checked;
//                 aggregateRecords();
//             });
//             tr.addEventListener('click', (e) => {
//                 if (e.target.tagName !== 'INPUT') {
//                     if (![...e.target.classList][0].includes('tag')) {
//                         let id = [...e.target.classList][0].includes('tool') ? e.target.parentElement.parentElement.id.substring('tag-'.length) : e.target.parentElement.id.substring('tag-'.length);
//                         let cb = document.getElementById(`check-tag-${id}`);
//                         globalRecords[id].checked = !cb.checked;
//                         // If visible toggle record table check
//                         if (document.querySelector(`#check-record-${id}`)) document.querySelector(`#check-record-${id}`).checked = !cb.checked;
//                         cb.checked = !cb.checked;
//                         ['tag-table', 'record-table'].forEach(tbl => {
//                             if (document.getElementById(tbl)) {
//                                 let selectAllVisibleID = tbl === 'tag-table' ? 'select-all-visible-tags' : 'select-all-visible';
//                                 let visibleCount = [...document.getElementById(tbl).querySelectorAll('tr')].length - 1;
//                                 let selectAllVisible = document.getElementById(selectAllVisibleID);
//                                 let visibleChecked = [...document.getElementById(tbl).querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== selectAllVisibleID).length;
//                                 if (visibleChecked === visibleCount) {
//                                     selectAllVisible.checked = true;
//                                     selectAllVisible.indeterminate = false;
//                                 }
//                                 if (visibleChecked < visibleCount) {
//                                     selectAllVisible.checked = false;
//                                     selectAllVisible.indeterminate = true;
//                                     if (visibleChecked === 0) {
//                                         selectAllVisible.checked = false;
//                                         selectAllVisible.indeterminate = false;
//                                     }
//                                 }
//                             }
//                         })
//                         aggregateRecords();
//                     }
//                 }
//             });
//             firstCol.appendChild(checkbox);
//             tr.appendChild(firstCol);
//             let row = [];
//             header.forEach(col => filteredRecordTags.length > 0 ? row.push(filteredRecordTags[i][col]) : row.push(''));
//             row.map((val, index) => {
//                 let td = document.createElement('td');
//                 td.innerText = val;
//                 if (index === 0) td.classList = 'app-col';
//                 if (index === 1) {
//                     let tooltTip = document.createElement('span');
//                     tooltTip.classList = 'tool-tip';
//                     tooltTip.innerText = val;
//                     td.appendChild(tooltTip);
//                     td.classList = 'title-col';
//                     td.addEventListener('mouseover', (e) => {
//                         let coord = e.target.getBoundingClientRect();
//                         tooltTip.style.left = coord.x + 'px';
//                         tooltTip.style.top = coord.y + .4 + 'px';
//                     })
//                 }
//                 if (index === 2) td.classList = 'time-col';
//                 if (index === 3) {
//                     td.innerText = '';
//                     td.classList = 'tags-col';
//                 }
//                 tr.appendChild(td);
//             })
//             tbody.appendChild(tr);
//         }
//         table.appendChild(tbody);
//         let selectAllVisible = document.createElement('input');
//         selectAllVisible.id = 'select-all-visible-tags';
//         selectAllVisible.type = 'checkbox';
//         let visibleChecked = [...table.querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== 'select-all-visible-tags').length;
//         let visibleCount = [...table.querySelectorAll('tr')].length - 1;
//         if (visibleChecked === visibleCount) {
//             selectAllVisible.checked = true;
//             selectAllVisible.indeterminate = false;
//         }
//         if (visibleChecked < visibleCount) {
//             selectAllVisible.checked = false;
//             selectAllVisible.indeterminate = true;
//             if (visibleChecked === 0) {
//                 selectAllVisible.checked = false;
//                 selectAllVisible.indeterminate = false;
//             }
//         }
//         selectAllVisible.addEventListener('change', (e) => {
//             let allCheckboxes = [...table.querySelectorAll('input[type="checkbox"]')].filter(c => c.id !== 'select-all-visible-tags')
//             allCheckboxes.forEach(i => {
//                 let id = i.id.split('-')[2];
//                 globalRecords[id].checked = selectAllVisible.checked;
//                 if (document.querySelector(`#check-record-${id}`)) document.querySelector(`#check-record-${id}`).checked = selectAllVisible.checked;
//                 i.checked = selectAllVisible.checked;
//             });
//             ['tag-table', 'record-table'].forEach(tbl => {
//                 if (document.getElementById(tbl)) {
//                     let selectAllVisibleID = tbl === 'tag-table' ? 'select-all-visible-tags' : 'select-all-visible';
//                     let visibleCount = [...document.getElementById(tbl).querySelectorAll('tr')].length - 1;
//                     let selectAllVisible = document.getElementById(selectAllVisibleID);
//                     let visibleChecked = [...document.getElementById(tbl).querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== selectAllVisibleID).length;
//                     if (visibleChecked === visibleCount) {
//                         selectAllVisible.checked = true;
//                         selectAllVisible.indeterminate = false;
//                     }
//                     if (visibleChecked < visibleCount) {
//                         selectAllVisible.checked = false;
//                         selectAllVisible.indeterminate = true;
//                         if (visibleChecked === 0) {
//                             selectAllVisible.checked = false;
//                             selectAllVisible.indeterminate = false;
//                         }
//                     }
//                 }
//             })
//         })
//         topLeftTH.appendChild(selectAllVisible)
//         if (document.getElementById('tag-table')) document.getElementById('tag-table').remove();
//         tagSection.prepend(table);

//         aggregateRecords();

//         // Draw tags after table is drawn
//         document.getElementById('tag-table').childNodes[1].childNodes.forEach(row => {
//             if (globalRecords[row.id.substring(row.id.indexOf('-') + 1)]) {
//                 let val = globalRecords[row.id.substring(row.id.indexOf('-') + 1)].tags;
//                 drawTag(val, row.id)
//             }
//         })

//         if (document.getElementById('tag-page-controls') === null) { //document.getElementById('page-controls').remove();
//             let pageControlBar = document.createElement('div');
//             pageControlBar.id = 'tag-page-controls';
//             // Go to Page
//             let goToPageLabel = document.createElement('label');
//             let goToPageInput = document.createElement('input');
//             goToPageLabel.innerText = 'Go to Page:';
//             goToPageInput.type = 'number';
//             goToPageInput.id = 'go-to-page-tags';
//             goToPageInput.value = goToPageTags;
//             goToPageInput.min = 1;
//             goToPageInput.max = pageCountTags;
//             goToPageInput.addEventListener('change', (e) => {
//                 goToPageTags = e.target.value > pageCountTags ? parseInt(pageCountTags) : parseInt(e.target.value);
//                 if (!isNaN(goToPageTags)) document.getElementById('go-to-page-tags').value = goToPageTags;
//                 if (goToPageTags < 1 || isNaN(goToPageTags)) {
//                     goToPageTags = 1;
//                     document.getElementById('go-to-page-tags').value = 1;
//                 }
//                 createTagTable();
//             });
//             pageControlBar.appendChild(goToPageLabel);
//             pageControlBar.appendChild(goToPageInput);
//             // Page # of #
//             let pageNumLabel = document.createElement('label');
//             pageNumLabel.innerText = `Page ${goToPageTags} of ${pageCountTags}`;
//             pageNumLabel.id = 'page-numbering-tags';
//             pageControlBar.prepend(pageNumLabel);
//             // Left Arrows
//             let leftArrowBox = document.createElement('div');
//             leftArrowBox.id = 'left-arrows-tags';
//             let leftSingleArrow = document.createElement('label');
//             leftSingleArrow.id = 'previous-page-arrow-tags';
//             leftSingleArrow.addEventListener('click', (e) => {
//                 goToPageTags = goToPageTags !== 1 ? goToPageTags - 1 : 1;
//                 document.getElementById('go-to-page-tags').value = goToPageTags;
//                 createTagTable();
//             });
//             leftSingleArrow.style.color = goToPageTags === 1 ? 'gray' : 'black';
//             leftSingleArrow.innerHTML = '&#8249;';
//             leftSingleArrow.classList = 'left page-arrows';
//             leftArrowBox.prepend(leftSingleArrow);

//             let leftDoubleArrow = document.createElement('label');
//             leftDoubleArrow.id = 'first-page-arrow-tags';
//             leftDoubleArrow.addEventListener('click', (e) => {
//                 goToPageTags = 1;
//                 document.getElementById('go-to-page-tags').value = goToPageTags;
//                 createTagTable();
//             });
//             leftDoubleArrow.style.color = goToPageTags === 1 ? 'gray' : 'black';
//             leftDoubleArrow.innerHTML = '&#171;';
//             leftDoubleArrow.classList = 'left page-arrows';
//             leftArrowBox.prepend(leftDoubleArrow);
//             pageControlBar.prepend(leftArrowBox);
//             // Show # dropdown
//             let showDropdown = document.createElement('select');
//             showDropdown.id = 'show-record-count-tags';
//             showDropdown.value = showCountTags;
//             for (let i = 10; i <= 50; i += 10) {
//                 let option = document.createElement('option');
//                 option.value = i;
//                 option.innerText = i;
//                 option.id = `show-${i}`;
//                 if (showCountTags === i) option.selected = 'selected';
//                 showDropdown.appendChild(option);
//             }
//             showDropdown.addEventListener('change', (e) => {
//                 showCountTags = parseInt(e.target.value);
//                 document.getElementById('go-to-page-tags').max = Math.ceil(filteredRecordTags.length / showCountTags);
//                 createTagTable();
//             })
//             let showLabel = document.createElement('label');
//             showLabel.innerText = 'Show ';
//             pageControlBar.appendChild(showLabel);
//             pageControlBar.appendChild(showDropdown);
//             // Right Arrows
//             let rightArrowBox = document.createElement('div');
//             rightArrowBox.id = 'right-arrows-tags';
//             let rightSingleArrow = document.createElement('label');
//             rightSingleArrow.id = 'next-page-arrow-tags';
//             rightSingleArrow.addEventListener('click', (e) => {
//                 goToPageTags = goToPageTags !== pageCountTags ? goToPageTags + 1 : pageCountTags;
//                 document.getElementById('go-to-page-tags').value = goToPageTags;
//                 createTagTable();
//             });
//             rightSingleArrow.style.color = goToPageTags === pageCountTags ? 'gray' : 'black';
//             rightSingleArrow.innerHTML = '&#8250;';
//             rightSingleArrow.classList = 'right page-arrows';
//             rightArrowBox.appendChild(rightSingleArrow);

//             let rightDoubleArrow = document.createElement('label');
//             rightDoubleArrow.id = 'last-page-arrow-tags';
//             rightDoubleArrow.addEventListener('click', (e) => {
//                 goToPageTags = pageCountTags;
//                 document.getElementById('go-to-page-tags').value = goToPageTags;
//                 createTagTable();
//             });
//             rightDoubleArrow.style.color = goToPageTags === pageCountTags ? 'gray' : 'black';
//             rightDoubleArrow.innerHTML = '&#187;';
//             rightDoubleArrow.classList = 'right page-arrows';
//             rightArrowBox.appendChild(rightDoubleArrow);
//             pageControlBar.appendChild(rightArrowBox);
//             tagSection.appendChild(pageControlBar);
//         }
//         // aggregateRecords();
//     }
// };

// const grabRecords = (record) => {
//     // console.log('grabbing records');
//     let filteredRecord = record.filter(r => !removedApps.includes(r.app));
//     pageCount = filteredRecord.length === 0 ? 1 : Math.ceil(filteredRecord.length / showCount);
//     goToPage = goToPage > pageCount ? pageCount : goToPage;
//     if (document.getElementById('go-to-page')) document.getElementById('go-to-page').value = goToPage;
//     if (document.getElementById('go-to-page')) document.getElementById('go-to-page').max = pageCount;
//     if (document.getElementById('page-numbering')) document.getElementById('page-numbering').innerText = `Page ${goToPage} of ${pageCount}`;
//     if (document.getElementsByClassName('page-arrows').length > 0) {
//         [...document.getElementsByClassName('left')].forEach(arrow => {
//             arrow.style.color = goToPage === 1 ? 'gray' : 'black';
//         });
//         [...document.getElementsByClassName('right')].forEach(arrow => {
//             arrow.style.color = goToPage === pageCount ? 'gray' : 'black';
//         });
//     }
//     let recordSection = document.getElementById('record-section');
//     recordSection.style.position = 'absolute';
//     recordSection.style.top = tableTop || '5vh';
//     recordSection.style.left = tableLeft || '300px';
//     let table = document.createElement('table');
//     table.id = 'record-table';
//     let thead = document.createElement('thead');
//     let hr = document.createElement('tr');
//     hr.id = 'table-header';
//     let topLeftTH = document.createElement('th');
//     topLeftTH.id = 'tl-th';
//     topLeftTH.style.cursor = 'move';
//     // Make Record Table Draggable
//     var clickX, clickY, dragX, dragY;
//     recordSection.addEventListener('mousedown', (e) => {
//         if (e.target.id === 'tl-th') {
//             e = e || window.event;
//             e.preventDefault();
//             e.stopImmediatePropagation();
//             clickX = e.clientX;
//             clickY = e.clientY;
//             document.addEventListener('mousemove', calcTableLoc)
//         }
//     });
//     const calcTableLoc = (e) => {
//         e = e || window.event;
//         e.preventDefault();
//         dragX = clickX - e.clientX;
//         dragY = clickY - e.clientY;
//         clickX = e.clientX;
//         clickY = e.clientY;
//         tableTop = (recordSection.offsetTop - dragY) + 'px';
//         tableLeft = (recordSection.offsetLeft - dragX) + 'px';
//         recordSection.style.top = tableTop;
//         recordSection.style.left = tableLeft;
//     }
//     recordSection.addEventListener('mouseup', (e) => {
//         document.removeEventListener('mousemove', calcTableLoc);
//         recordSection.removeEventListener('mouseup', calcTableLoc);
//         let maxHeight;
//         if (tableTop) maxHeight = window.innerHeight - parseInt(tableTop.replace('px', '')) - (window.innerHeight * .05)
//         recordSection.style.maxHeight = maxHeight + 'px';
//     });
//     hr.appendChild(topLeftTH);
//     let header = ['app', 'title', 'start', 'end', 'duration', 'tags'];
//     header.forEach(h => {
//         let th = document.createElement('th');
//         th.innerHTML = `${h}<span style="line-height: 1.2">${sortByHeader[h] === 'asc' ? ' &#129041;' : sortByHeader[h] === 'desc' ? ' &#129043;' : ''}</span>`;
//         th.id = `header-${h}`;
//         th.addEventListener('click', (e) => {
//             let val = e.target.id.split('-')[1];
//             if (val !== 'search' && val) {
//                 sortByHeader[val] = sortByHeader[val] === '' ? 'asc' : sortByHeader[val] === 'asc' ? 'desc' : '';
//                 goToPage = 1;
//                 grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
//             }
//         });
//         hr.appendChild(th);
//         if (h === 'title') {
//             let input = document.createElement('input');
//             input.id = 'title-search-bar';
//             input.value = filterTitle || '';
//             input.addEventListener('change', (e) => {
//                 filterTitle = e.target.value;
//                 let relatedTags = tags.filter(t => t.name.toLowerCase().includes(filterTitle.toLowerCase())).map(t => t.id);
//                 grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase()) || r.tags.some(t => relatedTags.includes(t))) : globalRecords);
//                 document.getElementById('go-to-page').max = pageCount;
//             })
//             th.appendChild(input);
//         }
//     });
//     thead.appendChild(hr);
//     table.appendChild(thead);
//     let tbody = document.createElement('tbody');

//     let len = filteredRecord.length === 0 ? 1 : filteredRecord.length > showCount ? showCount : filteredRecord.length; //records.length;

//     Object.keys(sortByHeader).forEach(key => {
//         if (sortByHeader[key].length > 0) filteredRecord = sortByHeader[key] === 'asc' ? filteredRecord.sort((a, b) => a[key] > b[key] ? 1 : -1) : filteredRecord.sort((a, b) => a[key] < b[key] ? 1 : -1);
//     })
//     visibleRecords = [];
//     for (let i = (goToPage - 1) * showCount; i < (goToPage * showCount) - (goToPage === pageCount ? showCount - (filteredRecord.length % showCount) : 0); i++) {
//         let tr = document.createElement('tr');
//         tr.id = len > 1 ? `record-${filteredRecord[i].id}` : 'no-row';
//         if (len > 1) visibleRecords.push(filteredRecord[i].id);
//         tr.classList = 'record-row';
//         let firstCol = document.createElement('td');
//         firstCol.classList = 'check-col';
//         let checkbox = document.createElement('input');
//         checkbox.type = 'checkbox';
//         checkbox.checked = len > 1 ? filteredRecord[i].checked : false;
//         checkbox.id = len > 1 ? `check-record-${filteredRecord[i].id}` : 'no-record';
//         // CREATE EVENT LISTENER WHEN CHECKBOX IS CHANGED OR ROW IS CLICKED ON TO UPDATE CHECKED STATUS OF THE GLOBAL RECORD
//         checkbox.addEventListener('change', (e) => {
//             e.stopImmediatePropagation();
//             let id = e.target.id.substring('check-record-'.length);
//             globalRecords[id].checked = e.target.checked;
//             aggregateRecords();
//         });
//         tr.addEventListener('click', (e) => {
//             if (e.target.tagName !== 'INPUT') {
//                 if (![...e.target.classList][0].includes('tag')) {
//                     let id = [...e.target.classList][0].includes('tool') ? e.target.parentElement.parentElement.id.substring('record-'.length) : e.target.parentElement.id.substring('record-'.length);
//                     let cb = document.getElementById(`check-record-${id}`);
//                     globalRecords[id].checked = !cb.checked;
//                     // If visible toggle tag table check
//                     if (document.querySelector(`#check-tag-${id}`)) document.querySelector(`#check-tag-${id}`).checked = !cb.checked;
//                     cb.checked = !cb.checked;
//                     ['tag-table', 'record-table'].forEach(tbl => {
//                         if (document.getElementById(tbl)) {
//                             let selectAllVisibleID = tbl === 'tag-table' ? 'select-all-visible-tags' : 'select-all-visible';
//                             let visibleCount = [...document.getElementById(tbl).querySelectorAll('tr')].length - 1;
//                             let selectAllVisible = document.getElementById(selectAllVisibleID);
//                             let visibleChecked = [...document.getElementById(tbl).querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== selectAllVisibleID).length;
//                             if (visibleChecked === visibleCount) {
//                                 selectAllVisible.checked = true;
//                                 selectAllVisible.indeterminate = false;
//                             }
//                             if (visibleChecked < visibleCount) {
//                                 selectAllVisible.checked = false;
//                                 selectAllVisible.indeterminate = true;
//                                 if (visibleChecked === 0) {
//                                     selectAllVisible.checked = false;
//                                     selectAllVisible.indeterminate = false;
//                                 }
//                             }
//                         }
//                     })
//                     aggregateRecords();
//                 }
//             }
//         });
//         firstCol.appendChild(checkbox);
//         tr.appendChild(firstCol);
//         let row = [];
//         header.forEach(col => filteredRecord.length > 0 ? row.push(filteredRecord[i][col]) : row.push(''));
//         row.map((val, index) => {
//             let td = document.createElement('td');
//             td.innerText = val;
//             if (index === 0) td.classList = 'app-col';
//             if (index === 1) {
//                 let tooltTip = document.createElement('span');
//                 tooltTip.classList = 'tool-tip';
//                 tooltTip.innerText = val;
//                 td.appendChild(tooltTip);
//                 td.classList = 'title-col';
//                 td.addEventListener('mouseover', (e) => {
//                     let coord = e.target.getBoundingClientRect();
//                     tooltTip.style.left = coord.x + 'px';
//                     tooltTip.style.top = coord.y + .4 + 'px';
//                 })
//             }
//             if (index >= 2 && index <= 4) td.classList = 'time-col';
//             if (index === 5) {
//                 td.innerText = '';
//                 td.classList = 'tags-col';
//                 td.addEventListener('mouseenter', (e) => {
//                     if (!document.getElementById('tag-search')) {
//                         let addTag = document.createElement('span');
//                         addTag.classList = 'add-tag';
//                         addTag.innerText = '+';
//                         td.appendChild(addTag);
//                         addTag.addEventListener('click', (e) => {
//                             let addTagDiv = document.createElement('div');
//                             addTagDiv.style.display = 'inline-block';
//                             let tagSearch = document.createElement('input');
//                             tagSearch.id = 'tag-search';
//                             tagSearch.type = 'text';
//                             tagSearch.addEventListener('focus', searchTags);
//                             tagSearch.addEventListener('keyup', searchTags);
//                             tagSearch.addEventListener('blur', removeSearchTagsDropdown);
//                             addTagDiv.appendChild(tagSearch);
//                             td.appendChild(addTagDiv);
//                             document.getElementById('tag-search').focus();
//                             addTag.remove();
//                         });
//                     }
//                 });
//                 td.addEventListener('mouseleave', (e) => {
//                     let addTag = document.getElementsByClassName('add-tag')[0];
//                     if (addTag) addTag.remove();
//                 });
//             }
//             tr.appendChild(td);
//         })
//         tbody.appendChild(tr);
//     }
//     table.appendChild(tbody);
//     let selectAllVisible = document.createElement('input');
//     selectAllVisible.id = 'select-all-visible';
//     selectAllVisible.type = 'checkbox';
//     let visibleChecked = [...table.querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== 'select-all-visible').length;
//     let visibleCount = [...table.querySelectorAll('tr')].length - 1;
//     if (visibleChecked === visibleCount) {
//         selectAllVisible.checked = true;
//         selectAllVisible.indeterminate = false;
//     }
//     if (visibleChecked < visibleCount) {
//         selectAllVisible.checked = false;
//         selectAllVisible.indeterminate = true;
//         if (visibleChecked === 0) {
//             selectAllVisible.checked = false;
//             selectAllVisible.indeterminate = false;
//         }
//     }
//     selectAllVisible.addEventListener('change', (e) => {
//         let allCheckboxes = [...table.querySelectorAll('input[type="checkbox"]')].filter(c => c.id !== 'select-all-visible')
//         allCheckboxes.forEach(i => {
//             let id = i.id.split('-')[2];
//             globalRecords[id].checked = selectAllVisible.checked;
//             if (document.querySelector(`#check-tag-${id}`)) document.querySelector(`#check-tag-${id}`).checked = selectAllVisible.checked;
//             i.checked = selectAllVisible.checked;
//         });
//         ['tag-table', 'record-table'].forEach(tbl => {
//             if (document.getElementById(tbl)) {
//                 let selectAllVisibleID = tbl === 'tag-table' ? 'select-all-visible-tags' : 'select-all-visible';
//                 let visibleCount = [...document.getElementById(tbl).querySelectorAll('tr')].length - 1;
//                 let selectAllVisible = document.getElementById(selectAllVisibleID);
//                 let visibleChecked = [...document.getElementById(tbl).querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== selectAllVisibleID).length;
//                 if (visibleChecked === visibleCount) {
//                     selectAllVisible.checked = true;
//                     selectAllVisible.indeterminate = false;
//                 }
//                 if (visibleChecked < visibleCount) {
//                     selectAllVisible.checked = false;
//                     selectAllVisible.indeterminate = true;
//                     if (visibleChecked === 0) {
//                         selectAllVisible.checked = false;
//                         selectAllVisible.indeterminate = false;
//                     }
//                 }
//             }
//         })
//     })
//     topLeftTH.appendChild(selectAllVisible)
//     if (document.getElementById('record-table')) document.getElementById('record-table').remove();
//     recordSection.prepend(table);

//     // Draw tags after table is drawn
//     document.getElementById('record-table').childNodes[1].childNodes.forEach(row => {
//         if (globalRecords[row.id.substring(row.id.indexOf('-') + 1)]) {
//             let val = globalRecords[row.id.substring(row.id.indexOf('-') + 1)].tags;
//             drawTag(val, row.id)
//         }
//     })

//     if (document.getElementById('page-controls') === null) { //document.getElementById('page-controls').remove();
//         let pageControlBar = document.createElement('div');
//         pageControlBar.id = 'page-controls';
//         // Go to Page
//         let goToPageLabel = document.createElement('label');
//         let goToPageInput = document.createElement('input');
//         goToPageLabel.innerText = 'Go to Page:';
//         goToPageInput.type = 'number';
//         goToPageInput.id = 'go-to-page';
//         goToPageInput.value = goToPage;
//         goToPageInput.min = 1;
//         goToPageInput.max = pageCount;
//         goToPageInput.addEventListener('change', (e) => {
//             goToPage = e.target.value > pageCount ? parseInt(pageCount) : parseInt(e.target.value);
//             if (!isNaN(goToPage)) document.getElementById('go-to-page').value = goToPage;
//             if (goToPage < 1 || isNaN(goToPage)) {
//                 goToPage = 1;
//                 document.getElementById('go-to-page').value = 1;
//             }
//             grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
//         });
//         pageControlBar.appendChild(goToPageLabel);
//         pageControlBar.appendChild(goToPageInput);
//         // Page # of #
//         let pageNumLabel = document.createElement('label');
//         pageNumLabel.innerText = `Page ${goToPage} of ${pageCount}`;
//         pageNumLabel.id = 'page-numbering';
//         pageControlBar.prepend(pageNumLabel);
//         // Left Arrows
//         let leftArrowBox = document.createElement('div');
//         leftArrowBox.id = 'left-arrows';
//         let leftSingleArrow = document.createElement('label');
//         leftSingleArrow.id = 'previous-page-arrow';
//         leftSingleArrow.addEventListener('click', (e) => {
//             goToPage = goToPage !== 1 ? goToPage - 1 : 1;
//             document.getElementById('go-to-page').value = goToPage;
//             grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
//         });
//         leftSingleArrow.style.color = goToPage === 1 ? 'gray' : 'black';
//         leftSingleArrow.innerHTML = '&#8249;';
//         leftSingleArrow.classList = 'left page-arrows';
//         leftArrowBox.prepend(leftSingleArrow);

//         let leftDoubleArrow = document.createElement('label');
//         leftDoubleArrow.id = 'first-page-arrow';
//         leftDoubleArrow.addEventListener('click', (e) => {
//             goToPage = 1;
//             document.getElementById('go-to-page').value = goToPage;
//             grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
//         });
//         leftDoubleArrow.style.color = goToPage === 1 ? 'gray' : 'black';
//         leftDoubleArrow.innerHTML = '&#171;';
//         leftDoubleArrow.classList = 'left page-arrows';
//         leftArrowBox.prepend(leftDoubleArrow);
//         pageControlBar.prepend(leftArrowBox);
//         // Show # dropdown
//         let showDropdown = document.createElement('select');
//         showDropdown.id = 'show-record-count';
//         showDropdown.value = showCount;
//         for (let i = 10; i <= 50; i += 10) {
//             let option = document.createElement('option');
//             option.value = i;
//             option.innerText = i;
//             option.id = `show-${i}`;
//             if (showCount === i) option.selected = 'selected';
//             showDropdown.appendChild(option);
//         }
//         showDropdown.addEventListener('change', (e) => {
//             showCount = parseInt(e.target.value);
//             document.getElementById('go-to-page').max = Math.ceil(filteredRecord.length / showCount);
//             grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
//         })
//         let showLabel = document.createElement('label');
//         showLabel.innerText = 'Show ';
//         pageControlBar.appendChild(showLabel);
//         pageControlBar.appendChild(showDropdown);
//         // Right Arrows
//         let rightArrowBox = document.createElement('div');
//         rightArrowBox.id = 'right-arrows';
//         let rightSingleArrow = document.createElement('label');
//         rightSingleArrow.id = 'next-page-arrow';
//         rightSingleArrow.addEventListener('click', (e) => {
//             goToPage = goToPage !== pageCount ? goToPage + 1 : pageCount;
//             document.getElementById('go-to-page').value = goToPage;
//             grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
//         });
//         rightSingleArrow.style.color = goToPage === pageCount ? 'gray' : 'black';
//         rightSingleArrow.innerHTML = '&#8250;';
//         rightSingleArrow.classList = 'right page-arrows';
//         rightArrowBox.appendChild(rightSingleArrow);

//         let rightDoubleArrow = document.createElement('label');
//         rightDoubleArrow.id = 'last-page-arrow';
//         rightDoubleArrow.addEventListener('click', (e) => {
//             goToPage = pageCount;
//             document.getElementById('go-to-page').value = goToPage;
//             grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
//         });
//         rightDoubleArrow.style.color = goToPage === pageCount ? 'gray' : 'black';
//         rightDoubleArrow.innerHTML = '&#187;';
//         rightDoubleArrow.classList = 'right page-arrows';
//         rightArrowBox.appendChild(rightDoubleArrow);
//         pageControlBar.appendChild(rightArrowBox);
//         recordSection.appendChild(pageControlBar);
//     }
//     resizeTableColumns();
//     aggregateRecords();
// };

const createHandleListeners = (handle) => {
    let pageX, currentColumn, nextColumn, currentColumnWidth, nextColumnWidth;
    handle.addEventListener('mousedown', (e) => {
        currentColumn = e.target.parentElement;
        nextColumn = currentColumn.nextElementSibling;
        pageX = e.pageX;
        currentColumnWidth = currentColumn.offsetWidth;
        if (nextColumn) nextColumnWidth = nextColumn.offsetWidth;

        document.addEventListener('mousemove', (e) => {
            let changeX;
            if (currentColumn) changeX = e.pageX - pageX;
            if (nextColumn) {
                nextColumn.style.width = `${nextColumnWidth - changeX}px`;
                currentColumn.style.width = `${currentColumnWidth + changeX}px`;
            };
        });

        document.addEventListener('mouseup', (e) => {
            pageX = undefined;
            currentColumn = undefined;
            nextColumn = undefined;
            currentColumnWidth = undefined;
            nextColumnWidth = undefined;
        })
    });
}

const resizeTableColumns = () => {
    let table = document.getElementById('record-table');
    let row = table.getElementsByTagName('tr')[0];
    let columns = row ? row.children : undefined;
    if (!columns) return;

    let existingHandles = [...document.getElementsByClassName('handle')]
    let newHandles = existingHandles.length > 0 ? false : true;
    let handle;

    for (let i = 0; i < columns.length - 1; i++) {
        if (newHandles) {
            handle = document.createElement('div');
            handle.classList = 'handle';
            columns[i].appendChild(handle);
            columns[i].style.position = 'relative';
        }
        if (!newHandles) handle = existingHandles[i];
        handle.style.height = table.offsetHeight - 2 + 'px';
        if (i === 0) handle.classList.add('checkbox-border')
        if (i > 0) createHandleListeners(handle);
    }
};

const refreshFilterResults = () => {
    const appDrawer = document.getElementById('app-drawer');
    const apps = [...appDrawer.getElementsByTagName('input')].filter(box => box.value !== 'Unselect All');
    //console.log(apps);
    appDrawer.remove();
    // console.log("Removed",removedApps);
    // console.log('Not Checked',apps.filter(app => !app.checked));
    if (removedApps.length > 0) {
        removedApps.forEach(app => {
            if (document.getElementById(`hidden-${app}`)) {
                document.getElementById(`app-${app}`).checked = false;
                // console.log('hidden-',app);
                // console.log(document.getElementById(`app-${app}`).checked)
            };
        })
    }
    removedApps = refreshedApps ? [...new Set(apps.filter(app => !app.checked).map(app => app.value))].sort() : [...removedApps, ...apps.filter(app => !app.checked).map(app => app.value)].sort();
    let checkedApps = apps.filter(app => app.checked)
    //console.log("Checked",checkedApps);
    checkedApps = checkedApps.map(app => app.value).sort();
    let updatedApps = [...checkedApps, ...removedApps];
    //console.log("Updated",updatedApps);
    refreshedApps = removedApps.length > 0 ? true : false;
    createAppFilter(updatedApps);
    filterTitle = '';
    createTable('record');
    //grabRecords(globalRecords);
}

const filterBoxRechecked = () => {
    let appDrawer = document.getElementById('app-drawer');
    if (removedApps.length === 1) refreshFilterResults();
    else if (appDrawer.getElementsByTagName('button').length === 0) {
        let refreshButton = document.createElement('button');
        refreshButton.id = 'refresh-button';
        refreshButton.innerText = 'Refresh Results';
        refreshButton.addEventListener('click', refreshFilterResults);
        appDrawer.appendChild(refreshButton);
    }
}
const createAppFilter = (apps) => {
    let container = document.getElementById('container');
    if (document.getElementById('app-drawer')) document.getElementById('app-drawer').remove();
    let appDrawer = document.createElement('div');
    appDrawer.id = 'app-drawer';
    // create right border for app drawer
    if (!document.getElementById('app-drawer-border')) {
        let adRightBorder = document.createElement('div');
        adRightBorder.id = 'app-drawer-border';
        container.appendChild(adRightBorder);
    }


    let unselectAllLabel, unselectAllInput, unselectAllDiv;
    if (document.getElementById('unselect-all-apps') === null) {
        unselectAllDiv = document.createElement('div');
        unselectAllInput = document.createElement('input');
        unselectAllInput.type = 'checkbox';
        unselectAllInput.checked = true;
        unselectAllInput.classList = 'app-filter';
        unselectAllInput.id = 'unselect-all-apps';
        unselectAllInput.value = 'Unselect All';
        unselectAllInput.name = 'Unselect All';

        unselectAllLabel = document.createElement('label');
        unselectAllLabel.for = 'Unselect All';
        unselectAllLabel.innerText = 'Unselect All';
        unselectAllLabel.classList = 'app-filter';
    }

    // apps = refreshedApps ? apps : apps.sort();
    apps = apps.sort();

    apps.forEach(app => {
        let div = document.createElement('div');
        let input = document.createElement('input');
        let appName = app;
        // let appName = app.replace('.exe', '').replace('.EXE', '');
        if (removedApps.includes(appName)) div.classList = 'hidden';
        if (removedApps.includes(appName)) div.id = `hidden-${appName}`;
        input.type = 'checkbox';
        input.checked = removedApps.includes(appName) ? false : true;
        input.classList = 'app-filter';
        input.id = `app-${appName}`;
        input.value = appName;
        input.name = appName;
        input.addEventListener('change', (e) => {
            e.target.checked ? filterBoxRechecked() : refreshFilterResults();
        });
        div.appendChild(input);

        let label = document.createElement('label');
        label.for = appName;
        label.innerText = appName;
        label.classList = 'app-filter';
        label.addEventListener('click', (e) => {
            let checkbox = document.getElementById('app-' + e.target.for);
            checkbox.checked = checkbox.checked ? !checkbox.checked : !checkbox.checked;
            checkbox.checked ? filterBoxRechecked() : refreshFilterResults();
        });
        div.appendChild(label);

        appDrawer.appendChild(div);
    });
    let prevRemoved = document.createElement('a');
    if (refreshedApps) {
        prevRemoved.id = 'prev-removed';
        prevRemoved.innerText = 'Load previously removed applications...';
        prevRemoved.href = '';
        prevRemoved.onclick = (e) => {
            e.preventDefault();
            document.getElementById('prev-removed').remove();
            refreshedApps = true;
            removedApps.forEach(app => {
                if (document.getElementById(`hidden-${app}`)) document.getElementById(`hidden-${app}`).classList.remove('hidden')
            });
        }
    }
    if (document.getElementById('unselect-all-apps') === null) {
        unselectAllInput.addEventListener('change', (e) => {
            unselectAllLabel.innerText = e.target.checked ? 'Unselect All' : 'Select All';
            apps.forEach(app => {
                document.getElementById(`app-${app}`).checked = e.target.checked;
            });
            if (!e.target.checked) {
                removedApps = apps.filter(app => app !== 'Unselect All');
                refreshedApps = true;
            }
            if (refreshedApps && e.target.checked) {
                removedApps = [...document.getElementsByClassName('hidden')].map(h => h.id.substring('hidden-'.length));
                refreshFilterResults();
            }
            filteredRecords = filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords;
            createTable('record');
            //grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
        });
        unselectAllLabel.addEventListener('click', () => {
            let checkbox = document.getElementById('unselect-all-apps');
            checkbox.checked = checkbox.checked ? !checkbox.checked : !checkbox.checked;
            unselectAllLabel.innerText = checkbox.checked ? 'Unselect All' : 'Select All';
            apps.forEach(app => {
                document.getElementById(`app-${app}`).checked = checkbox.checked;
            });
            if (!checkbox.checked) {
                removedApps = apps.filter(app => app !== 'Unselect All');
                refreshedApps = true;
            }
            if (refreshedApps && checkbox.checked) {
                removedApps = [...document.getElementsByClassName('hidden')].map(h => h.id.substring('hidden-'.length));
                refreshFilterResults();
            }
            filteredRecords = filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords;
            createTable('record');
            // grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
        });
        unselectAllDiv.appendChild(unselectAllInput);
        unselectAllDiv.appendChild(unselectAllLabel);
        appDrawer.prepend(unselectAllDiv);
    }

    appDrawer.appendChild(prevRemoved);
    container.prepend(appDrawer);
    // if (removedApps.length > 0) //console.log(removedApps);
    container.style.textAlign = 'left';
    container.style.alignItems = 'normal';
    container.style.justifyContent = 'flex-start';
}

const createDragAndDropArea = () => {
    let dragAndDrop = document.createElement('div');
    dragAndDrop.id = 'drag-n-drop';
    ['dragenter', 'dragover'].forEach(type => {
        dragAndDrop.addEventListener(type, (e) => {
            e.preventDefault();
            dragAndDrop.classList.add('highlight');
            if (document.getElementById('container').childElementCount > 1) document.getElementById('error-invalid').remove();
        });
    });
    dragAndDrop.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragAndDrop.classList.remove('highlight');
    });
    dragAndDrop.addEventListener('drop', (e) => {
        let dataTransfer = e.dataTransfer;
        let files = dataTransfer.files;
        parseFile(files);
    });
    dragAndDrop.addEventListener('mouseenter', (e) => {
        document.getElementById('drag-n-drop').remove();
        e.stopImmediatePropagation();
    })
    // //console.log(document.body.children);
    document.body.appendChild(dragAndDrop);
    document.addEventListener('mouseleave', (e) => {
        if (dataLoaded === false) createDragAndDropArea();
        e.stopImmediatePropagation();
    })
}