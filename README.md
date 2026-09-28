# Multiple Google Map Generator

A standalone generator that creates a responsive, click-to-load multi-location Google Maps widget from simple location inputs.

## What it does

The generator lets a user enter:

- Dealership name
- Full address
- Optional website URL

It then outputs a copy-ready HTML, CSS, and JavaScript widget. The generated widget displays location cards and only loads a Google Maps iframe after the visitor clicks **Load Map**. This helps avoid loading multiple map iframes on initial page load.

## Why this is useful

Group dealer sites often need a way to display multiple store locations. This generator provides a simple alternative for creating a reusable multi-location map section without manually building each location card or asking users to copy long Google Maps embed URLs.

## Important note about color variables

The generated widget does **not** include a `:root` CSS block. It uses the following existing dealership/OEM color variables:

```css
var(--cta-background-color)
var(--cta-font-color)
var(--cta-hover-color)
var(--main-color)
```

Fallback colors are included directly in the generated CSS, so the widget still has reasonable styling if those variables are not available. The generator page itself uses a simple neutral blue/slate color palette in its own `:root` variables.

## Files

```text
index.html
styles.css
script.js
README.md
.nojekyll
```

## How to run locally

Open `index.html` in your browser.

## How to publish with GitHub Pages

1. Create a new GitHub repository.
2. Add these files to the root of the repository.
3. Go to **Settings** > **Pages**.
4. Set the source to the main branch and root folder.
5. Save and wait for GitHub Pages to publish the site.

## Future improvements

Potential improvements include:

- Optional phone number field
- Custom button text
- Location labels such as Sales, Service, or Parts
- Static image placeholder option
- Export as `.html` file
- More layout/theme options
