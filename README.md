# Dedalus

A modern React + TypeScript + Vite template with a distinctive warm noir aesthetic.

## Features

- ⚛️ **React 18** - Latest React with concurrent features
- 🔷 **TypeScript** - Full type safety
- ⚡ **Vite** - Lightning fast HMR and builds
- 🎨 **Beautiful UI** - Warm noir theme with amber accents
- 📱 **Responsive** - Mobile-first design

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
├── public/          # Static assets
├── src/
│   ├── App.tsx      # Main application component
│   ├── App.css      # Component styles
│   ├── main.tsx     # Application entry point
│   └── index.css    # Global styles & CSS variables
├── index.html       # HTML entry point
├── vite.config.ts   # Vite configuration
└── tsconfig.json    # TypeScript configuration
```

## Customization

Edit `src/index.css` to customize the color palette and typography:

```css
:root {
  --color-bg: #0a0908;
  --color-accent: #e8a849;
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-body: 'Outfit', sans-serif;
}
```

## License

MIT
