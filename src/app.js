let dataLoaded = false;
let refreshedApps = false;
let removedApps = [];
let globalRecords = [];
let includeTotalTime = true;
let filterTitle = '';
let tags = [];
let dWR = []; // Days With Records
let dragTag, dropTag;
let filteredRecords = [], tagID, zoomTags = [], topTag = []; // Global table trackers
let activeTables = [];
let sqlConnected = false;
let isProd;
let pulledDate;
let appSettings;
let timelineY;

let existingTables = ['record', 'tag', 'zoom', 'top-tags'];
let table = existingTables.reduce((prev, t) => ({ ...prev, [`${t}-show`]: 10, [`${t}-go-to-page`]: 1, [`${t}-page-count`]: 1, [`${t}-top`]: '', [`${t}-left`]: '' }), {});
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
    },
    'top-tags': {
        'tag': '',
        'duration': '',
    }
}
let visibleRecords = {
    'record': [],
    'tag': [],
    'zoom': [],
    'top-tags': []
};

const dateInputHandler = (e) => {
    if (e.type === 'blur') {
        if (dWR.includes(e.target.value) && (pulledDate !== e.target.value || !dataLoaded)) {
            grabRecordsFromDatePicker(e.target.value)
        };
    }
    if (e.type === 'keyup') {
        if (e.key === 'Enter') {
            document.getElementById('date-input').blur();
        }
    }
}

window.addEventListener('resize', () => {
    if (document.getElementById('top-tags-section')) {
        table['top-tags-left'] = '';
        createTable('top-tags');
    }
    if (document.getElementById('timeline')) {
        document.getElementById('timeline').remove();
        document.getElementById('selection-box').remove();
        timelineY = '';
        createTimeline();
    }
})

window.addEventListener('load', () => {
    window.api.receive('is-prod', (prodCheck) => isProd = prodCheck[0]);
    window.api.receive('config', (config) => {
        appSettings = config[0];
        let rowCount = appSettings.filter(setting => setting.name === 'row-count')[0];
        if (!rowCount.enabled) [...JSON.parse(rowCount.details)].filter(d => d.global === 0).forEach(d => table[`${d.table}-show`] = d.count);
        createSettingsPage();
    });
    createTitlebar();
    createDragAndDropArea();
    let dateInput = document.createElement('input');
    dateInput.id = 'date-input';
    dateInput.classList = 'center hidden';
    dateInput.type = 'date';
    dateInput.name = 'select-date';
    document.body.appendChild(dateInput);
    window.api.send('askForDates', 'no-options');
    window.api.receive('returnDates', (dates) => {
        if (typeof dates[0] === 'object') {
            sqlConnected = true;
            dateInput.classList.remove('hidden');
            dWR = dates[0];
            dateInput.min = dWR[0];
            dateInput.max = dWR[dWR.length - 1];
            dateInput.value = dWR[dWR.length - 1];
        }
    });
    dateInput.addEventListener('focus', (e) => pulledDate = e.target.value);
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
        if (((e.key === '-' && e.ctrlKey) || (e.key === '=' && e.ctrlKey) || (e.key === '0' && e.ctrlKey))) {
            if (document.getElementById('record-table')) resizeTableColumns();
            updateZoomLevels();
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
        if (id !== 'window-controls' || id !== 'settings-cog') titleBarInteraction(id);
        if (id === 'settings-cog') toggleSettingsPage();
    });
});

const updateZoomLevels = () => {
    window.api.send('get-zoom-level', 'zoom')
    window.api.receive('return-zoom-level', (zmlvl) => {
        let zoomInput = document.querySelector('#zoom-level input');
        zoomInput.value = JSON.parse(zmlvl);
        if (document.getElementById('timeline')) {
            document.getElementById('timeline').remove()
            document.getElementById('selection-box').remove()
            createTimeline();
        };
    });
}

const toggleSettingsPage = () => {
    let settingsPage = document.getElementById('settings-page')
    settingsPage.classList.toggle('settings-closed');
    if (settingsPage.classList.length === 0) document.getElementById('container').addEventListener('click', toggleSettingsPage);
    if (settingsPage.classList.length > 0) {
        document.getElementById('container').removeEventListener('click', toggleSettingsPage);
        appSettings.filter(setting => setting.name !== 'zoom-level').forEach(setting => {
            if (document.getElementById(setting.name + '-label').querySelector('.expand-arrow.expand-open')) document.getElementById(setting.name + '-label').querySelector('.expand-arrow.expand-open').classList.remove('expand-open');;
            if (document.getElementById(`add-custom-${setting.name}-container`)) document.getElementById(`add-custom-${setting.name}-container`).remove();
        });
    }
}

const createSettingsPage = () => {
    if (document.getElementById('settings-page')) document.getElementById('settings-page').remove();
    let settingsPage = document.createElement('div');
    settingsPage.id = 'settings-page';
    settingsPage.classList = 'settings-closed';
    document.body.appendChild(settingsPage);
    appSettings.filter(setting => setting.name !== 'zoom-level').forEach(setting => {
        let toggle = 'toggle-' + setting.name;
        if (!document.getElementById(toggle)) {
            setting.enabled = setting.enabled === 1;
            if (setting.name === 'dark-mode' && setting.enabled) document.body.classList = 'dark-mode';
            let row = document.createElement('div');
            row.classList = 'settings';
            let sliderContainer = document.createElement('label');
            sliderContainer.classList = 'switch';
            sliderContainer.id = toggle;
            let input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = setting.enabled;
            let slider = document.createElement('span');
            slider.classList = 'slider round';
            sliderContainer.appendChild(input);
            sliderContainer.appendChild(slider);
            let label = document.createElement('label');
            label.id = setting.name + '-label';
            let dropDown = ['auto-tagging', 'save-location'].includes(setting.name) && setting.enabled || setting.name === 'row-count';
            label.innerHTML = (dropDown ? `<span class="expand-arrow">&#8250;</span> ` : '') + setting.name.replace(/-/g, ' ');
            row.appendChild(sliderContainer);
            row.appendChild(label);
            input.addEventListener('click', () => {
                if (setting.name === 'dark-mode') document.body.classList.toggle(setting.name);
                let enabledAfterClick = !setting.enabled;
                label.innerHTML = (enabledAfterClick && (dropDown || ['auto-tagging', 'save-location'].includes(setting.name)) || setting.name === 'row-count' ? `<span class="expand-arrow">&#8250;</span> ` : '') + setting.name.replace(/-/g, ' ');
                dropDown = setting.name === 'row-count' ? true : enabledAfterClick;
                setting.enabled = enabledAfterClick;
                window.api.send('update-setting', [setting.name, 'enabled', enabledAfterClick ? 1 : 0]);
                if (setting.name === 'auto-tagging' && enabledAfterClick) autoTag();
                if (document.getElementById(`add-custom-${setting.name}-container`)) document.getElementById(`add-custom-${setting.name}-container`).remove();
                if (setting.name === 'row-count') document.getElementById('row-count-label').click();
            });
            label.addEventListener('click', (e) => {
                if (dropDown) {
                    let expandable = document.getElementById(setting.name + '-label').querySelector('.expand-arrow');
                    expandable.classList.toggle('expand-open');
                    let type = setting.name;
                    if ([...expandable.classList].includes('expand-open')) {
                        addExpandOptions(expandable, setting.name, type);
                    }
                    else {
                        if (document.getElementById(`add-custom-${type.toLowerCase()}-container`)) document.getElementById(`add-custom-${type.toLowerCase()}-container`).remove();
                    }
                };
            })
            settingsPage.appendChild(row);
        }
    });
    let zoomRow = document.createElement('div');
    zoomRow.id = 'zoom-level';
    zoomRow.classList = 'settings';
    let zoomInput = document.createElement('input');
    zoomInput.type = 'number';
    zoomInput.step = 0.2;
    let zoomLevel = appSettings.filter(setting => setting.name === 'zoom-level')[0].details;
    zoomInput.value = zoomLevel;
    zoomInput.addEventListener('change', (e) => {
        let newZoom = parseFloat(e.target.value);
        if (!isNaN(newZoom)) {
            window.api.send('set-zoom-level', newZoom);
            window.api.send('update-setting', ['zoom-level', 'details', newZoom]);
        }
        else {
            updateZoomLevels();
        }
    })
    let zoomLabel = document.createElement('label');
    zoomLabel.innerText = 'zoom level';
    zoomRow.appendChild(zoomInput);
    zoomRow.appendChild(zoomLabel);
    settingsPage.appendChild(zoomRow);

    let resetDefault = document.createElement('button');
    resetDefault.classList = 'settings';
    resetDefault.id = 'reset-default-settings';
    resetDefault.innerText = 'Restore Default Settings';
    resetDefault.addEventListener('click', () => {
        window.api.send('restore-default-settings', 'default settings');
        window.api.receive('config', (config) => {
            appSettings = config[0];
            createSettingsPage();
            document.getElementById('zoom-level').querySelector('input').value = 0;
            document.getElementById('settings-cog').click();
        });
    });
    settingsPage.appendChild(resetDefault);
}

