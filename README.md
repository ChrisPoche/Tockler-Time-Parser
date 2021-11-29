# Tockler-Time-Parser

Using the active window capture of [Tockler](https://maygo.github.io/tockler/), this takes the raw data export and adds some custom functionality.

## Available Scripts

In the project directory, you can run:

### `npm run start`

Initializes a new Electron browser window.

### Planned features

Tagging

- Ability to combine tags: merge (complete) & parent-child
  - Parent-child: need to insert tag values as objects to nest children
    - May need to include parent ID to allow easier traversing on merges or subsequent nesting
- Ability to toggle chart from displaying results by Apps to Tags
- Table of top tags by duration

Styling

- Create snap in place zones when moving elements around the page
- Update App Filter section to have selectable pills rather than checkbox row
  - Leave as a checkbox input, to retain the "checked" value, but move/hide the actual box element

Tabs

- Allow elements to be minimized into tabs to help keep the page organized

Local Storage

- Extend existing Tockler sqlite database with tables for user preference and settings in this app

### To Do List

- Add/Delete tag to all Zoom meetings. Iterate the events, updating filtered tags zoomTags.start-zoomTags.end
- Draw newly added/removed tags to other tables
- Editing auto-tag value finds existing filter, updates tags object and redraws tables
- Merge tags allows you to choose existing name if one of the two being merged 

### Defects

- Clicking tag on Zoom table removes close button. Workaround, drag table redraw on drop recreates the close button
- QueryAll and clear all drag-and-drops when removing to prevent multiple elements with drag-and-drop id 
