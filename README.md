# Nooby Birthday Gift 🎁

A completely static birthday gift website. It is ready for GitHub + Cloudflare Pages.

## What it does

- Shows a normal wrapped birthday present.
- The recipient has to click/touch and DRAG to tear the wrapping paper.
- It requires 6 separate proper tears by default.
- It also checks that enough wrapping paper was actually ripped away.
- Once opened, it reveals the Primogem birthday gift.
- Includes generated rip sounds, reveal chimes, and confetti.
- Works with mouse and touch.
- No libraries, backend, account, or database required.

## Customise the gift

Open `script.js` and edit the `GIFT` block right at the top:

```js
const GIFT = {
  recipient: "Nooby",
  primogems: "6,480",
  message: "I know you like opening things, so obviously I couldn’t just give you your present normally.",
  claimMessage: "Your real birthday gift is waiting for you! 🎁",
  requiredTears: 6
};
```

For example, if you buy a different amount, change only:

```js
primogems: "12,960",
```

If you want him to have to tear it 10 times:

```js
requiredTears: 10
```

## Upload to GitHub

1. Create a new GitHub repository.
2. Upload:
   - `index.html`
   - `style.css`
   - `script.js`
3. Commit the files.

## Deploy with Cloudflare

### Cloudflare Pages / Workers static deployment

Use Cloudflare's GitHub integration and select the repository.

This project does not need a build command.

Use the repository root as the output/static directory if Cloudflare asks where the static files are.

The important part is that `index.html` is in the published root.

## Test locally

You can double-click `index.html`.

For the most accurate mobile/browser test, serve the folder through a local static server, but it is not required.

## Notes

- The Primogem-style gem is drawn with CSS and does not require copyrighted game artwork.
- The website intentionally requires both:
  - the configured number of separate tear gestures, and
  - at least about 50% of the paper to be removed.

That prevents one giant swipe from instantly opening the gift.