const addExpandOptions = (expandable, settingName, type) => {
    let setting = appSettings.filter(s => s.name === settingName)[0];
    if (document.getElementById(`add-custom-${type.toLowerCase()}-container`)) document.getElementById(`add-custom-${type.toLowerCase()}-container`).remove();
    let expandDiv = document.createElement('div');
    expandDiv.id = `add-custom-${type.toLowerCase()}-container`;
    expandDiv.classList = 'add-custom';
    if (setting.name === 'row-count') {
        setting.details = typeof setting.details === 'string' ? JSON.parse(setting.details) : setting.details;
        if (setting.enabled) {
            let universalRowCount = document.createElement('div');
            universalRowCount.id = 'universal-row-count';
            let uRCInput = document.createElement('input');
            uRCInput.type = 'number';
            uRCInput.step = 10;
            uRCInput.min = 10;
            uRCInput.max = 50;
            let rowCount = setting.details.filter(d => d.global === 1)[0].count;
            uRCInput.value = rowCount
            uRCInput.addEventListener('change', (e) => {
                setting.details = [...setting.details.filter(d => d.global !== 1), { 'global': 1, 'table': '', 'count': e.target.value }]
                existingTables.forEach(type => {
                    table[`${type}-show`] = e.target.value;
                    if (document.getElementById(`${type}-table`)) {
                        document.getElementById(`${type}-show-${e.target.value}`).selected = 'selected';
                        createTable(type)
                    };
                });
                window.api.send('update-setting', [setting.name, 'details', JSON.stringify(setting.details)]);
            })
            let uRCLabel = document.createElement('label');
            uRCLabel.innerText = 'global count';
            universalRowCount.appendChild(uRCInput);
            universalRowCount.appendChild(uRCLabel);
            expandDiv.appendChild(universalRowCount);
        }
        else {
            existingTables.forEach(type => {
                let RowCount = document.createElement('div');
                RowCount.id = `${type}-row-count`;
                let rCInput = document.createElement('input');
                rCInput.type = 'number';
                rCInput.step = 10;
                rCInput.min = 10;
                rCInput.max = 50;
                let rowCount = setting.details.filter(d => d.table === type)[0].count;
                rCInput.value = rowCount
                rCInput.addEventListener('change', (e) => {
                    setting.details = [...setting.details.filter(d => d.table !== type), { 'global': 0, 'table': type, 'count': e.target.value }]
                    window.api.send('update-setting', [setting.name, 'details', JSON.stringify(setting.details)]);
                    table[`${type}-show`] = e.target.value;
                    if (document.getElementById(`${type}-table`)) {
                        document.getElementById(`${type}-show-${e.target.value}`).selected = 'selected';
                        createTable(type)
                    };
                })
                let rCLabel = document.createElement('label');
                rCLabel.innerText = `${type} table`;
                RowCount.appendChild(rCInput);
                RowCount.appendChild(rCLabel);
                expandDiv.appendChild(RowCount);
            })

        }
    }
    if (setting.name === 'save-location') {
        let selectLocation = document.createElement('select');
        let defaultSelections = ['Desktop', 'Downloads', 'Documents', 'Custom'];
        let setVal = appSettings.filter(setting => setting.name === 'save-location')[0].details;
        let customPath = !defaultSelections.includes(setVal);
        let customPathVals = [];
        let formattedPath;
        if (customPath) {
            formattedPath = setVal.split('\\').reduce((prev, curr, index) => {
                if (index !== setVal.split('\\').length - 2 && index !== setVal.split('\\').length - 1) curr = '..';
                return [...prev, curr]
            }, []).join('\\');
            if (formattedPath.length > 30) formattedPath = formattedPath.slice(formattedPath.length - 30);
            let lastBackSlash = formattedPath.indexOf('\\');
            if (lastBackSlash >= 2 && lastBackSlash <= 4) formattedPath = '..' + formattedPath.slice(lastBackSlash);
            customPathVals.push({ 'sanitized': formattedPath, 'full': setVal });
            defaultSelections.push(formattedPath);
        }
        defaultSelections.forEach(path => {
            let pathOption = document.createElement('option');
            pathOption.value = path;
            pathOption.innerText = path;
            if ((customPath && path === formattedPath) || (!customPath && path === setVal)) pathOption.selected = 'selected';
            selectLocation.appendChild(pathOption);
        })
        let customPathInput = document.createElement('input');
        customPathInput.addEventListener('click', (e) => {
            let list = new DataTransfer();
            let file = new File(["content"], "test.txt");
            list.items.add(file);
            customPathInput.files = list.files;
            const checkWindowFocus = () => {
                window.removeEventListener('focus', checkWindowFocus)
                setTimeout(() => {
                    if (customPathInput.files[0] === list.files[0]) {
                        let err = document.createElement('p');
                        err.id = 'custom-folder-error';
                        err.innerText = 'Please select a folder with at least one file in it.';
                        let options = [...document.querySelectorAll('option')];
                        let prevSelectedOption = options.filter(o => o.value === appSettings.filter(setting => setting.name === 'save-location')[0].details)[0];
                        if (!prevSelectedOption) {
                            let sanitizedPath = customPathVals.filter(path => path.full === appSettings.filter(setting => setting.name === 'save-location')[0].details)[0].sanitized;
                            prevSelectedOption = options.filter(o => o.value === sanitizedPath)[0];
                        }
                        prevSelectedOption.selected = 'selected';
                        err.addEventListener('animationend', () => {
                            document.getElementById('custom-folder-error').remove();
                        })
                        expandDiv.appendChild(err);
                    }
                }, 500);
            }
            window.addEventListener('focus', checkWindowFocus)
        });
        customPathInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                let fullPath = e.target.files[0].path.replace(`\\${e.target.files[0].name}`, '');
                let formattedPath = fullPath.split('\\').reduce((prev, curr, index) => {
                    if (index !== fullPath.split('\\').length - 2 && index !== fullPath.split('\\').length - 1) curr = '..';
                    return [...prev, curr]
                }, []).join('\\');
                if (formattedPath.length > 30) formattedPath = formattedPath.slice(formattedPath.length - 30);
                let lastBackSlash = formattedPath.indexOf('\\');
                if (lastBackSlash >= 2 && lastBackSlash <= 4) formattedPath = '..' + formattedPath.slice(lastBackSlash);
                let pathOption = document.createElement('option');
                pathOption.value = formattedPath;
                pathOption.innerText = formattedPath;
                pathOption.selected = 'selected';
                selectLocation.appendChild(pathOption);
                appSettings.filter(setting => setting.name === 'save-location')[0].details = fullPath;
                customPathVals.push({ 'sanitized': formattedPath, 'full': fullPath });
                window.api.send('update-setting', ['save-location', 'details', fullPath]);
            }
        })
        selectLocation.addEventListener('click', (e) => {
            if (e.target.value === 'Custom') {
                customPathInput.type = 'file';
                customPathInput.directory = true;
                customPathInput.webkitdirectory = true;
                customPathInput.multiple = false;
                customPathInput.hidden = true;
                customPathInput.id = 'custom-path-input';
                expandDiv.appendChild(customPathInput);
                customPathInput.click();
            };
        });
        selectLocation.addEventListener('change', (e) => {
            let path = e.target.value;
            if (path !== 'Custom') {
                if (!['Desktop', 'Downloads', 'Documents'].includes(path)) {
                    path = customPathVals.filter(customPath => customPath.sanitized === path)[0].full;
                }
                appSettings.filter(setting => setting.name === 'save-location')[0].details = path;
                window.api.send('update-setting', ['save-location', 'details', path]);
            }
        })
        expandDiv.appendChild(selectLocation);
    }
    if (setting.name === 'auto-tagging') {
        let addCustomDiv = document.createElement('div');
        addCustomDiv.classList = 'add-custom-input';
        let addCustom = document.createElement('input');
        addCustom.type = 'text';
        addCustom.placeholder = `Add Custom ${type}`;
        addCustomDiv.appendChild(addCustom);
        let approvedBeforeBlur = false;
        const addApprovedSymbol = (e, val) => {
            let fromOptions = val !== 'add-new';
            let approve = document.createElement('span');
            approve.classList = `add-custom-action approve`;
            approve.innerHTML = '&#10004;';
            approve.addEventListener('mousedown', (e) => {
                approvedBeforeBlur = true;
                let dbValues = setting.details;
                let oldVals = dbValues ? dbValues.filter(v => v.trim().length > 0) : [];
                let newVals = oldVals;
                let filter;
                if (fromOptions) {
                    let editInput = document.getElementById('edit-input');
                    filter = editInput.value.trim().length > 0 ? editInput.value : val;
                    newVals = oldVals.map(v => v === val ? filter : v);
                }
                if (!fromOptions && addCustom.value.trim().length > 0) {
                    filter = addCustom.value;
                    if (oldVals.filter(f => f === filter.trim()).length === 0) oldVals.push(filter);
                    newVals = oldVals;
                }
                runTaggingFilter(new RegExp(filter));
                if (document.getElementById('record-section')) createTable('record');
                setting.details = newVals;
                window.api.send('update-setting', [setting.name, 'details', newVals]);
                addExpandOptions(expandable, setting.name, type);
            })
            if (fromOptions) {
                document.getElementById(e.id).childNodes[0].appendChild(approve);
            }
            if (!fromOptions) {
                addCustomDiv.appendChild(approve);
            }
        }
        addCustom.addEventListener('focus', (e) => {
            addCustom.addEventListener('keyup', (ev) => {
                if (ev.key === 'Enter') {
                    let approveButton = document.getElementsByClassName('approve')[0];
                    let clickEvent = new Event('mousedown');
                    if (approveButton) approveButton.dispatchEvent(clickEvent);
                }
            });
            addApprovedSymbol(e, 'add-new')
        });
        addCustom.addEventListener('blur', (e) => {
            if (!approvedBeforeBlur) {
                addCustom.value = '';
                let approve = document.getElementsByClassName('approve')[0];
                approvedBeforeBlur = false;
                approve.remove();
            }
        });

        expandDiv.appendChild(addCustomDiv);
        let values = typeof setting.details === 'string' ? setting.details.split(',').sort() : setting.details.sort();
        values.filter(v => v.length > 0).forEach((val, index) => {
            let p = document.createElement('p');
            p.innerHTML = `&#8226; ${val}`;
            p.id = `${type}-${index}`;
            [{ 'type': 'edit', 'code': '&#9998;' }, { 'type': 'delete', 'code': '&#10006;' }].forEach(action => {
                let span = document.createElement('span');
                span.innerHTML = action.code;
                span.classList = `add-custom-action ${action.type}`;
                span.addEventListener('click', (e) => {
                    if (action.type === 'delete') {
                        span.parentNode.remove();
                        values = setting.details.filter(v => v !== val);
                        setting.details = values;
                        window.api.send('update-setting', [setting.name, 'details', values]);
                    }
                    if (action.type === 'edit') {
                        let p = span.parentNode;
                        let editDiv = document.createElement('div');
                        let editInput = document.createElement('input');
                        editInput.id = 'edit-input';
                        editInput.placeholder = val;
                        editDiv.appendChild(editInput);
                        let approvedBeforeBlur = false;
                        editInput.addEventListener('keyup', (e) => {
                            if (e.key === 'Enter') {
                                approvedBeforeBlur = true;
                                let approveButton = document.getElementsByClassName('add-custom-action approve')[0]
                                let clickEvent = new Event('mousedown');
                                approveButton.dispatchEvent(clickEvent);
                            }
                        });
                        editInput.addEventListener('blur', (e) => {
                            if (!approvedBeforeBlur) addExpandOptions(expandable, setting.name, type);
                        });
                        p.innerHTML = '';
                        p.appendChild(editDiv);
                        addApprovedSymbol(p, val);
                        document.getElementById('edit-input').focus();
                    }
                })
                p.appendChild(span);
            });
            expandDiv.appendChild(p);
        });
    }
    expandable.parentNode.parentNode.appendChild(expandDiv);
}

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
    let settingsCog = document.createElement('img');
    settingsCog.id = 'settings-cog';
    settingsCog.classList = 'icon';
    settingsCog.src = 'icons/settings-cog.png';
    settingsCog.draggable = false;
    windowControls.appendChild(settingsCog);
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
        existingTables.forEach(table => {
            if (document.getElementById(`${table}-section`)) document.getElementById(`${table}-section`).remove();
        })
        tags = [];
        zoomTags = [];
        filteredRecords = [];
        topTag = [];
        activeTables = [];
        if (document.getElementById('timeline')) document.getElementById('timeline').remove();
        if (document.getElementById('selection-box')) document.getElementById('selection-box').remove();
        leftPos = '';
        rightPos = '';
        calcStart = '';
        calcEnd = '';
        postDataRetrieval(records, 'date-picker');
    });
};

const calcDuration = (dur) => {
    let hh = ((Math.floor(dur / 3600) < 10) ? ("0" + Math.floor(dur / 3600)) : Math.floor(dur / 3600));
    let mm = ((Math.floor(dur % 3600 / 60) < 10) ? ("0" + Math.floor(dur % 3600 / 60)) : Math.floor(dur % 3600 / 60));
    let ss = ((Math.floor(dur % 3600 % 60) < 10) ? ("0" + Math.floor(dur % 3600 % 60)) : Math.floor(dur % 3600 % 60));
    return `${hh}:${mm}:${ss}`;
};

const aggregateRecords = () => {
    let all = globalRecords.map(r => r.dur).reduce((a, b) => a + b);
    let active = globalRecords.filter(r => !removedApps.includes(r.app) && r.checked).map(r => r.dur);
    active = active.length > 0 ? active.reduce((a, b) => a + b) : 0;
    let tag = globalRecords.filter(r => !removedApps.includes(r.app) && r.checked && r.tags.includes(parseInt(tagID))).map(r => r.dur);
    tag = tag.length > 0 ? tag.reduce((a, b) => a + b) : 0;
    topTag = [];
    tags.forEach((tag, index) => {
        let dur = globalRecords.filter(r => !removedApps.includes(r.app) && r.checked && r.tags.includes(parseInt(tag.id))).map(r => r.dur);
        dur = dur.length > 0 ? dur.reduce((a, b) => a + b) : 0;
        topTag.push({ 'id': tag.id, tag, 'duration': dur, 'dur': calcDuration(dur) });
    });
    topTag = topTag.sort((a, b) => a.dur < b.dur ? 1 : -1);
    let durationVals = [active, all, tag].map(dur => calcDuration(dur));
    let tagDur = document.getElementById('tag-section') ? `&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;${tags.filter(tag => tag.id === parseInt(tagID)).map(tag => tag.name)[0]}: ${durationVals[2]}` : '';
    let durationDiv = document.getElementById('duration');
    durationDiv.innerHTML = includeTotalTime ? `Duration (hh:mm:ss): ${durationVals[0]} / ${durationVals[1]}` + tagDur : `Duration (hh:mm:ss): ${durationVals[0]}` + tagDur;
    if (document.getElementById('timeline')) createTimeline();
}

