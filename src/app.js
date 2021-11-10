let dataLoaded = false;
let refreshedApps = false;
let removedApps = [];
let globalRecords = [];
// let filterBoxRechecked = false;
let chartIncludeRemoved = true;
let showCount = 10;
let goToPage = 1;
let pageCount = 1;
let showCountTags = 10;
let goToPageTags = 1;
let pageCountTags = 1;
let tableTop, tableLeft, tagTableTop, tagTableLeft;
let tableTab = document.createElement('div');
let filterTitle = '';
let editMode = false;
let sortByHeader = {
    app: '',
    title: '',
    start: '',
    end: '',
    duration: '',
}
let tags = [];
let dWR = []; // Days With Records
let visibleRecords, tagVisibleRecords;
let tagID;

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
        if (!dWR.includes(e.target.value)) dateInput.style.color = 'red';
        else dateInput.style.removeProperty('color');
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
        };
        if (e.key === 'M' && e.ctrlKey && e.shiftKey && dataLoaded) {
            console.log('Minimizing All');
        }
        if ((e.key === '-' && e.ctrlKey) || (e.key === '+' && e.ctrlKey && e.shiftKey)) {
            // console.log('resize font');
            resizeTableColumns();
        }
    });
});

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
    if (document.getElementsByClassName('close-button')[0]) document.getElementsByClassName('close-button')[0].remove();
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
    let durationVals = [active, all].map(dur => {
        let hh = ((Math.floor(dur / 3600) < 10) ? ("0" + Math.floor(dur / 3600)) : Math.floor(dur / 3600));
        let mm = ((Math.floor(dur % 3600 / 60) < 10) ? ("0" + Math.floor(dur % 3600 / 60)) : Math.floor(dur % 3600 / 60));
        let ss = ((Math.floor(dur % 3600 % 60) < 10) ? ("0" + Math.floor(dur % 3600 % 60)) : Math.floor(dur % 3600 % 60));
        return `${hh}:${mm}:${ss}`;
    });

    let durationDiv = document.getElementById('duration');
    durationDiv.innerText = chartIncludeRemoved ? `Duration (hh:mm:ss): ${durationVals[0]} / ${durationVals[1]}` : `Duration (hh:mm:ss): ${durationVals[0]}`;
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
    let title = `Zoom from: ${zoomOrigin.app}`;
    if (zoomOrigin.tags.length > 0) zoomOrigin.tags.forEach(t => row.tags.push(t));
    if (zoomOrigin.tags.length === 0) {
        let title = zoomOrigin.app === 'Slack' ? `${zoomOrigin.title.split('|')[0].trim()} - ${zoomOrigin.title.split('|')[1].trim()}` : zoomOrigin.title
        if (tags.filter(tag => tag.name === title).length === 0) createNewTag(title, row.tags, row.id)
        else {
            globalRecords[row.id].tags.push(tags.filter(tag => tag.name === title)[0].id);
            if (visibleRecords.includes(row.id)) drawTag(globalRecords[row.id].tags, 'record-' + row.id);
        }
    }
    if (tags.filter(tag => tag.name === title).length === 0) createNewTag(title, row.tags, row.id)
    if (tags.filter(tag => tag.name === title).length > 0 && !globalRecords[row.id].tags.includes(tags.filter(tag => tag.name === title)[0].id)) {
        globalRecords[row.id].tags.push(tags.filter(tag => tag.name === title)[0].id);
        if (visibleRecords.includes(row.id)) drawTag(globalRecords[row.id].tags, 'record-' + row.id);
    }
}

