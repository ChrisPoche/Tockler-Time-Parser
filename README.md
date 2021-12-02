# Tockler-Time-Parser

Using the active window capture of [Tockler](https://maygo.github.io/tockler/), this takes the raw data export and adds some custom functionality.

## Available Scripts

In the project directory, you can run:

### `npm run start`

Initializes a new Electron browser window.

### `npm run package-win`

Builds application .exe.

### `npm run create-installer`

Runs package-win for new build, copies app details from package.json into build_details.json file, initializes creation of msi installer through WiX. Instructions to configure machine for this can be found: [here](https://ourcodeworld.com/articles/read/927/how-to-create-a-msi-installer-in-windows-for-an-electron-framework-application)

### Planned features

Tagging

- Ability to combine tags: merge (complete) & parent-child
  - Parent-child: need to insert tag values as objects to nest children
    - May need to include parent ID to allow easier traversing on merges or subsequent nesting
- Table of top tags by duration

Styling

- Create snap in place zones when moving elements around the page
- Update App Filter section to have selectable pills rather than checkbox row
  - Leave as a checkbox input, to retain the "checked" value, but move/hide the actual box element

Tabs

- Allow elements to be minimized into tabs to help keep the page organized

Local Storage

- Extend existing Tockler sqlite database with tables for user preference and settings in this app
- Add show row count to local storage
- Default Save Location
  - Currently set to download to Desktop, but allow user to set preferred location from dropdown, keep in local storage

### To Do List

- Draw newly added/removed tags to other tables
- Editing auto-tag value finds existing filter, updates tags object and redraws tables

### Defects

- Clicking tag on Zoom table removes close button. Workaround, drag table redraw on drop recreates the close button
- Clicking on header for sort clears filtered records
- Indeterminate checkbox not working, may be prevented due to column sorting instead