const parseFile = (files) => {
    document.getElementById('date-input').classList = sqlConnected ? 'data-loaded' : 'data-loaded hidden';
    window.api.send('toRead', files[0].path);
    window.api.receive('fromRead', (str) => {
        let csv = str[0];
        let arr = csv.split('\n');
        if (arr[0] !== 'App;Type;Title;Begin;End' && arr[0] !== 'app,title,start,end,dur,duration,tags') {
            let err = document.createElement('p');
            err.id = 'error-invalid';
            err.classList = 'error'
            err.innerText = 'Invalid file uploaded. Please select a CSV exported from Tockler or this application.';
            document.getElementById('container').appendChild(err);
        }
        else {
            let fromTockler = arr[0] === 'App;Type;Title;Begin;End';
            removedApps = [];
            document.getElementById('instructions').remove();
            document.getElementById('csv-input').remove();
            if (arr[arr.length - 1].trim().length < 1) arr.pop();
            arr.shift();
            let records = arr.map((r, id) => {
                let rec = r.split(fromTockler ? ';' : ',');
                let dur = (Date.parse(rec[fromTockler ? 4 : 3]) - Date.parse(rec[fromTockler ? 3 : 2])) / 1000;
                let mm = ((Math.floor(dur / 60) < 10) ? ("0" + Math.floor(dur / 60)) : Math.floor(dur / 60));
                let ss = ((Math.floor(dur % 60) < 10) ? ("0" + Math.floor(dur % 60)) : Math.floor(dur % 60));
                let tagsScoped = [];
                if (!fromTockler) {
                    rec[6].split(';').filter(tag => tag.length > 0).forEach(title => {
                        if (tags.filter(tag => tag.name === title).length === 0) createNewTag(title);
                        tagsScoped.push(tags.filter(tag => tag.name === title)[0].id);
                    })
                }
                return {
                    id,
                    'checked': true,
                    'app': cleanUpAppName(rec[0]),
                    'title': rec[fromTockler ? 2 : 1].replace(/"/g, '').replace(/●/g, '').replace(/\%2f?F?/g, '/').trim(),
                    'start': rec[fromTockler ? 3 : 2],
                    'end': rec[fromTockler ? 4 : 3],
                    dur,
                    'duration': `${mm}:${ss}`,
                    tags: tagsScoped
                }
            });
            postDataRetrieval(records, 'file');
        }
    })
};

const modifySort = (e, type) => {
    let val = e.target.id.includes('zoom-tl-th') || e.target.id.includes('top-tags-tl-th') ? `tag${e.target.id.includes('top-tags-tl-th') ? '' : 's'}` : e.target.id.split('-')[e.target.id.split('-').length - 1];
    if (val !== 'tags' && type !== 'zoom') {
        if (!['visible', 'bar', 'th'].includes(val) && !e.target.id.includes('select-all-visible') && val) {
            sortByHeader[type][val] = sortByHeader[type][val] === '' ? 'asc' : sortByHeader[type][val] === 'asc' ? 'desc' : '';
            table[`${type}-go-to-page`] = 1;
            filteredRecords = filterTitle.length > 0 ? globalRecords.filter(r => r.title.toLowerCase().includes(filterTitle.toLowerCase())) : globalRecords;
            createTable(type);
        }
    }
}

const bindBringToFrontClick = (tables) => {
    tables.forEach(table => {
        let tbl = document.getElementById(`${table.type}-section`);
        tbl.addEventListener('click', (e) => {
            let target = [...e.target.classList].includes('add-tag') ? document.getElementById('tag-search').parentNode : e.target.parentNode;
            let targetType = target.parentNode.id.split('-')[0];
            if (document.querySelector('.bring-to-front')) {
                if (document.querySelector('.bring-to-front').id.split('-')[0] !== targetType) {
                    document.querySelectorAll('.bring-to-front').forEach(t => t.classList.remove('bring-to-front'));
                    document.getElementById('tag-section') && [...e.target.classList].includes('tags') ? document.getElementById('tag-section').classList.add('bring-to-front') : tbl.classList.add('bring-to-front');
                }
            }
        })
        activeTables[activeTables.indexOf(table)].clickBound = true;
    })
}

const createTagSearch = (td) => {
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
}

const createAddTagButton = (td) => {
    td.classList = 'tags-col';
    td.addEventListener('mouseenter', () => {
        if (!document.getElementById('tag-search')) {
            let addTag = document.createElement('span');
            addTag.classList = 'add-tag';
            addTag.innerText = '+';
            td.appendChild(addTag);
            addTag.addEventListener('click', (e) => {
                createTagSearch(td)
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

const createCustomContextMenu = (e) => {
    let type = 'tags';
    let tagID = [...e.target.classList].includes('tool-tip') ? e.target.parentNode.parentNode.id : [...e.target.classList].filter(c => c.includes('tag-'))[0].split('-')[1];
    if (isNaN(parseInt(tagID))) {
        type = tagID.split('-')[0];
        tagID = tagID.split('-')[1];
    }
    let contextMenu = document.createElement('div');
    contextMenu.id = 'custom-context-menu';
    contextMenu.style.left = `${e.x}px`;
    contextMenu.style.top = `${e.y}px`;
    let options;
    switch (type) {
        case 'tags':
            options = ['Edit Tag', 'Merge Tags', 'Remove Tag From All'];
            break;
        case 'record':
            options = ['Mass Tag'];
            break;
        case 'tag':
            options = ['Mass Tag', 'Go to Record'];
            break;
        default:
            break;
    }
    options.forEach(option => {
        let menuOption = document.createElement('div');
        menuOption.classList = 'context-menu-option';
        menuOption.innerText = option;
        contextMenu.appendChild(menuOption);
        menuOption.addEventListener('click', (e) => {
            let action = e.target.innerText;
            blurContextMenu();
            switch (action) {
                case 'Edit Tag':
                    openTagModal('edit', tagID);
                    break;
                case 'Merge Tags':
                    openTagModal('merge', tagID);
                    break;
                case 'Remove Tag From All':
                    openTagModal('remove-all', tagID);
                    break;
                case 'Mass Tag':
                    openTagModal('mass', tagID);
                    break;
                case 'Go to Record':
                    table['record-go-to-page'] = Math.floor(filteredRecords.findIndex(record => record.id === parseInt(tagID)) / table['record-show']) + 1;
                    createTable('record');
                    document.getElementById('record-table').click();
                    let rowHighlight = document.createElement('div');
                    let row = document.getElementById(`record-${tagID}`);
                    row.appendChild(rowHighlight);
                    rowHighlight.classList.add('row-highlight');
                    rowHighlight.style.left = `${row.getBoundingClientRect().left}px`;
                    rowHighlight.style.top = `${row.getBoundingClientRect().top}px`;
                    rowHighlight.style.width = `${row.getBoundingClientRect().width}px`;
                    rowHighlight.style.height = `${row.getBoundingClientRect().height}px`;
                    rowHighlight.addEventListener('animationend', () => rowHighlight.remove());
                    break;
                default:
                    break;
            }
        })
    });
    const blurContextMenu = () => {
        contextMenu.remove();
        document.getElementById('container').removeEventListener('click', blurContextMenu);
    }
    if (!document.getElementById('custom-context-menu')) document.getElementById('container').addEventListener('click', blurContextMenu);
    if (document.getElementById('custom-context-menu')) document.getElementById('custom-context-menu').remove();
    document.body.appendChild(contextMenu);
}

const createTable = (type) => {
    const updateCalculatedDurations = () => {
        aggregateRecords();
        if (document.getElementById('top-tags-section')) createTable('top-tags');
    }
    const selectAllModifier = () => {
        ['tag-table', 'record-table'].forEach(tbl => {
            if (document.getElementById(tbl) && type === tbl.split('-')[0]) {
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
            if (document.getElementById(tbl) && type !== tbl.split('-')[0]) createTable(tbl.split('-')[0]);
        })
        updateCalculatedDurations();
    }
    if (activeTables.filter(t => t.type === type).length < 1) activeTables.push({ type, 'clickBound': false });
    if (!document.getElementById(`${type}-section`)) {
        let section = document.createElement('div');
        section.id = `${type}-section`;
        section.classList.add('section');
        document.getElementById('container').appendChild(section);
    }
    let results;
    if (type === 'record') results = filteredRecords.filter(r => !removedApps.includes(r.app));
    if (type === 'tag') results = globalRecords.filter(r => r.tags.includes(parseInt(tagID)));
    if (type === 'zoom') results = zoomTags;
    if (type === 'top-tags') results = topTag;
    if (results.length >= 0) {
        table[`${type}-page-count`] = results.length === 0 ? 1 : Math.ceil(results.length / table[`${type}-show`])
        table[`${type}-go-to-page`] = table[`${type}-go-to-page`] > table[`${type}-page-count`] ? table[`${type}-page-count`] : table[`${type}-go-to-page`];
        if (document.getElementById(`${type}-go-to-page`)) document.getElementById(`${type}-go-to-page`).value = table[`${type}-go-to-page`];
        if (document.getElementById(`${type}-go-to-page`)) document.getElementById(`${type}-go-to-page`).max = table[`${type}-page-count`];
        if (document.getElementById(`${type}-page-numbering`)) document.getElementById(`${type}-page-numbering`).innerText = `Page ${table[`${type}-go-to-page`]} of ${table[`${type}-page-count`]}`;
        if (document.getElementsByClassName(`page-arrows`).length > 0) {
            [...document.getElementsByClassName('left')].forEach(arrow => {
                arrow.style.color = table[`${type}-go-to-page`] === 1 ? 'gray' : 'black';
            });
            [...document.getElementsByClassName('right')].forEach(arrow => {
                arrow.style.color = table[`${type}-go-to-page`] === table[`${type}-page-count`] ? 'gray' : 'black';
            });
        }
        let section = document.getElementById(`${type}-section`);
        section.style.position = 'absolute';
        let top = {
            'record': 'calc(5vh + 3em)',
            'tag': 'calc(41vh + 3em)',
            'zoom': 'calc(41vh + 3em)',
            'top-tags': '4em'
        };
        let left = {
            'record': '300px',
            'tag': '300px',
            'zoom': '800px',
            'top-tags': `${document.getElementById('main-pane').getBoundingClientRect().right - 570}px`
        };
        section.style.top = table[`${type}-top`] || top[type];
        section.style.left = table[`${type}-left`] || left[type];
        let tableTag = document.createElement('table');
        tableTag.id = `${type}-table`
        let thead = document.createElement('thead');
        let hr = document.createElement('tr');
        hr.id = `${type}-table-header`;
        let header = {
            'record': [`${type}-tl-th`, 'app', 'title', 'start', 'end', 'duration', 'tags'],
            'tag': [`${type}-tl-th`, 'app', 'title', 'time', 'duration', 'tags'],
            'zoom': ['tags', 'duration', 'start', 'end'],
            'top-tags': ['tag', 'duration']
        };
        header[type].forEach((h, index) => {
            let th = document.createElement('th');
            th.innerHTML = `${h}<span>${sortByHeader[type][h] === 'asc' ? ' &#129041;' : sortByHeader[type][h] === 'desc' ? ' &#129043;' : ''}</span>`;
            th.id = `${type}-header-${h}`;
            th.classList = 'header';
            th.addEventListener('click', (e) => modifySort(e, type));
            if (index === header[type].length - 1) { // Close Button Tag and Zoom
                let closeButton = document.createElement('div');
                closeButton.id = `close-${type}-section`;
                closeButton.innerText = 'X';
                closeButton.classList = `close-button close-section`;
                closeButton.style.removeProperty('left');
                closeButton.addEventListener('click', (e) => {
                    e.stopImmediatePropagation();
                    document.getElementById(`${type}-section`).remove();
                    activeTables = activeTables.filter(t => t.type !== type);
                    if (type === 'tag') document.getElementById('duration').innerText = document.getElementById('duration').innerText.split('-')[0];
                });
                th.appendChild(closeButton);
            }
            if (index === 0) {
                th.id = `${type}-tl-th`;
                th.classList = 'header';
                th.innerHTML = type === 'zoom' || type === 'top-tags' ? `tag${type === 'top-tags' ? '' : 's'}<span>${sortByHeader[type][h] === 'asc' ? ' &#129041;' : sortByHeader[type][h] === 'desc' ? ' &#129043;' : ''}</span>` : '';
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
                    table[`${type}-top`] = (section.offsetTop - dragY) + 'px';
                    table[`${type}-left`] = (section.offsetLeft - dragX) + 'px';
                    section.style.top = table[`${type}-top`];
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
                    document.getElementById('title-search-bar').focus();
                    document.getElementById(`${type}-go-to-page`).max = table[`${type}-page-count`];
                })
                th.appendChild(input);
            }
        });
        thead.appendChild(hr);
        tableTag.appendChild(thead);
        let tbody = document.createElement('tbody');
        Object.keys(sortByHeader[type]).forEach(key => {
            if (type === 'top-tags') {
                if (key === 'tag' && sortByHeader[type][key].length > 0) results = sortByHeader[type][key] === 'asc' ? results.sort((a, b) => a[key].name > b[key].name ? 1 : -1) : results.sort((a, b) => a[key].name < b[key].name ? 1 : -1)
                if (key === 'duration' && sortByHeader[type][key].length > 0) results = sortByHeader[type][key] === 'desc' ? results.sort((a, b) => b[key] - a[key]) : results.sort((a, b) => a[key] - b[key])
            }
            else {
                if (sortByHeader[type][key].length > 0) results = sortByHeader[type][key] === 'asc' ? results.sort((a, b) => a[key] > b[key] ? 1 : -1) : results.sort((a, b) => a[key] < b[key] ? 1 : -1);
            }
        });
        visibleRecords[type] = [];
        for (let i = (table[`${type}-go-to-page`] - 1) * table[`${type}-show`]; i < (table[`${type}-go-to-page`] * table[`${type}-show`]) - (table[`${type}-go-to-page`] === table[`${type}-page-count`] ? table[`${type}-show`] - (results.length % table[`${type}-show`] === 0 ? table[`${type}-show`] : results.length % table[`${type}-show`]) : 0); i++) {
            let tr = document.createElement('tr');
            tr.id = type === 'top-tags' ? `${type}-${i}` : `${type}-${results[i][type === 'zoom' ? 'start' : 'id']}`;
            type === 'top-tags' ? visibleRecords[type].push(i) : visibleRecords[type].push(results[i][type === 'zoom' ? 'start' : 'id']);
            tr.classList = `${type}-row`;
            if (type !== 'zoom' && type !== 'top-tags') { // Checkboxes / Record and Tag
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
                    selectAllModifier();
                });
                tr.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'INPUT') {
                        if (![...e.target.classList][0].includes('tag')) {
                            let id = [...e.target.classList][0].includes('tool') ? e.target.parentElement.parentElement.id.substring(`${type}-`.length) : e.target.parentElement.id.substring(`${type}-`.length);
                            let cb = document.getElementById(`check-${type}-${id}`);
                            globalRecords[id].checked = !cb.checked;
                            if (document.querySelector(`#check-${type === 'record' ? 'tag' : 'record'}-${id}`)) document.querySelector(`#check-${type === 'record' ? 'tag' : 'record'}-${id}`).checked = !cb.checked;
                            cb.checked = !cb.checked;
                            selectAllModifier();
                        }
                    }
                });
                firstCol.appendChild(checkbox);
                tr.appendChild(firstCol);
                let row = [];
                header[type].forEach((col, index) => index > 0 && results.length > 0 ? row.push(col === 'time' ? `${results[i]['start'].split(' ')[1]} - ${results[i]['end'].split(' ')[1]}` : results[i][col]) : row.push(''));
                row.shift();
                row.map((val, index) => {
                    let td = document.createElement('td');
                    td.innerText = val;
                    if (index === 0) td.classList = 'app-col';
                    if (header[type].indexOf('title') === index + 1) {
                        let tooltTip = document.createElement('span');
                        tooltTip.classList = 'tool-tip';
                        tooltTip.innerText = val;
                        td.appendChild(tooltTip);
                        td.classList = 'title-col';
                        td.addEventListener('mouseover', (e) => {
                            let coord = e.target.getBoundingClientRect();
                            tooltTip.style.left = coord.x + 'px';
                            tooltTip.style.top = coord.y + .4 + 'px';
                        });
                        tooltTip.addEventListener('contextmenu', (e) => createCustomContextMenu(e));
                    }
                    if (['end', 'start', 'duration', 'time'].includes(header[type][index + 1])) td.classList = 'time-col';
                    if (header[type].indexOf('tags') === index + 1) {
                        td.innerText = '';
                        createAddTagButton(td);
                    }
                    tr.appendChild(td);
                })

            }
            if (type === 'zoom') {
                header[type].forEach((val, index) => {
                    let td = document.createElement('td');
                    if (index === 0) { // Tags
                        createAddTagButton(td);
                    }
                    if (index === 1) { // Duration
                        let dur = (Date.parse(globalRecords[results[i].end].end) - Date.parse(globalRecords[results[i].start].start)) / 1000;
                        td.innerText = calcDuration(dur);
                        results[i].duration = dur;
                    }
                    if (index > 0) td.classList = 'time-col';
                    if (index === 2) td.innerText = globalRecords[results[i].start].start;
                    if (index === 3) td.innerText = globalRecords[results[i].end].end;
                    tr.appendChild(td);
                })
            }
            if (type === 'top-tags') {
                header[type].forEach((val, index) => {
                    let td = document.createElement('td');
                    if (index === 0) { // Tag
                        td.classList = 'tags-col';
                    }
                    if (index === 1) { // Duration
                        td.classList = 'time-col';
                        td.innerText = results[i].dur;
                    }
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
                selectAllModifier();
            })
            hr.childNodes[0].appendChild(selectAllVisible)
        }
        if (document.getElementById(`${type}-table`)) document.getElementById(`${type}-table`).remove();
        section.prepend(tableTag);
        drawTag();
        if (document.getElementById(`${type}-page-controls`) === null) {
            let pageControlBar = document.createElement('div');
            pageControlBar.id = `${type}-page-controls`;
            pageControlBar.classList = 'page-controls';
            // Go to Page
            let goToPageLabel = document.createElement('label');
            let goToPageInput = document.createElement('input');
            goToPageLabel.innerText = 'Go to Page:';
            goToPageInput.type = 'number';
            goToPageInput.id = `${type}-go-to-page`;
            goToPageInput.classList = 'go-to-page';
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
            if (type !== 'top-tags') {
                let pageNumLabel = document.createElement('label');
                pageNumLabel.innerText = `Page ${table[`${type}-go-to-page`]} of ${table[`${type}-page-count`]}`;
                pageNumLabel.id = `${type}-page-numbering`;
                pageNumLabel.classList = 'page-numbering';
                pageControlBar.prepend(pageNumLabel);
            }
            // Left Arrows
            let leftArrowBox = document.createElement('div');
            leftArrowBox.id = `left-arrows-${type}`;
            leftArrowBox.classList = 'left-arrows';
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
                createTable(type);
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
                option.id = `${type}-show-${i}`;
                if (parseInt(table[`${type}-show`]) === i) option.selected = 'selected';
                showDropdown.appendChild(option);
            }
            showDropdown.addEventListener('change', (e) => {
                table[`${type}-show`] = parseInt(e.target.value);
                document.getElementById(`${type}-go-to-page`).max = Math.ceil(results.length / table[`${type}-show`]);
                createTable(type);
            })
            let showLabel = document.createElement('label');
            showLabel.innerText = 'Show ';
            pageControlBar.appendChild(showLabel);
            pageControlBar.appendChild(showDropdown);
            // Right Arrows
            let rightArrowBox = document.createElement('div');
            rightArrowBox.id = `right-arrows-${type}`;
            rightArrowBox.classList = 'right-arrows';
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
        let boundIsFalse = activeTables.filter(t => !t.clickBound);
        if (boundIsFalse.length > 0) bindBringToFrontClick(boundIsFalse);
        section.classList.add('bring-to-front');
        if (results.length === 0 && type !== 'record') section.remove();
    }
}

const runTaggingFilter = (filter) => {
    globalRecords.filter(r => filter.test(r.title)).forEach(row => {
        let title = row.title.match(filter)[0];
        if (title.match(/DRAFT \-/) || title.match(/\(?rca|RCA\)?/)) title = 'RCA';
        if (title.match(/[P-p]ager[D-d]uty/)) title = 'PagerDuty';
        if (title.match(/relonemajorincidentmgrtransitions/) || title.match(/ [T-t]ransition/)) title = 'Ticket Transition';
        if (title.match(/[A-Z]{3,7}\-\d+/)) {
            let months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            if (title.includes('UTF')) return;
            if (months.includes(title.split('-')[0].toLowerCase())) return;
        }
        title = title.replace(/-$/, '').trim();
        if (title.match(/[P-p]ower [A-a]utomate/) || title.match(/\b[F-f]low[s]?\b/)) title = 'Automation';
        if (title.match(/jira/) || title.match(/salesforce/)) title = title[0].toUpperCase() + title.substring(1);
        if (tags.filter(tag => tag.name === title).length === 0) createNewTag(title, row.tags, row.id)
        if (!globalRecords[row.id].tags.includes(tags.filter(tag => tag.name === title)[0].id)) globalRecords[row.id].tags.push(tags.filter(tag => tag.name === title)[0].id);
    });
}

const autoTag = () => {
    let autoTagging = appSettings.filter(s => s.name === 'auto-tagging')[0];
    if (autoTagging.enabled) {
        // Auto Tagging - filters are currently hardcoded to personal preference, filters array can be modified below to suite own preferences.
        let filters = [/0[2-3]\d{6}\s?\-?/, /[A-Z]{3,7}\-\d+/, /[P-p]ower [A-a]utomate|\b[F-f]low[s]?\b/, /[J-j]ira/, /[S-s]alesforce /, /DRAFT \-/, /relonemajorincidentmgrtransitions/, / [T-t]ransition/, /\(?rca|RCA\)?/, /[P-p]ager[D-d]uty/]
        if (autoTagging.details) {
            if (typeof autoTagging.details === 'string') autoTagging.details = autoTagging.details.split(',');
            autoTagging.details.forEach(f => {
                let filter = new RegExp(f);
                filters.push(filter);
            })
        };
        filters.forEach(filter => runTaggingFilter(filter));
        zoomTagging();
    }
}

const zoomTagging = () => {
    let zoomOrigin;
    let zoomConnectionId;
    globalRecords.filter(r => r.app === 'Zoom' || (['Chrome', 'Firefox', 'Msedge'].includes(r.app) && /Launch Meeting - Zoom/.test(r.title))).forEach((row) => {
        if ((zoomConnectionId !== row.id - 1 && row.app === 'Zoom' && (row.title === 'Connecting…' || (row.title === 'Zoom Meeting' && !zoomOrigin))) || (row.app !== 'Zoom')) {
            zoomConnectionId = row.id
            zoomTags.push({ 'start': zoomConnectionId, 'end': 0, 'duration': 0, 'origin': 0 });
            for (let i = zoomConnectionId > 5 ? zoomConnectionId - 6 : 0; i < zoomConnectionId; i++) {
                if ((globalRecords[i].app === 'Outlook' && !globalRecords[i].title.match(/Reminder\(s\)/)) || (globalRecords[i].app === 'Slack' && !/Unread Messages/.test(globalRecords[i].title))) zoomOrigin = globalRecords[i];
            }
        };
        if (zoomOrigin) {
            zoomTags[zoomTags.length - 1].end = row.id;
            zoomTags[zoomTags.length - 1].origin = zoomOrigin.id;
            if (['end meeting or leave meeting?', 'leave meeting'].includes(row.title.toLowerCase())) zoomOrigin = null;
        };
    });
    zoomTags.forEach(z => modifyZoomTags(z.start, z.end, z.origin));
}

const modifyZoomTags = (startID, endID, originID, tagVal = null, tagAction = null) => {
    let origin, titleFrom;
    if (tagAction !== 'delete') {
        origin = globalRecords[originID];
        titleFrom = /team-on-call/.test(origin.title) ? 'Zoom from: Slack' : `Zoom from: ${origin.app}`;
        if (/team-on-call/.test(origin.title)) {
            let invalid = true;
            let id = startID + 1;
            while (invalid) {
                if ((['Chrome', 'Firefox', 'Msedge'].includes(globalRecords[id].app) || globalRecords[id].app === 'Slack') && /0[2-3]\d{6}\s?\-?/.test(globalRecords[id].title)) {
                    origin = globalRecords[id];
                    zoomTags.filter(zt => zt.start === startID)[0].originID = id;
                    invalid = false;
                }
                id++;
            }
        }
    }
    globalRecords.filter(r => r.id >= startID && r.id <= endID && (r.app === 'Zoom' || (['Chrome', 'Firefox', 'Msedge'].includes(r.app) && /Launch Meeting - Zoom/.test(r.title)))).forEach(z => {
        if (tagVal) {
            if (tags.filter(tag => tag.id === tagVal).length > 0) {
                if (!globalRecords[z.id].tags.includes(tagVal) && tagAction === 'add') globalRecords[z.id].tags.push(tagVal)
                if (globalRecords[z.id].tags.includes(tagVal) && tagAction === 'delete') globalRecords[z.id].tags = globalRecords[z.id].tags.filter(tag => tag !== tagVal);
            }
        }
        if (!tagVal) {
            z.tags = origin.tags;
            if (origin.tags.length === 0) {
                let title = origin.app === 'Slack' ? `${origin.title.split('|')[0].trim()} - ${origin.title.split('|')[1].trim()}` : origin.title;
                if (tags.filter(tag => tag.name === title).length === 0) createNewTag(title);
                if (!globalRecords[z.id].tags.includes(tags.filter(tag => tag.name === title)[0].id)) globalRecords[z.id].tags.push(tags.filter(tag => tag.name === title)[0].id);
            }
            if (tags.filter(tag => tag.name === titleFrom).length === 0) createNewTag(titleFrom)
            if (!globalRecords[z.id].tags.includes(tags.filter(tag => tag.name === titleFrom)[0].id)) globalRecords[z.id].tags.push(tags.filter(tag => tag.name === titleFrom)[0].id);
            if (/team-on-call/.test(globalRecords[originID].title)) {
                if (tags.filter(tag => tag.name === 'team-on-call').length === 0) createNewTag('team-on-call')
                if (!globalRecords[z.id].tags.includes(tags.filter(tag => tag.name === 'team-on-call')[0].id)) globalRecords[z.id].tags.push(tags.filter(tag => tag.name === 'team-on-call')[0].id);
            }
        }
        activeTables.forEach(table => {
            if (visibleRecords[table.type].includes(z.id)) createTable(table.type);
        });
    })
}


const postDataRetrieval = (records, dataOrigin) => {
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
    if (dataOrigin !== 'file') {
        apps.forEach(app => {
            let prefApps = ['Slack', 'Chrome', 'Zoom', 'Excel', 'Outlook', 'OneDrive', 'Winword'];
            if (prefApps.filter(a => a === app).length < 1) removedApps.push(app);
        });
    }
    if (!document.getElementById('duration')) {
        let durationDiv = document.createElement('div');
        durationDiv.id = 'duration';
        document.getElementById('container').appendChild(durationDiv);
        durationDiv.addEventListener('dblclick', () => {
            includeTotalTime = !includeTotalTime;
            aggregateRecords();
        });
    }
    createActions();
    createAppFilter(apps);
    [...document.getElementById('input-pane').querySelectorAll('h2')].forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.innerText === 'Actions') {
                document.getElementById('action-components').classList.toggle('hidden');
                document.getElementById('component-inputs').style.flex = document.getElementById('action-components').className.includes('hidden') ? '1 1' : '3.1 3';
            };
            if (e.target.innerText === 'Applications') {
                document.getElementById('app-components').classList.toggle('hidden');
                document.getElementById('unselect-apps').classList.toggle('hidden');
                document.getElementById('app-drawer').style.flex = document.getElementById('unselect-apps').className.includes('hidden') ? '.1675 .1675' : '6 1';
            };
            if (document.getElementById('unselect-apps').className.includes('hidden') && document.getElementById('action-components').className.includes('hidden')) document.getElementById('input-pane').style.removeProperty('display');
            if (!document.getElementById('action-components').className.includes('hidden') || !document.getElementById('unselect-apps').className.includes('hidden')) document.getElementById('input-pane').style.display = 'flex';
        })
    })
    createTable('record');
    autoTag();
    createTable('record');
}