const postDataRetrieval = (records) => {
    document.getElementById('date-input').value = records[0].start.split(' ')[0];
    globalRecords = records;
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
    grabRecords(records);

    // Auto Tagging - filters are currently hardcoded to specific outputs related to our tooling. May implement custom filter creation when database or local storage are added
    let filters = [/0[2-3]\d{6}\s?\-?/, /[A-Z]{3,7}\-\d+/, /[P-p]ower [A-a]utomate|\b[F-f]low[s]?\b/, /[J-j]ira/, /[S-s]alesforce /, /DRAFT \-/, /relonemajorincidentmgrtransitions/, / [T-t]ransition/, /\(?rca|RCA\)?/]
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
        // console.log(row);
        let zoomConnectionId;
        if ((row.app === 'Zoom' && (row.title === 'Connecting…' || (row.title === 'Zoom Meeting' && !zoomOrigin))) || (row.app !== 'Zoom')) {
            zoomConnectionId = row.id
            for (let i = zoomConnectionId - 6; i < zoomConnectionId; i++) {
                if (globalRecords[i].app === 'Outlook' || (globalRecords[i].app === 'Slack')) zoomOrigin = globalRecords[i];
                // if (globalRecords[i].app === 'Outlook' || (globalRecords[i].app === 'Slack' && !globalRecords[i].title.includes('Threads'))) zoomOrigin = globalRecords[i];
                // console.log('Row:', zoomConnectionId, globalRecords[i], 'Zoom Origin', zoomOrigin);
            }
            // console.log(zoomOrigin)
            // if (zoomOrigin.id) {
            //     // console.log(row);
            //     addTagsToZoomMeetings(zoomOrigin, row)
            // }
        };
        // console.log(row.id,row.title,zoomOrigin);
        if (zoomOrigin) {
            addTagsToZoomMeetings(zoomOrigin, row)
            if (row.title === 'End Meeting or Leave Meeting?') zoomOrigin = null;
        }
    });

    if (!document.getElementById('download-csv')) {

        let downloadBttn = document.createElement('button');
        downloadBttn.id = 'download-csv';
        downloadBttn.addEventListener('click', (e) => {
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
                    setTimeout(() => {
                        downloadSuccess.remove();
                    }, 2500);
                }
            });
        });
        downloadBttn.innerText = 'Download CSV';
        document.body.appendChild(downloadBttn);
    }

}

const cleanUpAppName = (app) => {
    let upperCase = /[A-Z]{4}/;
    app = upperCase.test(app) ? (app[0].toUpperCase() + app.substring(1).toLowerCase()).replace('Onenote', 'OneNote') : app[0].toUpperCase() + app.substring(1);
    return app.replace('.exe', '').replace('.EXE', '');
}

const createNewTag = (name, val, recordID) => {
    let record = globalRecords[recordID];
    record.tags.push(tags.length);
    tags.push({ 'id': tags.length, name });
    let rowID = `record-${recordID}`;
    [...document.getElementById('record-table').childNodes[1].childNodes].forEach(row => {
        if (row.id.includes(rowID)) {
            drawTag(val, rowID)
        }
    })
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
                    drawTag(record.tags, `record-${record.id}`);
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
    let td = document.getElementById(rowID).childNodes.length > 5 ? document.getElementById(rowID).childNodes[6] : document.getElementById(rowID).childNodes[4];
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
                    let idToRemove = parseInt(e.target.parentNode.classList[1].split('-')[1]);
                    if (/^\d+$/.test(idToRemove)) {
                        let id = e.target.parentNode.parentNode.parentNode.id.substring('record-'.length);
                        globalRecords[id].tags = globalRecords[id].tags.filter(t => t !== idToRemove);
                        tag.remove();
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
                // console.log(tagID)
                createTagTable();
            })
            td.appendChild(tag);
        }
    })
}

