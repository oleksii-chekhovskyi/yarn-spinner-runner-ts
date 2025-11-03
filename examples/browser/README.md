# Browser Demo

This is a browser-based demo of the Yarn Spinner dialogue system.

## Running the Demo

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run demo
   ```

   This will start a Vite dev server at `http://localhost:3000` and open it in your browser.

3. Build for production:
   ```bash
   npm run demo:build
   ```

   The built files will be in `dist-demo/`.

## Features Demonstrated

- Visual novel-style dialogue UI
- Click-to-continue text display
- Interactive option selection
- CSS styling support for options
- Speaker names
- Real-time Yarn script editing

## Customization

Edit `src/react/DialogueExample.tsx` to change the default Yarn script or customize the UI.

Edit `src/react/DialogueView.tsx` to change the dialogue box styling and behavior.