const checkHourMarkers = () => {
    let sb = document.getElementById('selection-box').getBoundingClientRect();
    [...document.querySelectorAll('.hour-marker')].forEach(hour => {
        let hBound = hour.getBoundingClientRect();
        if (hBound.left < sb.left || hBound.left > sb.right) {
            hour.style.color = 'rgba(255,255,255,.1)';
        }
    })
}

const createTimelineSlider = (tc, timeframe, fullRecordStart) => {
    let selectionBox = document.createElement('div');
    selectionBox.id = 'selection-box';
    selectionBox.addEventListener('mousedown', (e) => {
        if (e.target.id === 'selection-box') {
            e = e || window.event;
            clickX = e.clientX;
            document.addEventListener('mousemove', calcHandleLoc);
            document.addEventListener('mouseup', mouseUp);
        }
    })
    const calcHandleLoc = (e) => {
        e = e || window.event;
        e.preventDefault();
        dragX = clickX - e.clientX;
        clickX = e.clientX;
        let sbGBCR = selectionBox.getBoundingClientRect();
        let change = sbGBCR.left - dragX;
        if (change < tc.left) change = tc.left;
        let changeRight = change + sbGBCR.width;
        if (change + sbGBCR.width > tc.right) {
            changeRight = tc.right;
            change = tc.right - sbGBCR.width;
        };
        calcStart = (((change - tc.left) / tc.width) * timeframe * 1000);
        calcStart = new Date(new Date(fullRecordStart).getTime() - (1800 * 1000) + calcStart);
        selectionBox.style.left = change + 'px';
        document.getElementById('l-h').style.left = change + 'px';
        document.getElementById('r-h').style.left = changeRight + 'px';
        calcEnd = ((((document.getElementById('r-h').offsetLeft - dragX) - tc.left) / tc.width) * timeframe * 1000);
        calcEnd = new Date(new Date(fullRecordStart).getTime() - (1800 * 1000) + calcEnd);
    }
    const mouseUp = () => {
        document.removeEventListener('mousemove', calcHandleLoc);
        document.removeEventListener('mouseup', mouseUp);
        leftPos = document.getElementById('l-h').offsetLeft + 'px';
        rightPos = document.getElementById('r-h').offsetLeft + 'px';
        createTimeline();
        checkHourMarkers();
    }
    selectionBox.style.width = rightPos && leftPos ? parseInt(rightPos.split('px')[0]) - parseInt(leftPos.split('px')[0]) + 'px' : tc.width + 'px';
    document.getElementById('main-pane').appendChild(selectionBox);
    selectionBox.style.cursor = selectionBox.getBoundingClientRect().width >= tc.width ? 'auto' : 'move';
    let stf = document.getElementById('select-time-frame').getBoundingClientRect();
    selectionBox.style.top = (stf.top - 15) + 'px';
    let tlGBCR = document.getElementById('timeline').getBoundingClientRect();
    selectionBox.style.left = leftPos || tlGBCR.left + (tlGBCR.width * .02) + 'px';
    if (document.getElementById('l-h')) document.getElementById('l-h').remove();
    if (document.getElementById('r-h')) document.getElementById('r-h').remove();
    let sbGBCR = document.getElementById('selection-box').getBoundingClientRect();
    let leftHandle = document.createElement('div');
    leftHandle.className = 'handle';
    selectionBox.appendChild(leftHandle);
    leftHandle.draggable = true;
    let rightHandle = leftHandle.cloneNode(true);
    selectionBox.appendChild(rightHandle);
    leftHandle.id = 'l-h';
    leftHandle.style.left = leftPos || `${sbGBCR.left}px`;
    leftHandle.style.top = `${sbGBCR.top}px`;
    rightHandle.id = 'r-h';
    rightHandle.style.left = rightPos || `${sbGBCR.right}px`;
    rightHandle.style.top = `${sbGBCR.top}px`;
    var clickX, dragX;
    [leftHandle, rightHandle].forEach(handle => {
        let lOR;
        handle.addEventListener('mousedown', (e) => {
            if (['l-h', 'r-h'].includes(e.target.id)) {
                lOR = e.target.id === 'l-h' ? 'left' : 'right';
                e = e || window.event;
                clickX = e.clientX;
                document.addEventListener('mousemove', calcHandleLoc);
                document.addEventListener('mouseup', mouseUp);
            }
        })
        const calcHandleLoc = (e) => {
            e = e || window.event;
            e.preventDefault();
            dragX = clickX - e.clientX;
            clickX = e.clientX;
            let change = handle.offsetLeft - dragX;
            if (lOR === 'left') {
                if (change < tc.left) change = tc.left;
                calcStart = (((change - tc.left) / tc.width) * timeframe * 1000);
                calcStart = new Date(new Date(fullRecordStart).getTime() - (1800 * 1000) + calcStart);
                selectionBox.style.left = change + 'px';
                handle.style.left = change + 'px';
                let rh = document.getElementById('r-h');
                selectionBox.style.width = (rh.offsetLeft + rh.offsetWidth - handle.offsetLeft) + 'px';
            }
            if (lOR === 'right') {
                if (change > tc.right) change = tc.right;
                calcEnd = (((change - tc.left) / tc.width) * timeframe * 1000);
                calcEnd = new Date(new Date(fullRecordStart).getTime() - (1800 * 1000) + calcEnd);
                selectionBox.style.width = (change - document.getElementById('l-h').offsetLeft) + 'px';
                handle.style.left = change + 'px';
            }
        }
        const mouseUp = () => {
            document.removeEventListener('mousemove', calcHandleLoc);
            document.removeEventListener('mouseup', mouseUp);
            leftPos = document.getElementById('l-h').offsetLeft + 'px';
            rightPos = document.getElementById('r-h').offsetLeft + 'px';
            selectionBox.style.cursor = selectionBox.offsetWidth >= tc.width ? 'auto' : 'move';
            createTimeline();
            checkHourMarkers();
        }
    });
}

