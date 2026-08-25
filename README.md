# Landing Pricing Page

A responsive landing page that displays pricing plans dynamically loaded from JSON data.

The page includes responsive pricing cards, download functionality, and an animated indicator arrow that guides the user to the browser's download location.

## Technologies

- HTML5
- CSS3
- JavaScript
- Vite

## Features

- Responsive design for desktop, tablet, and mobile devices
- Dynamic pricing cards generated from JSON data
- Download functionality
- Browser and device detection
- Animated download arrow indicator
- Responsive positioning of the download indicator

## How to Run

### 1. Using Vite

Make sure Node.js is installed.

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL provided by Vite, usually:

```text
http://localhost:5173
```

### 2. Preview the Production Build

Build the project:

```bash
npm run build
```

Then start the production preview:

```bash
npm run preview
```

Open the URL provided by Vite, usually:

```text
http://localhost:4173
```

### 3. Using a Local Web Server

After creating the production build with:

```bash
npm run build
```

the generated files will be available in the `dist` folder.

The `dist` folder can be served using any local web server.

For example, if PHP is installed:

```bash
cd dist
php -S localhost:8000
```

Then open:

```text
http://localhost:8000
```

> Note: The `dist/index.html` file should not be opened directly using `file://`. The production build should be served through a local web server.
