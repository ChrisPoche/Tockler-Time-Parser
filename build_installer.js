// 1. Import Modules
const { MSICreator } = require('electron-wix-msi');
const path = require('path');
const buildDetails = require('./build_details.json');

const APP_NAME = buildDetails.name.split('-').map(str => str.charAt(0).toUpperCase() + str.slice(1)).join(' ');

// 2. Define input and output directory.
// Important: the directories must be absolute, not relative e.g
const APP_DIR = path.resolve(__dirname, `../${APP_NAME}/${APP_NAME}-win32-ia32`);
const OUT_DIR = path.resolve(__dirname, `../${APP_NAME.replace(' ', '_')}_installer`);


// 3. Instantiate the MSICreator
const msiCreator = new MSICreator({
    appDirectory: APP_DIR,
    outputDirectory: OUT_DIR,
    appIconPath: APP_DIR + '/resources/app/assets/icons/win/icon.ico',

    // Configure metadata
    description: buildDetails.description,
    exe: APP_NAME,
    name: APP_NAME,
    manufacturer: buildDetails.author,
    version: buildDetails.version,

    // Configure installer User Interface
    ui: {
        chooseDirectory: true
    },
});

// 4. Create a .wxs template file
msiCreator.create().then(function () {

    // Step 5: Compile the template to a .msi file
    msiCreator.compile();
});