let calcEnd, calcStart, leftPos, rightPos;
const createTimeline = () => {
    if (document.getElementById('timeline')) document.getElementById('timeline').remove();
    let timeline = document.createElement('div');
    timeline.id = 'timeline';
    let timelineContainer = document.createElement('div');
    timelineContainer.id = 'tl-container';
    const filteredRecordsFull = globalRecords.filter(record => !removedApps.includes(record.app) && record.checked);
    let originStart = (new Date(filteredRecordsFull[0].start) / 1000) - 1800;
    let start = new Date(calcStart) / 1000 || originStart;
    let end = new Date(calcEnd) / 1000 || (new Date(filteredRecordsFull[filteredRecordsFull.length - 1].end) / 1000) + 1800;
    let timeframeFull = ((new Date(filteredRecordsFull[filteredRecordsFull.length - 1].end) / 1000) + 1800) - ((new Date(filteredRecordsFull[0].start) / 1000) - 1800);
    let timeframe = end - start;
    let filteredRecords = filteredRecordsFull.filter(record => (new Date(record.end) / 1000) < end && (new Date(record.start) / 1000) > start);
    let container = document.getElementById('container');
    document.getElementById('main-pane').appendChild(timeline);
    let mainPane = document.getElementById('main-pane').getBoundingClientRect();
    timeline.style.top = timelineY || mainPane.height - timeline.offsetHeight - (mainPane.height * .02) + 'px';
    timelineY = timeline.style.top;
    var clickY, dragY;
    timeline.addEventListener('mousedown', (e) => {
        if (e.target.id === 'timeline') {
            e = e || window.event;
            clickY = e.clientY;
            document.addEventListener('mousemove', calcTLLoc);
            document.addEventListener('mouseup', mouseUpTimeline);
        }
    })
    const calcTLLoc = (e) => {
        e = e || window.event;
        dragY = clickY - e.clientY;
        clickY = e.clientY;
        let sb = document.getElementById('selection-box');
        let change = timeline.offsetTop - dragY;
        let sbDiff = timeline.offsetTop - sb.offsetTop;
        if (change <= mainPane.top) change = mainPane.top;
        if (change >= mainPane.height - timeline.offsetHeight - (mainPane.height * .02)) change = mainPane.height - timeline.offsetHeight - (mainPane.height * .02);
        let sbChange = change - sbDiff;
        timelineY = change + 'px';
        timeline.style.top = timelineY;
        sb.childNodes.forEach(handle => {
            handle.style.top = sbChange + 'px';
        })
        sb.style.top = sbChange + 'px';
    }
    const mouseUpTimeline = () => {
        document.removeEventListener('mousemove', calcTLLoc);
        document.removeEventListener('mouseup', mouseUpTimeline);
    }
    timeline.appendChild(timelineContainer);
    let selectTimeframe = document.createElement('div');
    selectTimeframe.id = 'select-time-frame';
    timeline.appendChild(selectTimeframe);
    let tc = document.getElementById('tl-container').getBoundingClientRect();
    let apps = [...document.getElementById('app-drawer').getElementsByTagName('input')].filter(app => app.value !== 'Unselect All' && !removedApps.includes(app.value)).map(app => app.value);
    let number = 360 / apps.length;
    let colorMapping = {}, appTotals = {};
    apps.forEach((app, i) => {
        colorMapping[app] = `hsl(${Math.floor(i * number)},${document.body.className.includes('dark-mode') ? 100 : 75}%,${document.body.className.includes('dark-mode') ? 75 : 60}%)`;
        appTotals[app] = 0;
    });
    filteredRecords.forEach(record => {
        let tlEvent = document.createElement('div');
        let width = (record.dur / timeframe) * tc.width;
        if (width < 1) width = 1;
        tlEvent.id = `${record.id}-timeline-event`;
        tlEvent.style.width = `${width}px`;
        let left = (((new Date(record.start) / 1000) - start) / timeframe) * tc.width + tc.left;
        tlEvent.style.left = `${left}px`;
        tlEvent.style.backgroundColor = colorMapping[record.app];
        tlEvent.classList = 'timeline-event';
        tlEvent.dataset.title = record.title;
        tlEvent.dataset.app = record.app;
        tlEvent.dataset.time = `${record.start.split(' ')[1]} - ${record.end.split(' ')[1]}`;
        let dur = record.dur;
        let hh = ((Math.floor(dur / 3600) < 10) ? ("0" + Math.floor(dur / 3600)) : Math.floor(dur / 3600));
        let mm = ((Math.floor(dur % 3600 / 60) < 10) ? ("0" + Math.floor(dur % 3600 / 60)) : Math.floor(dur % 3600 / 60));
        let ss = ((Math.floor(dur % 3600 % 60) < 10) ? ("0" + Math.floor(dur % 3600 % 60)) : Math.floor(dur % 3600 % 60));
        tlEvent.dataset.dur = `${hh}h ${mm}m ${ss}s`;
        timelineContainer.appendChild(tlEvent);
        appTotals[record.app] += record.dur;
        tlEvent.addEventListener('mouseenter', (e) => {
            if (e.target.id) {
                let hoverCard = document.createElement('div');
                e.target.addEventListener('mouseleave', (e) => {
                    document.querySelectorAll('.hover-card').forEach(card => card.remove());
                })
                hoverCard.classList = 'hover-card';
                ['title', 'app', 'time', 'dur'].forEach(elem => {
                    let p = document.createElement('p');
                    p.innerText = e.target.dataset[elem];
                    hoverCard.appendChild(p);
                });
                hoverCard.style.left = (e.target.offsetLeft + (e.target.offsetWidth / 2)) + 'px';
                container.appendChild(hoverCard);
                hoverCard.style.top = parseInt(timelineY.split('px')[0]) < (document.getElementById('main-pane').offsetHeight / 2) ? e.target.offsetTop + 25 + 'px' : e.target.offsetTop - hoverCard.offsetHeight + 'px';
            }
        });
    });
    let hourMarkers = document.createElement('div');
    hourMarkers.id = 'hour-markers';
    timeline.appendChild(hourMarkers);
    for (let i = parseInt(filteredRecordsFull[0].start.split(' ')[1].split(':')[0]); i <= parseInt(filteredRecordsFull[filteredRecordsFull.length - 1].end.split(' ')[1].split(':')[0]); i++) {
        let hour = i < 13 ? `${i === 0 ? 12 : i}am` : `${i - 12}pm`;
        let date = `${filteredRecordsFull[0].start.split(' ')[0]} ${i < 10 ? '0' + i : i}:00:00`;
        let percentage = ((new Date(date) / 1000) - originStart) / timeframeFull * 100;
        if (percentage > 0) {
            let prevdate = `${filteredRecordsFull[0].start.split(' ')[0]} ${i - 1 < 10 ? '0' + i - 1 : i - 1}:00:00`;
            let prevPercentage = ((new Date(prevdate) / 1000) - originStart) / timeframeFull * 100;
            if (prevPercentage < 0) prevPercentage = 0;
            let h = document.createElement('div');
            h.innerText = hour;
            h.classList = 'hour-marker';
            h.id = hour;
            h.style.flex = `${percentage - prevPercentage} 1`;
            hourMarkers.appendChild(h);
        }
    };
    hourMarkers.style.width = tc.width * .96 + 'px';
    if (document.getElementById('app-compilation')) document.getElementById('app-compilation').remove();
    let appComp = document.createElement('div');
    appComp.id = 'app-compilation';
    apps.sort((prev, curr) => appTotals[curr] - appTotals[prev]).forEach(app => {
        let appVal = document.createElement('div');
        appVal.id = `${app}-total`;
        appVal.classList = 'app-comp';
        appVal.style.backgroundColor = colorMapping[app];
        appVal.style.flex = `${appTotals[app]} 1`;
        appComp.appendChild(appVal);
        let dur = appTotals[app];
        let hh = ((Math.floor(dur / 3600) < 10) ? ("0" + Math.floor(dur / 3600)) : Math.floor(dur / 3600));
        let mm = ((Math.floor(dur % 3600 / 60) < 10) ? ("0" + Math.floor(dur % 3600 / 60)) : Math.floor(dur % 3600 / 60));
        let ss = ((Math.floor(dur % 3600 % 60) < 10) ? ("0" + Math.floor(dur % 3600 % 60)) : Math.floor(dur % 3600 % 60));
        appVal.dataset.dur = `${hh}h ${mm}m ${ss}s`;
        appVal.dataset.app = app;
        appVal.addEventListener('mouseenter', (e) => {
            if (e.target.id) {
                let hoverCard = document.createElement('div');
                e.target.addEventListener('mouseleave', (e) => {
                    document.querySelectorAll('.hover-card').forEach(card => card.remove());
                })
                hoverCard.classList = 'hover-card';
                ['app', 'dur'].forEach(elem => {
                    let p = document.createElement('p');
                    p.innerText = e.target.dataset[elem];
                    hoverCard.appendChild(p);
                });
                hoverCard.style.left = (e.target.offsetLeft + (e.target.offsetWidth / 2)) + 'px';
                appVal.appendChild(hoverCard);
                hoverCard.style.top = parseInt(timelineY.split('px')[0]) < (document.getElementById('main-pane').offsetHeight / 2) ? e.target.offsetTop + 25 + 'px' : e.target.offsetTop - hoverCard.offsetHeight + 'px';
            }
        });
    });
    document.getElementById('timeline').appendChild(appComp);
    filteredRecordsFull.forEach(record => {
        let tlEvent = document.createElement('div');
        let width = (record.dur / timeframeFull) * tc.width;
        if (width < 1) width = 1;
        tlEvent.id = record.start.split(' ')[1];
        tlEvent.style.width = `${width}px`;
        let left = (((new Date(record.start) / 1000) - originStart) / timeframeFull) * tc.width + tc.left;
        tlEvent.style.left = `${left}px`;
        tlEvent.style.backgroundColor = colorMapping[record.app];
        tlEvent.classList = 'select-timeframe-event';
        selectTimeframe.appendChild(tlEvent);
    });
    if (!document.getElementById('selection-box')) createTimelineSlider(tc, timeframeFull, filteredRecordsFull[0].start);
};