const createTagTable = () => {
    if (!document.getElementById('tag-section')) {
        let tagSection = document.createElement('div');
        tagSection.id = 'tag-section';
        document.getElementById('container').appendChild(tagSection);
    }

    let filteredRecordTags = globalRecords.filter(r => r.tags.includes(parseInt(tagID)));

    pageCountTags = filteredRecordTags.length === 0 ? 1 : Math.ceil(filteredRecordTags.length / showCountTags);
    goToPageTags = goToPageTags > pageCountTags ? pageCountTags : goToPageTags;
    if (document.getElementById('go-to-page-tags')) document.getElementById('go-to-page-tags').value = goToPageTags;
    if (document.getElementById('go-to-page-tags')) document.getElementById('go-to-page-tags').max = pageCountTags;
    if (document.getElementById('page-numbering-tags')) document.getElementById('page-numbering-tags').innerText = `Page ${goToPageTags} of ${pageCountTags}`;
    if (document.getElementsByClassName('page-arrows-tags').length > 0) {
        [...document.getElementsByClassName('left')].forEach(arrow => {
            arrow.style.color = goToPageTags === 1 ? 'gray' : 'black';
        });
        [...document.getElementsByClassName('right')].forEach(arrow => {
            arrow.style.color = goToPageTags === pageCountTags ? 'gray' : 'black';
        });
    }


    let tagSection = document.getElementById('tag-section');
    tagSection.style.position = 'absolute';
    tagSection.style.top = tagTableTop || '41vh';
    tagSection.style.left = tagTableLeft || '300px';
    let table = document.createElement('table');
    table.id = 'tag-table';
    let thead = document.createElement('thead');
    let hr = document.createElement('tr');
    hr.id = 'tag-table-header';
    let topLeftTH = document.createElement('th');
    topLeftTH.id = 'tag-tl-th';
    topLeftTH.style.cursor = 'move';
    // Make Record Table Draggable
    var clickX, clickY, dragX, dragY;
    tagSection.addEventListener('mousedown', (e) => {
        if (e.target.id === 'tag-tl-th') {
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
        tagTableTop = (tagSection.offsetTop - dragY) + 'px';
        tagTableLeft = (tagSection.offsetLeft - dragX) + 'px';
        tagSection.style.top = tagTableTop;
        tagSection.style.left = tagTableLeft;
    }
    tagSection.addEventListener('mouseup', (e) => {
        document.removeEventListener('mousemove', calcTableLoc);
        tagSection.removeEventListener('mouseup', calcTableLoc);
        let maxHeight;
        if (tagTableTop) maxHeight = window.innerHeight - parseInt(tagTableTop.replace('px', '')) - (window.innerHeight * .05)
        tagSection.style.maxHeight = maxHeight + 'px';
    });
    hr.appendChild(topLeftTH);
    let header = ['app', 'title', 'duration', 'tags'];
    header.forEach(h => {
        let th = document.createElement('th');
        th.innerHTML = h.replace(h[0],h[0].toUpperCase());
        th.id = `tag-header-${h}`;
        hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    let tbody = document.createElement('tbody');
    
    let len = filteredRecordTags.length === 0 ? 1 : filteredRecordTags.length > showCountTags ? showCountTags : filteredRecordTags.length; 

    tagVisibleRecords = [];
    for (let i = (goToPageTags - 1) * showCountTags; i < (goToPageTags * showCountTags) - (goToPageTags === pageCountTags ? showCountTags - (filteredRecordTags.length % showCountTags) : 0); i++) {
        let tr = document.createElement('tr');
        tr.id = len > 1 ? `tag-${filteredRecordTags[i].id}` : 'no-row';
        // if (len > 1) tagVisibleRecords.push(filteredRecordTags[i].id);
        tr.classList = 'tag-row';
        let firstCol = document.createElement('td');
        firstCol.classList = 'check-col';
        let checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = len > 1 ? filteredRecordTags[i].checked : false;
        checkbox.id = len > 1 ? `check-tag-${filteredRecordTags[i].id}` : 'no-record';
        // CREATE EVENT LISTENER WHEN CHECKBOX IS CHANGED OR ROW IS CLICKED ON TO UPDATE CHECKED STATUS OF THE GLOBAL RECORD
        checkbox.addEventListener('change', (e) => {
            e.stopImmediatePropagation();
            let id = e.target.id.substring('check-tag-'.length);
            globalRecords[id].checked = e.target.checked;
            // aggregateRecords();
        });
        tr.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                if (![...e.target.classList][0].includes('tag')) {
                    let id = [...e.target.classList][0].includes('tool') ? e.target.parentElement.parentElement.id.substring('tag-'.length) : e.target.parentElement.id.substring('tag-'.length);
                    let cb = document.getElementById(`check-tag-${id}`);
                    globalRecords[id].checked = !cb.checked;
                    cb.checked = !cb.checked;
                    let sAV = document.getElementById('select-all-visible-tags');
                    let visibleChecked = [...table.querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== 'select-all-visible-tags').length;
                    if (visibleChecked === showCount) {
                        sAV.checked = true;
                        sAV.indeterminate = false;
                    }
                    if (visibleChecked < showCount) {
                        sAV.checked = false;
                        sAV.indeterminate = true;
                        if (visibleChecked === 0) {
                            sAV.checked = false;
                            sAV.indeterminate = false;
                        }
                    }
                    // aggregateRecords();
                }
            }
        });
        firstCol.appendChild(checkbox);
        tr.appendChild(firstCol);
        let row = [];
        header.forEach(col => filteredRecordTags.length > 0 ? row.push(filteredRecordTags[i][col]) : row.push(''));
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
            if (index === 2) td.classList = 'time-col';
            if (index === 3) {
                td.innerText = '';
                td.classList = 'tags-col';
            }
            tr.appendChild(td);
        })
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    let selectAllVisible = document.createElement('input');
    selectAllVisible.id = 'select-all-visible-tags';
    selectAllVisible.type = 'checkbox';
    let visibleChecked = [...table.querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== 'select-all-visible-tags').length;
    if (visibleChecked === showCount) {
        selectAllVisible.checked = true;
        selectAllVisible.indeterminate = false;
    }
    if (visibleChecked < showCount) {
        selectAllVisible.checked = false;
        selectAllVisible.indeterminate = true;
        if (visibleChecked === 0) {
            selectAllVisible.checked = false;
            selectAllVisible.indeterminate = false;
        }
    }
    selectAllVisible.addEventListener('change', (e) => {
        let allCheckboxes = [...table.querySelectorAll('input[type="checkbox"]')].filter(c => c.id !== 'select-all-visible-tags')
        allCheckboxes.forEach(i => {
            globalRecords[i.id.substring('check-tag-'.length)].checked = selectAllVisible.checked;
            i.checked = selectAllVisible.checked;
        });
    })
    topLeftTH.appendChild(selectAllVisible)
    if (document.getElementById('tag-table')) document.getElementById('tag-table').remove();
    tagSection.prepend(table);

    // Draw tags after table is drawn
    document.getElementById('tag-table').childNodes[1].childNodes.forEach(row => {
        if (globalRecords[row.id.substring(row.id.indexOf('-') + 1)]) {
            let val = globalRecords[row.id.substring(row.id.indexOf('-') + 1)].tags;
            drawTag(val, row.id)
        }
    })

    if (document.getElementById('tag-page-controls') === null) { //document.getElementById('page-controls').remove();
        let pageControlBar = document.createElement('div');
        pageControlBar.id = 'tag-page-controls';
        // Go to Page
        let goToPageLabel = document.createElement('label');
        let goToPageInput = document.createElement('input');
        goToPageLabel.innerText = 'Go to Page:';
        goToPageInput.type = 'number';
        goToPageInput.id = 'go-to-page-tags';
        goToPageInput.value = goToPageTags;
        goToPageInput.min = 1;
        goToPageInput.max = pageCountTags;
        goToPageInput.addEventListener('change', (e) => {
            goToPageTags = e.target.value > pageCountTags ? parseInt(pageCountTags) : parseInt(e.target.value);
            if (!isNaN(goToPageTags)) document.getElementById('go-to-page-tags').value = goToPageTags;
            if (goToPageTags < 1 || isNaN(goToPageTags)) {
                goToPageTags = 1;
                document.getElementById('go-to-page-tags').value = 1;
            }
            createTagTable();
        });
        pageControlBar.appendChild(goToPageLabel);
        pageControlBar.appendChild(goToPageInput);
        // Page # of #
        let pageNumLabel = document.createElement('label');
        pageNumLabel.innerText = `Page ${goToPageTags} of ${pageCountTags}`;
        pageNumLabel.id = 'page-numbering-tags';
        pageControlBar.prepend(pageNumLabel);
        // Left Arrows
        let leftArrowBox = document.createElement('div');
        leftArrowBox.id = 'left-arrows-tags';
        let leftSingleArrow = document.createElement('label');
        leftSingleArrow.id = 'previous-page-arrow-tags';
        leftSingleArrow.addEventListener('click', (e) => {
            goToPageTags = goToPageTags !== 1 ? goToPageTags - 1 : 1;
            document.getElementById('go-to-page-tags').value = goToPageTags;
            createTagTable();
        });
        leftSingleArrow.style.color = goToPageTags === 1 ? 'gray' : 'black';
        leftSingleArrow.innerHTML = '&#8249;';
        leftSingleArrow.classList = 'left page-arrows';
        leftArrowBox.prepend(leftSingleArrow);

        let leftDoubleArrow = document.createElement('label');
        leftDoubleArrow.id = 'first-page-arrow-tags';
        leftDoubleArrow.addEventListener('click', (e) => {
            goToPageTags = 1;
            document.getElementById('go-to-page-tags').value = goToPageTags;
            createTagTable();
        });
        leftDoubleArrow.style.color = goToPageTags === 1 ? 'gray' : 'black';
        leftDoubleArrow.innerHTML = '&#171;';
        leftDoubleArrow.classList = 'left page-arrows';
        leftArrowBox.prepend(leftDoubleArrow);
        pageControlBar.prepend(leftArrowBox);
        // Show # dropdown
        let showDropdown = document.createElement('select');
        showDropdown.id = 'show-record-count-tags';
        showDropdown.value = showCountTags;
        for (let i = 10; i <= 50; i += 10) {
            let option = document.createElement('option');
            option.value = i;
            option.innerText = i;
            option.id = `show-${i}`;
            if (showCountTags === i) option.selected = 'selected';
            showDropdown.appendChild(option);
        }
        showDropdown.addEventListener('change', (e) => {
            showCountTags = parseInt(e.target.value);
            document.getElementById('go-to-page-tags').max = Math.ceil(filteredRecordTags.length / showCountTags);
            createTagTable();
        })
        let showLabel = document.createElement('label');
        showLabel.innerText = 'Show ';
        pageControlBar.appendChild(showLabel);
        pageControlBar.appendChild(showDropdown);
        // Right Arrows
        let rightArrowBox = document.createElement('div');
        rightArrowBox.id = 'right-arrows-tags';
        let rightSingleArrow = document.createElement('label');
        rightSingleArrow.id = 'next-page-arrow-tags';
        rightSingleArrow.addEventListener('click', (e) => {
            goToPageTags = goToPageTags !== pageCountTags ? goToPageTags + 1 : pageCountTags;
            document.getElementById('go-to-page-tags').value = goToPageTags;
            createTagTable();
        });
        rightSingleArrow.style.color = goToPageTags === pageCountTags ? 'gray' : 'black';
        rightSingleArrow.innerHTML = '&#8250;';
        rightSingleArrow.classList = 'right page-arrows';
        rightArrowBox.appendChild(rightSingleArrow);

        let rightDoubleArrow = document.createElement('label');
        rightDoubleArrow.id = 'last-page-arrow-tags';
        rightDoubleArrow.addEventListener('click', (e) => {
            goToPageTags = pageCountTags;
            document.getElementById('go-to-page-tags').value = goToPageTags;
            createTagTable();
        });
        rightDoubleArrow.style.color = goToPageTags === pageCountTags ? 'gray' : 'black';
        rightDoubleArrow.innerHTML = '&#187;';
        rightDoubleArrow.classList = 'right page-arrows';
        rightArrowBox.appendChild(rightDoubleArrow);
        pageControlBar.appendChild(rightArrowBox);
        tagSection.appendChild(pageControlBar);
    }
};

