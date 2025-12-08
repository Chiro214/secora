# SECORA Loading Animation

## Quick Start

### 1. Basic Usage

```tsx
import { SecoraLoader } from '@/components/loading/SecoraLoader';

function App() {
  return <SecoraLoader />;
}
```

### 2. With Progress

```tsx
import { SecoraLoader } from '@/components/loading/SecoraLoader';
import { useState, useEffect } from 'react';

function App() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading
    const timer = setInterval(() => {
      setProgress(p => p >= 100 ? 100 : p + 10);
    }, 300);
    return () => clearInterval(timer);
  }, []);

  return (
    <SecoraLoader 
      progress={progress}
      onComplete={() => console.log('Done!')}
    />
  );
}
```

### 3. Global Loading State

```tsx
// app/layout.tsx
import { LoadingProvider } from '@/components/loading/LoadingProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LoadingProvider>
          {children}
        </LoadingProvider>
      </body>
    </html>
  );
}

// Any component
import { useLoading } from '@/components/loading/LoadingProvider';

function MyComponent() {
  const { setLoading } = useLoading();

  const handleClick = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  return <button onClick={handleClick}>Load Data</button>;
}
```

## Demo

Visit `/loading-demo` to see it in action!

## Features

✨ 3D glass sphere with shield logo  
📦 8 orbiting glassmorphic cubes  
💎 Realistic refraction and reflections  
🎨 Neon blue and violet glows  
📊 Animated progress bar  
♾️ Seamless looping animation  
🎯 Auto-increment or manual progress  
⚡ 60fps smooth performance  

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `progress` | `number` | `undefined` | Progress 0-100. Auto-increments if not provided |
| `onComplete` | `() => void` | `undefined` | Callback when progress reaches 100% |

## Customization

Edit `SecoraLoader.tsx` to customize:
- Colors (search for `#4BA3FF` and `#9333EA`)
- Animation speeds (adjust `duration` values)
- Cube count (change array length)
- Text content

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS 14+, Android 10+)

## Performance

- 60fps on modern devices
- GPU-accelerated transforms
- Optimized particle system
- ~50KB gzipped

---

For detailed documentation, see `LOADING_ANIMATION_DOCS.md`
