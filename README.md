# Tockler-Time-Parser

Using the active window capture of [Tockler](https://maygo.github.io/tockler/), this takes the raw data export and adds some custom functionality.

## Available Scripts

In the project directory, you can run:

### `npm run minify`

Uses Uglify to minify the app.js file.

### `npm run start`

Initializes a new Electron browser window.

### `npm run package-win`

Runs the minify script and points index.html toward that, builds the application .exe, and points index back toward app.js.  

### `npm run create-installer`

Runs package-win for new build, copies app details from package.json into build_details.json file, initializes creation of msi installer through WiX. Instructions to configure machine for this can be found: [here](https://ourcodeworld.com/articles/read/927/how-to-create-a-msi-installer-in-windows-for-an-electron-framework-application)