const grabRecords = (record) => {
    // console.log('grabbing records');
    let filteredRecord = record.filter(r => !removedApps.includes(r.app));
    pageCount = filteredRecord.length === 0 ? 1 : Math.ceil(filteredRecord.length / showCount);
    goToPage = goToPage > pageCount ? pageCount : goToPage;
    if (document.getElementById('go-to-page')) document.getElementById('go-to-page').value = goToPage;
    if (document.getElementById('go-to-page')) document.getElementById('go-to-page').max = pageCount;
    if (document.getElementById('page-numbering')) document.getElementById('page-numbering').innerText = `Page ${goToPage} of ${pageCount}`;
    if (document.getElementsByClassName('page-arrows').length > 0) {
        [...document.getElementsByClassName('left')].forEach(arrow => {
            arrow.style.color = goToPage === 1 ? 'gray' : 'black';
        });
        [...document.getElementsByClassName('right')].forEach(arrow => {
            arrow.style.color = goToPage === pageCount ? 'gray' : 'black';
        });
    }
    let recordSection = document.getElementById('record-section');
    recordSection.style.position = 'absolute';
    recordSection.style.top = tableTop || '5vh';
    recordSection.style.left = tableLeft || '300px';
    let table = document.createElement('table');
    table.id = 'record-table';
    let thead = document.createElement('thead');
    let hr = document.createElement('tr');
    hr.id = 'table-header';
    let topLeftTH = document.createElement('th');
    topLeftTH.id = 'tl-th';
    topLeftTH.style.cursor = 'move';
    // Make Record Table Draggable
    var clickX, clickY, dragX, dragY;
    recordSection.addEventListener('mousedown', (e) => {
        if (e.target.id === 'tl-th') {
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
        tableTop = (recordSection.offsetTop - dragY) + 'px';
        tableLeft = (recordSection.offsetLeft - dragX) + 'px';
        recordSection.style.top = tableTop;
        recordSection.style.left = tableLeft;
    }
    recordSection.addEventListener('mouseup', (e) => {
        document.removeEventListener('mousemove', calcTableLoc);
        recordSection.removeEventListener('mouseup', calcTableLoc);
        let maxHeight;
        if (tableTop) maxHeight = window.innerHeight - parseInt(tableTop.replace('px', '')) - (window.innerHeight * .05)
        recordSection.style.maxHeight = maxHeight + 'px';
    });
    hr.appendChild(topLeftTH);
    let header = ['app', 'title', 'start', 'end', 'duration', 'tags'];
    header.forEach(h => {
        let th = document.createElement('th');
        th.innerHTML = `${h}<span style="line-height: 1.2">${sortByHeader[h] === 'asc' ? ' &#129041;' : sortByHeader[h] === 'desc' ? ' &#129043;' : ''}</span>`;
        th.id = `header-${h}`;
        th.addEventListener('click', (e) => {
            let val = e.target.id.split('-')[1];
            if (val !== 'search' && val) {
                sortByHeader[val] = sortByHeader[val] === '' ? 'asc' : sortByHeader[val] === 'asc' ? 'desc' : '';
                goToPage = 1;
                grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
            }
        });
        hr.appendChild(th);
        if (h === 'title') {
            let input = document.createElement('input');
            input.id = 'title-search-bar';
            input.value = filterTitle || '';
            input.addEventListener('change', (e) => {
                filterTitle = e.target.value;
                grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
                document.getElementById('go-to-page').max = pageCount;
            })
            th.appendChild(input);
        }
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    let tbody = document.createElement('tbody');

    let len = filteredRecord.length === 0 ? 1 : filteredRecord.length > showCount ? showCount : filteredRecord.length; //records.length;

    Object.keys(sortByHeader).forEach(key => {
        if (sortByHeader[key].length > 0) filteredRecord = sortByHeader[key] === 'asc' ? filteredRecord.sort((a, b) => a[key] > b[key] ? 1 : -1) : filteredRecord.sort((a, b) => a[key] < b[key] ? 1 : -1);
    })
    visibleRecords = [];
    for (let i = (goToPage - 1) * showCount; i < (goToPage * showCount) - (goToPage === pageCount ? showCount - (filteredRecord.length % showCount) : 0); i++) {
        let tr = document.createElement('tr');
        tr.id = len > 1 ? `record-${filteredRecord[i].id}` : 'no-row';
        if (len > 1) visibleRecords.push(filteredRecord[i].id);
        tr.classList = 'record-row';
        let firstCol = document.createElement('td');
        firstCol.classList = 'check-col';
        let checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = len > 1 ? filteredRecord[i].checked : false;
        checkbox.id = len > 1 ? `check-record-${filteredRecord[i].id}` : 'no-record';
        // CREATE EVENT LISTENER WHEN CHECKBOX IS CHANGED OR ROW IS CLICKED ON TO UPDATE CHECKED STATUS OF THE GLOBAL RECORD
        checkbox.addEventListener('change', (e) => {
            e.stopImmediatePropagation();
            let id = e.target.id.substring('check-record-'.length);
            globalRecords[id].checked = e.target.checked;
            aggregateRecords();
        });
        tr.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                if (![...e.target.classList][0].includes('tag')) {
                    let id = [...e.target.classList][0].includes('tool') ? e.target.parentElement.parentElement.id.substring('record-'.length) : e.target.parentElement.id.substring('record-'.length);
                    let cb = document.getElementById(`check-record-${id}`);
                    globalRecords[id].checked = !cb.checked;
                    cb.checked = !cb.checked;
                    let sAV = document.getElementById('select-all-visible');
                    let visibleChecked = [...table.querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== 'select-all-visible').length;
                    if (visibleChecked === showCount) {
                        sAV.checked = true;
                        sAV.indeterminate = false;
                    }
                    if (visibleChecked < showCount) {
                        sAV.checked = false;
                        sAV.indeterminate = true;
                        if (visibleChecked === 0) {
                            sAV.checked = false;
                            sAV.indeterminate = false;
                        }
                    }
                    aggregateRecords();
                }
            }
        });
        firstCol.appendChild(checkbox);
        tr.appendChild(firstCol);
        let row = [];
        header.forEach(col => filteredRecord.length > 0 ? row.push(filteredRecord[i][col]) : row.push(''));
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
            if (index >= 2 && index <= 4) td.classList = 'time-col';
            if (index === 5) {
                td.innerText = '';
                td.classList = 'tags-col';
                td.addEventListener('mouseenter', (e) => {
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
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    let selectAllVisible = document.createElement('input');
    selectAllVisible.id = 'select-all-visible';
    selectAllVisible.type = 'checkbox';
    let visibleChecked = [...table.querySelectorAll('input[type="checkbox"]:checked')].filter(c => c.id !== 'select-all-visible').length;
    if (visibleChecked === showCount) {
        selectAllVisible.checked = true;
        selectAllVisible.indeterminate = false;
    }
    if (visibleChecked < showCount) {
        selectAllVisible.checked = false;
        selectAllVisible.indeterminate = true;
        if (visibleChecked === 0) {
            selectAllVisible.checked = false;
            selectAllVisible.indeterminate = false;
        }
    }
    selectAllVisible.addEventListener('change', (e) => {
        let allCheckboxes = [...table.querySelectorAll('input[type="checkbox"]')].filter(c => c.id !== 'select-all-visible')
        allCheckboxes.forEach(i => {
            globalRecords[i.id.substring('check-record-'.length)].checked = selectAllVisible.checked;
            i.checked = selectAllVisible.checked;
        });
    })
    topLeftTH.appendChild(selectAllVisible)
    if (document.getElementById('record-table')) document.getElementById('record-table').remove();
    recordSection.prepend(table);

    // Draw tags after table is drawn
    document.getElementById('record-table').childNodes[1].childNodes.forEach(row => {
        if (globalRecords[row.id.substring(row.id.indexOf('-') + 1)]) {
            let val = globalRecords[row.id.substring(row.id.indexOf('-') + 1)].tags;
            drawTag(val, row.id)
        }
    })

    if (document.getElementById('page-controls') === null) { //document.getElementById('page-controls').remove();
        let pageControlBar = document.createElement('div');
        pageControlBar.id = 'page-controls';
        // Go to Page
        let goToPageLabel = document.createElement('label');
        let goToPageInput = document.createElement('input');
        goToPageLabel.innerText = 'Go to Page:';
        goToPageInput.type = 'number';
        goToPageInput.id = 'go-to-page';
        goToPageInput.value = goToPage;
        goToPageInput.min = 1;
        goToPageInput.max = pageCount;
        goToPageInput.addEventListener('change', (e) => {
            goToPage = e.target.value > pageCount ? parseInt(pageCount) : parseInt(e.target.value);
            if (!isNaN(goToPage)) document.getElementById('go-to-page').value = goToPage;
            if (goToPage < 1 || isNaN(goToPage)) {
                goToPage = 1;
                document.getElementById('go-to-page').value = 1;
            }
            grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
        });
        pageControlBar.appendChild(goToPageLabel);
        pageControlBar.appendChild(goToPageInput);
        // Page # of #
        let pageNumLabel = document.createElement('label');
        pageNumLabel.innerText = `Page ${goToPage} of ${pageCount}`;
        pageNumLabel.id = 'page-numbering';
        pageControlBar.prepend(pageNumLabel);
        // Left Arrows
        let leftArrowBox = document.createElement('div');
        leftArrowBox.id = 'left-arrows';
        let leftSingleArrow = document.createElement('label');
        leftSingleArrow.id = 'previous-page-arrow';
        leftSingleArrow.addEventListener('click', (e) => {
            goToPage = goToPage !== 1 ? goToPage - 1 : 1;
            document.getElementById('go-to-page').value = goToPage;
            grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
        });
        leftSingleArrow.style.color = goToPage === 1 ? 'gray' : 'black';
        leftSingleArrow.innerHTML = '&#8249;';
        leftSingleArrow.classList = 'left page-arrows';
        leftArrowBox.prepend(leftSingleArrow);

        let leftDoubleArrow = document.createElement('label');
        leftDoubleArrow.id = 'first-page-arrow';
        leftDoubleArrow.addEventListener('click', (e) => {
            goToPage = 1;
            document.getElementById('go-to-page').value = goToPage;
            grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
        });
        leftDoubleArrow.style.color = goToPage === 1 ? 'gray' : 'black';
        leftDoubleArrow.innerHTML = '&#171;';
        leftDoubleArrow.classList = 'left page-arrows';
        leftArrowBox.prepend(leftDoubleArrow);
        pageControlBar.prepend(leftArrowBox);
        // Show # dropdown
        let showDropdown = document.createElement('select');
        showDropdown.id = 'show-record-count';
        showDropdown.value = showCount;
        for (let i = 10; i <= 50; i += 10) {
            let option = document.createElement('option');
            option.value = i;
            option.innerText = i;
            option.id = `show-${i}`;
            if (showCount === i) option.selected = 'selected';
            showDropdown.appendChild(option);
        }
        showDropdown.addEventListener('change', (e) => {
            showCount = parseInt(e.target.value);
            document.getElementById('go-to-page').max = Math.ceil(filteredRecord.length / showCount);
            grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
        })
        let showLabel = document.createElement('label');
        showLabel.innerText = 'Show ';
        pageControlBar.appendChild(showLabel);
        pageControlBar.appendChild(showDropdown);
        // Right Arrows
        let rightArrowBox = document.createElement('div');
        rightArrowBox.id = 'right-arrows';
        let rightSingleArrow = document.createElement('label');
        rightSingleArrow.id = 'next-page-arrow';
        rightSingleArrow.addEventListener('click', (e) => {
            goToPage = goToPage !== pageCount ? goToPage + 1 : pageCount;
            document.getElementById('go-to-page').value = goToPage;
            grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
        });
        rightSingleArrow.style.color = goToPage === pageCount ? 'gray' : 'black';
        rightSingleArrow.innerHTML = '&#8250;';
        rightSingleArrow.classList = 'right page-arrows';
        rightArrowBox.appendChild(rightSingleArrow);

        let rightDoubleArrow = document.createElement('label');
        rightDoubleArrow.id = 'last-page-arrow';
        rightDoubleArrow.addEventListener('click', (e) => {
            goToPage = pageCount;
            document.getElementById('go-to-page').value = goToPage;
            grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
        });
        rightDoubleArrow.style.color = goToPage === pageCount ? 'gray' : 'black';
        rightDoubleArrow.innerHTML = '&#187;';
        rightDoubleArrow.classList = 'right page-arrows';
        rightArrowBox.appendChild(rightDoubleArrow);
        pageControlBar.appendChild(rightArrowBox);
        recordSection.appendChild(pageControlBar);
    }
    resizeTableColumns();
    aggregateRecords();
};

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
    grabRecords(globalRecords);
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
            grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
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
            grabRecords(filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords);
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