const downloadCSV = () => {
    let filteredResults = globalRecords.filter(r => !removedApps.includes(r.app) && r.checked);
    let exportVals = 'app,title,start,end,dur,duration,tags\n' + filteredResults.map(r => `${r.app},${r.title.replace(/,/g, ';')},${r.start},${r.end},${r.dur},${r.duration},${r.tags.map(id => tags.filter(t => t.id === id)[0].name + ';').join('')}\n`).join('');
    let subject = filteredResults[0].start.split(' ')[0].split('-')[1] + '-' + filteredResults[0].start.split(' ')[0].split('-')[2] + '_' + filteredResults[filteredResults.length - 1].start.split(' ')[0].split('-')[1] + '-' + filteredResults[filteredResults.length - 1].start.split(' ')[0].split('-')[2] + '_time_tracking';
    window.api.send('write-csv', exportVals);
    window.api.receive('return-csv', (data) => {
        if (data[0][0] === 'write complete') {
            let a = document.createElement('a');
            a.href = data[0][1];
            a.id = 'file-link';
            let user = /[a-zA-Z]+\.[a-zA-Z]+/.exec(data[0][2]);
            user = user.length > 0 ? '-' + user[0].replace(/\./g, '_') : '';
            a.download = `${subject + user}.csv`;
            a.style.visibility = 'hidden';
            document.body.appendChild(a);
            document.getElementById('file-link').click();
            document.getElementById('file-link').remove();
            let downloadStatus = document.createElement('p');
            let saveLocation = appSettings.filter(setting => setting.name === 'save-location')[0].details;
            if (!['desktop', 'downloads', 'documents'].includes(saveLocation.toLowerCase())) {
                let formattedPath = saveLocation.split('\\').reduce((prev, curr, index) => {
                    if (index !== saveLocation.split('\\').length - 2 && index !== saveLocation.split('\\').length - 1) curr = '..';
                    return [...prev, curr]
                }, []).join('\\');
                if (formattedPath.length > 30) formattedPath = formattedPath.slice(formattedPath.length - 30);
                let lastBackSlash = formattedPath.indexOf('\\');
                if (lastBackSlash >= 2 && lastBackSlash <= 4) formattedPath = '..' + formattedPath.slice(lastBackSlash);
                saveLocation = formattedPath;
            }
            downloadStatus.id = 'download-status';
            downloadStatus.classList = 'center';
            window.api.send('check-download-status', 'check');
            window.api.receive('download-status', (status) => {
                if (status[0] === 'Download successful') {
                    downloadStatus.innerText = `CSV successfully downloaded to ${saveLocation}`;
                    downloadStatus.style.left = '40%';
                }
                else {
                    downloadStatus.innerHTML = `Failed to download to ${saveLocation}.<br> Please select another Save Location in the Settings pane.`;
                }
                document.body.appendChild(downloadStatus);
                downloadStatus.addEventListener('animationend', () => downloadStatus.remove());
            })
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
        let visibleRows = [];
        activeTables.forEach(table => visibleRows = [...visibleRecords[table.type]]);
        if (visibleRows.filter(r => r === recordID).length > 0) drawTag();
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
            result.addEventListener('mousedown', (e) => { // Clicked to add tag
                if (td.id === 'unknown-tag') {
                    let parent = document.getElementById('unknown-tag').parentNode;
                    td.remove();
                    parent.innerText = e.target.innerText + parent.innerText;
                    dropTag = 'tag-' + tags.filter(t => t.name === e.target.innerText)[0].id;
                    document.getElementById('merge').click();
                }
                if (td.id !== 'unknown-tag' && td.id !== 'tag-modal') {
                    let record = globalRecords[td.parentNode.id.substring(td.parentNode.id.indexOf('-') + 1)];
                    if (sortedTags[i].name !== 'Add Tag') {
                        let tagID = tags.filter(tag => tag.name === sortedTags[i].name)[0].id;
                        if (record.tags.filter(t => t === tagID).length === 0) {
                            globalRecords[record.id].tags.push(tagID);
                            let zt = zoomTags.filter(zt => zt.start === record.id);
                            if (zt.length > 0) {
                                modifyZoomTags(zt[0].start, zt[0].end, zt[0].origin, tagID, 'add')
                            }
                            else {
                                drawTag();
                            }
                        }
                    }
                }
                if (td.id === 'tag-modal') {
                    document.getElementById('tag-search').value = e.target.innerText;
                }
                // Clicked to add non-existent Tag
                if (td.id !== 'tag-modal') {
                    if (sortedTags[i].name === 'Add Tag' && document.getElementById('tag-search').value.length > 0 && document.getElementById('tag-search').value.toLowerCase() !== 'add tag' && tags.filter(tag => tag.name === document.getElementById('tag-search').value.trim().toLowerCase()).length === 0) handleAddTag(td);
                }
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
    if (e.type === 'keyup' && e.key === 'Enter' && document.getElementById('tag-search').value.length > 0 && hover < 0) {
        td.id === 'tag-modal' ? document.getElementById('tag-search').blur() : handleAddTag(td);
    }
    if (e.type === 'keyup' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        if (hover === -1 && e.key === 'ArrowDown') {
            if (document.querySelectorAll('.tag-search-result')[hover]) document.querySelector('.tag-search-result').classList.add('key-focus');
            hover++;
        }
        else if (hover === 0 && e.key === 'ArrowUp') {
            document.getElementById('tag-search').focus();
            hover = -1;
        }
        else if (hover >= 0 && hover < document.querySelectorAll('.tag-search-result').length) {
            hover += e.key === 'ArrowUp' ? -1 : 1
            if (document.querySelectorAll('.tag-search-result')[hover]) document.querySelectorAll('.tag-search-result')[hover].classList.add('key-focus');
        }
    }
    if (e.type === 'keyup' && e.key === 'Enter' && hover >= 0) {
        td.id === 'tag-modal' ? document.getElementById('tag-search').value = document.querySelectorAll('.tag-search-result')[hover].innerText : handleAddTag(td);
        document.getElementById('tag-search').blur();
    }
};

const handleAddTag = (td) => {
    let searchVal = hover >= 0 && document.querySelectorAll('.tag-search-result').length > 0 && document.querySelectorAll('.tag-search-result')[hover].innerText.toLowerCase() !== 'add tag' ? document.querySelectorAll('.tag-search-result')[hover].innerText : document.getElementById('tag-search').value.trim();
    if (td.id === 'unknown-tag') {
        let parent = document.getElementById('unknown-tag').parentNode;
        td.remove();
        parent.innerText = searchVal + parent.innerText;
        dropTag = 'tag-' + tags.filter(t => t.name === searchVal)[0].id;
        document.getElementById('merge').click();
    }
    if (td.id !== 'unknown-tag') {
        let record = globalRecords[td.parentNode.id.substring(td.parentNode.id.indexOf('-') + 1)];
        let existingTag = tags.filter(tag => tag.name.toLowerCase() === searchVal.toLowerCase());
        if (existingTag.length === 0) createNewTag(searchVal, record.tags, record.id)
        if (existingTag.length > 0) {
            let tagID = existingTag[0].id;
            if (globalRecords[record.id].tags.filter(t => t === tagID).length === 0) {
                globalRecords[record.id].tags.push(tagID);
                let zt = zoomTags.filter(zt => zt.start === record.id);
                if (zt.length > 0) {
                    modifyZoomTags(zt[0].start, zt[0].end, zt[0].origin, tagID, 'add');
                }
                else {
                    drawTag();
                }
            }
        }
        if (document.getElementById('tag-search')) {
            document.getElementById('tag-search').blur();
        }
    }
}

const removeSearchTagsDropdown = () => {
    document.getElementById('tag-search').parentNode.remove();
}

const drawTag = () => {
    activeTables.forEach(table => {
        let type = table.type;
        visibleRecords[type].forEach(rowID => {
            let val = type === 'top-tags' ? [topTag[rowID].tag.id] : globalRecords[rowID].tags;
            if (val.length > 0) {
                const tableRowID = `${type}-${rowID}`;
                const td = document.getElementById(tableRowID).querySelector('.tags-col');
                let existingTags = [...td.childNodes].filter(tag => tag.className.includes('tag-'));
                if (val.length !== existingTags.length) {
                    val.forEach(tid => {
                        if (existingTags.filter(tag => tag.className.includes(tid)).length === 0) {
                            let t = tags.filter(tag => tag.id === tid)[0];
                            let tag = document.createElement('p');
                            tag.innerText = t.name;
                            tag.classList = `tags tag-${t.id}`;
                            if (type !== 'top-tags') {
                                tag.addEventListener('mouseenter', (e) => {
                                    let x = document.createElement('span');
                                    x.classList = 'delete-tag';
                                    x.innerText = 'x'
                                    tag.appendChild(x);
                                    x.addEventListener('click', (e) => {
                                        e.stopImmediatePropagation();
                                        let tagIDToRemove = parseInt(e.target.parentNode.classList[1].split('-')[1]);
                                        if (/^\d+$/.test(tagIDToRemove)) {
                                            let id = e.target.parentNode.parentNode.parentNode.id;
                                            let fromZoom = id.split('-')[0] === 'zoom';
                                            id = id.split('-')[1];
                                            globalRecords[id].tags = globalRecords[id].tags.filter(t => t !== tagIDToRemove);
                                            activeTables.forEach(table => {
                                                if (visibleRecords[table.type].includes(parseInt(id))) createTable(table.type);
                                            });
                                            if (fromZoom) {
                                                let zt = zoomTags.filter(zt => zt.start === parseInt(id))[0];
                                                modifyZoomTags(zt.start, zt.end, zt.start, tagIDToRemove, 'delete')
                                            }
                                            if (document.getElementsByClassName('add-tag')[0]) document.getElementsByClassName('add-tag')[0].remove();
                                        };
                                    })
                                });
                                tag.addEventListener('mouseleave', (e) => {
                                    let x = tag.childNodes[tag.childNodes.length - 1];
                                    x.remove();
                                })
                            }
                            tag.addEventListener('contextmenu', (e) => createCustomContextMenu(e));
                            tag.addEventListener('click', (e) => {
                                tagID = [...e.target.classList].filter(t => t.includes('tag-'))[0].split('-')[1];
                                createTable('tag')
                            })
                            tag.draggable = true;
                            tag.addEventListener('drag', (e) => {
                                dragTag = [...e.target.classList][1];
                                dropTag = null;
                            });
                            tag.addEventListener('dragend', (e) => {
                                if (!dropTag || dragTag === dropTag) dragTag = null;
                            })
                            tag.addEventListener('dragover', (e) => {
                                e.preventDefault();
                            })
                            tag.addEventListener('drop', (e) => {
                                e.preventDefault();
                                dropTag = e.target.classList[1];
                                if (!dropTag || dragTag === dropTag) dragTag = null;
                                if (dragTag && dropTag) openTagModal('merge');
                            })
                            td.appendChild(tag);
                        }
                    })
                }
            }
        });
    })
}

const massTag = (id, newTag) => {
    let title = document.getElementById(`${document.getElementById('record-table') ? 'record' : 'tag'}-${id}`).querySelector('.title-col').innerText;
    globalRecords.forEach(record => {
        if (record.title.toLowerCase() === title.toLowerCase() && !record.tags.includes(newTag.id)) record.tags.push(newTag.id);
    })
    drawTag();
}

const openTagModal = (action, tagID = null) => {
    document.querySelectorAll('.bring-to-front').forEach(t => t.classList.remove('bring-to-front'));
    let modalBackground = document.createElement('div');
    modalBackground.id = 'modal-background';
    modalBackground.addEventListener('click', () => {
        modalBackground.remove();
        if (document.getElementById('tag-modal')) document.getElementById('tag-modal').remove();
        dropTag = null;
        dragTag = null;
    })
    document.body.appendChild(modalBackground);
    let modal = document.createElement('div');
    modal.id = 'tag-modal';
    let winWidth = window.innerWidth - 240;
    let width = winWidth * .6 > 800 ? 800 : winWidth * .6;
    let height = width * .66;
    modal.style.width = width + 'px';
    modal.style.height = height + 'px';
    modal.style.left = `${(window.innerWidth / 2) - (width / 2) + 240}px`;
    modal.style.top = `${(window.innerHeight / 2) - (height / 2)}px`;
    let text = document.createElement('h1');
    switch (action) {
        case 'merge':
            text.innerText = 'How would you like to merge tags?';
            break;
        case 'edit':
            text.innerText = 'Rename tag:';
            break;
        case 'mass':
            text.innerText = 'Please choose a tag name:';
            break;
        case 'remove-all':
            text.innerHTML = 'This will remove this tag from all records.<br><br>Are you sure?';
            break;
        default:
            break;
    }
    text.style.marginBottom = `${height * .1}px`;
    modal.appendChild(text);
    const createRenameInput = () => {
        let tagName = document.createElement('input');
        tagName.type = 'text';
        tagName.style.width = action === 'merge' ? `${width * .56}px` : '95%';
        switch (action) {
            case 'merge':
                tagName.placeholder = `${tags.filter(t => t.id === parseInt(dropTag.split('-')[1]))[0].name}-${tags.filter(t => t.id === parseInt(dragTag.split('-')[1]))[0].name}`;
                break;
            case 'mass':
                tagName.placeholder = 'New tag name';
                break;
            default:
                tagName.placeholder = tags.filter(t => t.id === parseInt(tagID))[0].name;
                break;
        }
        if (action === 'edit') tagName.value = tags.filter(t => t.id === parseInt(tagID))[0].name;
        const newTagName = () => {
            let input = modal.querySelector('input');
            let title = input.value.length === 0 ? input.placeholder : input.value;
            let rowID = tagID; // mass tag action passes rowID instead of tagID added for readibility
            if (tags.filter(tag => tag.name === title).length <= 1) {
                if (tags.filter(tag => tag.name === title).length === 0) createNewTag(title);
                if (action === 'mass') massTag(rowID, tags.filter(tag => tag.name === title)[0]);
                if (action !== 'mass') {
                    let newTagID = tags.filter(tag => tag.name === title)[0].id;
                    modifyTags(newTagID, action === 'edit' ? [parseInt(tagID)] : [parseInt(dropTag.split('-')[1]), parseInt(dragTag.split('-')[1])]);
                }
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
            if ((e.key === 'Enter' && action !== 'mass') || (e.key === 'Enter' && action === 'mass' && !document.getElementById('tags-dropdown'))) newTagName();
        })
        let tagLabel = document.createElement('label');
        tagLabel.innerText = action === 'merge' ? 'Merged tag name:' : '';
        let tagDiv = document.createElement('div');
        tagDiv.id = 'merge-tag-input';
        tagDiv.appendChild(tagLabel);
        tagDiv.appendChild(tagName);
        if (action === 'mass') {
            tagName.id = 'tag-search';
            tagName.addEventListener('focus', searchTags);
            tagName.addEventListener('keyup', searchTags);
            tagName.addEventListener('blur', () => {
                console.trace()
                if (document.getElementById('tags-dropdown')) document.getElementById('tags-dropdown').remove()
            });
        }
        tagDiv.style.width = `${width * .8}px`;
        tagDiv.style.marginLeft = `${width * .1}px`;
        if (action !== 'remove-all') {
            modal.appendChild(tagDiv);
            tagName.focus();
        }
        let button = document.createElement('button');
        switch (action) {
            case 'merge':
                button.innerText = 'Merge';
                break;
            case 'edit':
                button.innerText = 'Save';
                break;
            case 'mass':
                button.innerText = 'Save';
                break;
            case 'remove-all':
                button.innerHTML = 'Remove Tag';
                break;
            default:
                break;
        }
        button.id = 'tag-modal-button';
        button.style.margin = `${width * .05}px 0 0 ${width * .87}px`;
        if (['edit', 'mass'].includes(action)) {
            button.style.position = 'absolute';
            button.style.top = '78%';
        }
        if (action === 'remove-all') {
            button.style.margin = '0 auto';
            button.style.backgroundColor = '#7d0000';
            button.style.color = 'white';
            const deleteTag = (e) => {
                if (e.key === 'Enter' || e.code === 'Space' || e.type === 'click') {
                    modifyTags(-1, [parseInt(tagID)]);
                    modalBackground.click();
                    document.body.removeEventListener('keyup', deleteTag);
                }
            }
            button.addEventListener('click', deleteTag);
            document.body.addEventListener('keyup', deleteTag);
        }
        if (action !== 'remove-all') button.addEventListener('click', newTagName);
        modal.appendChild(button);
    }
    if (['edit', 'remove-all', 'mass'].includes(action)) {
        createRenameInput();
    }
    if (action === 'merge') {
        let tagOptions = ['merge', 'parent-child'];
        tagOptions.forEach(id => {
            let p = document.createElement('div');
            p.style.width = `${width * .8}px`;
            p.style.marginLeft = `${width * .1}px`;
            p.id = id;
            p.classList = 'tag-option';
            if (!dragTag) dragTag = 'tag-' + tagID;
            p.innerHTML = id === 'merge' ?
                `<h2>Merge tags: combine tags with the option to rename</h2> <h3>${dropTag ? tags.filter(t => t.id === parseInt(dropTag.split('-')[1]))[0].name : '<span id="unknown-tag"></span>'} &#8594;&#8592; ${tags.filter(t => t.id === parseInt(dragTag.split('-')[1]))[0].name}</h3>` :
                `<span style='color:darkgray;'><h2>Parent-child tagging: Coming Soon</h2> <h3 style='color:darkgray;'>${dropTag ? tags.filter(t => t.id === parseInt(dropTag.split('-')[1]))[0].name : '???'} <br><span style='line-height:1.5;margin-left:${width * .04}px;'>&#8627; ${tags.filter(t => t.id === parseInt(dragTag.split('-')[1]))[0].name}</span></h3></span>`;
            modal.appendChild(p);
            p.addEventListener('click', (e) => {
                let id = e.target.parentNode.id === 'tag-modal' ? e.target.id : e.target.parentNode.id ? e.target.parentNode.id : e.target.parentNode.parentNode.id ? e.target.parentNode.parentNode.id : e.target.parentNode.parentNode.parentNode.id;
                if (id === 'merge') {
                    document.getElementById(id).style.backgroundColor = 'gray';
                    tagOptions.filter(o => o !== id).forEach(o => {
                        document.getElementById(o).addEventListener('animationend', () => {
                            p.style.pointerEvents = 'none';
                            document.getElementById(o).style.visibility = 'hidden';
                            createRenameInput();
                            document.getElementById(o).remove();
                        })
                        document.getElementById(o).classList.add('hide-option');
                    })
                }
            })
        })
    }
    document.body.appendChild(modal);
    if (!dropTag && action === 'merge') createTagSearch(document.getElementById('unknown-tag'));
};

const modifyTags = (mergedID, oldTagIDs) => {
    let deleteTags = mergedID === -1;
    let records = globalRecords.filter(r => r.tags.includes(oldTagIDs[0]) || r.tags.includes(oldTagIDs[oldTagIDs.length - 1]));
    records.forEach(r => {
        globalRecords[r.id].tags = deleteTags ? globalRecords[r.id].tags.filter(tag => tag !== oldTagIDs[0]) : [...globalRecords[r.id].tags.filter(tag => tag !== oldTagIDs[0] && tag !== oldTagIDs[oldTagIDs.length - 1]), mergedID];
    });
    dragTag = null;
    dropTag = null;
    if (document.getElementById('tag-section')) tagID = mergedID;
    activeTables.forEach(table => createTable(table.type));
}

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
    let existingHandles = [...document.getElementsByClassName('handle')].filter(handle => handle.id === '');
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
    const apps = [...document.getElementById('app-drawer').querySelectorAll('.app-filter')];
    removedApps = [...apps.filter(app => !app.checked).map(app => app.value)].sort();
    filterTitle = '';
    filteredRecords = globalRecords;
    createTable('record');
}

const createActions = () => {
    if (!document.getElementById('input-pane')) {
        let pane = document.createElement('div');
        pane.id = 'input-pane';
        pane.style.display = 'flex';
        document.getElementById('container').appendChild(pane);
        let ci = document.createElement('div');
        ci.id = 'component-inputs';
        pane.appendChild(ci);
        let actionHeader = document.createElement('h2');
        actionHeader.innerText = 'Actions';
        ci.appendChild(actionHeader);
        let actionComps = document.createElement('div');
        actionComps.id = 'action-components';
        ['download-csv', 'timeline-button', 'zoom-table-button', 'record-table-button', 'top-tags-table-button'].forEach(button => {
            if (!document.getElementById(button)) {
                let row = document.createElement('div');
                row.id = button;
                row.classList = 'components';
                row.addEventListener('click', () => {
                    if (globalRecords.filter(record => !removedApps.includes(record.app) && record.checked).length > 0) {
                        if (button === 'download-csv') downloadCSV();
                        if (button === 'timeline-button') {
                            if (document.getElementById('timeline')) {
                                document.getElementById('timeline').remove();
                                document.getElementById('selection-box').remove();
                            }
                            else {
                                createTimeline();
                            }
                        }
                        if (button.includes('table-button')) {
                            let tableType = button === 'top-tags-table-button' ? 'top-tags' : button.split('-')[0];
                            if (tableType === 'zoom' && zoomTags.length > 0 || tableType !== 'zoom') {
                                if (document.getElementById(`${tableType}-section`)) {
                                    activeTables = activeTables.filter(t => t.type !== tableType);
                                    document.getElementById(`${tableType}-section`).remove()
                                }
                                else {
                                    createTable(tableType);
                                }
                            };
                        }
                    }
                });
                row.innerText = button.includes('button') ? button.replace(/-/g, ' ').replace('button', '').trim() : 'Download CSV';
                actionComps.appendChild(row);
            }
        })
        ci.appendChild(actionComps);
    }
}

const createAppFilter = (apps) => {
    let container = document.getElementById('container');
    let inputPane = document.getElementById('input-pane');
    if (document.getElementById('app-drawer')) document.getElementById('app-drawer').remove();
    let appDrawer = document.createElement('div');
    const setUnselectAll = () => {
        let visibleCount = [...appComps.querySelectorAll('.app-filter')].length;
        let visibleChecked = [...appComps.querySelectorAll('.app-filter[type="checkbox"]:checked')].length;
        if (visibleChecked === visibleCount) {
            unselectAllInput.checked = true;
            unselectAllInput.indeterminate = false;
            unselectAllLabel.innerText = 'Unselect All';
        }
        if (visibleChecked < visibleCount) {
            unselectAllInput.checked = false;
            unselectAllInput.indeterminate = true;
            unselectAllLabel.innerText = 'Select All';
            if (visibleChecked === 0) {
                unselectAllInput.checked = false;
                unselectAllInput.indeterminate = false;
            }
        }
    }
    appDrawer.id = 'app-drawer';
    let unselectAllLabel, unselectAllInput, unselectAllDiv;
    if (document.getElementById('unselect-all-apps') === null) {
        unselectAllDiv = document.createElement('div');
        unselectAllDiv.id = 'unselect-apps';
        unselectAllInput = document.createElement('input');
        unselectAllInput.type = 'checkbox';
        unselectAllInput.id = 'unselect-all-apps';
        unselectAllLabel = document.createElement('label');
        unselectAllLabel.for = 'Unselect All';
    }
    let appComps = document.createElement('div');
    appComps.id = 'app-components';
    apps = apps.sort();
    apps.forEach(app => {
        let div = document.createElement('div');
        div.classList = 'app-component';
        let input = document.createElement('input');
        let appName = app;
        if (removedApps.includes(appName)) div.classList = 'app-component unchecked';
        if (removedApps.includes(appName)) div.id = `unchecked-${appName}`;
        input.type = 'checkbox';
        input.checked = removedApps.includes(appName) ? false : true;
        input.classList = 'app-filter';
        input.id = `app-${appName}`;
        input.value = appName;
        input.name = appName;
        div.appendChild(input);
        let label = document.createElement('label');
        label.innerText = appName;
        label.dataset.for = appName;
        div.dataset.for = appName;
        [div, label].forEach((element) => {
            element.addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                let checkbox = document.getElementById('app-' + e.target.dataset.for);
                checkbox.checked = !checkbox.checked;
                checkbox.parentNode.classList = `app-component ${!checkbox.checked ? ' unchecked' : ''}`;
                checkbox.parentNode.id = !checkbox.checked ? `unchecked-${app}` : '';
                setUnselectAll();
                refreshFilterResults();
            });
        });
        div.appendChild(label);
        appComps.appendChild(div);
    });
    appDrawer.appendChild(appComps)
    if (document.getElementById('unselect-all-apps') === null) {
        [unselectAllDiv, unselectAllLabel].forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                let checkbox = document.getElementById('unselect-all-apps');
                if (checkbox.checked) {
                    checkbox.checked = false; // Unselect All
                    unselectAllLabel.innerText = 'Select All';
                }
                else if (checkbox.indeterminate || !checkbox.checked) {
                    checkbox.checked = true; // Select All
                    unselectAllLabel.innerText = 'Unselect All';
                }
                checkbox.indeterminate = false;
                apps.forEach(app => {
                    let input = document.getElementById(`app-${app}`);
                    input.checked = checkbox.checked;
                    input.parentNode.classList = `app-component ${!checkbox.checked ? ' unchecked' : ''}`;
                    input.parentNode.id = !checkbox.checked ? `unchecked-${app}` : '';
                });
                refreshFilterResults();
            });
        });
        unselectAllDiv.appendChild(unselectAllInput);
        unselectAllDiv.appendChild(unselectAllLabel);
        setUnselectAll();
        appDrawer.prepend(unselectAllDiv);
        let appSelectHeader = document.createElement('h2');
        appSelectHeader.innerText = 'Applications';
        appDrawer.prepend(appSelectHeader);
    }
    inputPane.prepend(appDrawer);
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
            if (type === 'dragenter' && document.getElementById('error-invalid')) document.getElementById('error-invalid').remove();
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
    if (document.getElementById('drag-n-drop')) document.getElementById('drag-n-drop').remove();
    document.body.appendChild(dragAndDrop);
    const leaveDragNDrop = (e) => {
        if (dataLoaded === false) {
            document.removeEventListener('mouseleave', leaveDragNDrop);
            createDragAndDropArea();
        }
        e.stopImmediatePropagation();
    };
    document.addEventListener('mouseleave', leaveDragNDrop)
}