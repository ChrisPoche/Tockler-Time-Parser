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
- Enable user to create custom auto tag filters
  - Prioritize after implementing local storage / database to allow preferences to persist
- Ability to toggle chart from displaying results by Apps to Tags
- Table of top tags by duration
- Tag all within the Tags table using an Add button found in the tags column
  - Will include same search bar found inline when tagging from Record table row

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

### Defects

- Clicking tag on Zoom table removes close button. Workaround, drag table redraw on drop recreates the close button
