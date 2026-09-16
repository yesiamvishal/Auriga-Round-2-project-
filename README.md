# Fair Share

A small, dependency-free web app for tracking equal contributions to a shared pool and producing a simple settlement plan.

## Run locally

No installation or build step is required.

1. Clone or download this repository.
2. Open `index.html` in a browser, or serve the folder with any static server:

	```bash
	python3 -m http.server 8000
	```

3. Visit `http://localhost:8000`.

The app stores the current pool in the browser's `localStorage`, so refreshing the page keeps the data on that device. Use **Reset** to return to a blank pool, or **Load example** to restore the farewell gift scenario.

## How to use

1. Set the pool name and target amount.
2. Add each participant and enter the amount they have paid.
3. Read each person's remaining amount or credit in the **People** list.
4. Use **Settlement plan** for the shortest practical list of transfers. Positive balances receive money; negative balances pay money.

The settlement calculation is based on the current balances, so it remains useful when the target is overfunded or someone pays extra. Amounts are shown in Indian rupees and are rounded to the nearest paise.

## Debugging

- Open browser developer tools and check the Console for JavaScript errors.
- To clear saved data, use the **Reset** button or run `localStorage.removeItem('fair-share-pool')` in the Console.
- The app is intentionally framework-free: edit `index.html`, `style.css`, or `script.js` and refresh the browser.

## Files

- `index.html` - app structure and accessible controls.
- `style.css` - responsive visual design.
- `script.js` - state, calculations, rendering, and local persistence.
- `REASONING.md` - product and implementation reasoning.
- `AI_LOGS.md` - conversation log used to create this submission.