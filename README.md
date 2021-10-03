# Tockler-Time-Parser

Using the active window capture of [Tockler](https://maygo.github.io/tockler/), this takes the raw data export and adds some custom functionality.

## Available Scripts

In the project directory, you can run:

### `npm run start`

Initializes a new Electron browser window.

### Planned features:
Tagging
- Add calculations of related projects / work by tag
- Auto tagging based on ticket numbers from records loaded in
- Ability to combine tags - Drag and Drop: when overlapping pops up modal to ask if user wants to merge or create parent-child with element
    - This will update the tags object, and trigger a redraw of the table with the new values

Calculated / Tag Section
- Using auto tagging, create a table of tagged records to see them at a glance
    - Auto tagging pulls tangential events together. If Slack event (from channel, no direct message) is followed by a browser event, pair those together 
- Dropdown of related child rows based on tag
- Ability to toggle chart from displaying results by Apps to Tags

Styling
- Create snap in place zones when moving elements around the page
- Update App Filter section to have selectable pills rather than checkbox row
    - Leave as a checkbox input, to retain the "checked" value, but move/hide the actual box element

Tabs
- Allow elements to be minimized into tabs to help keep the page organized

Local Storage
- Potentially implement a light weight local database