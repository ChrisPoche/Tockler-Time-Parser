# Tockler-Time-Parser

Using the active window capture of [Tockler](https://maygo.github.io/tockler/), this takes the raw data export and adds some custom functionality.

## Available Scripts

In the project directory, you can run:

### `npm run start`

Initializes a new Electron browser window.

### Considerations

At this time, I've not included a application distribution tool in the package.json. Here are the suggestions made by [Electron](https://www.electronjs.org/docs/tutorial/application-distribution).

### Planned features

Tagging

- Ability to combine tags - Drag and Drop: when overlapping pops up modal to ask if user wants to merge or create parent-child with element
  - This will update the tags object, and trigger a redraw of the table with the new values
- Enable user to create custom auto tag filters
  - Prioritize after implementing local storage / database to allow preferences to persist
- Ability to toggle chart from displaying results by Apps to Tags
- Table of top tags by duration
- Redraw tag table when tag is deleted from record table. Remove ability to delete tags tag table

Styling

- Create snap in place zones when moving elements around the page
- Update App Filter section to have selectable pills rather than checkbox row
  - Leave as a checkbox input, to retain the "checked" value, but move/hide the actual box element

Tabs

- Allow elements to be minimized into tabs to help keep the page organized

Local Storage

- Extend existing Tockler sqlite database with tables for user preference and settings in this app

Table Creation

- Dry out code for record and tag table creation

### Defects
