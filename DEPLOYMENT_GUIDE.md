# 🚀 SECORA Deployment Guide

## ✅ Pre-Deployment Checklist

### Code Quality
- ✅ **Zero TypeScript errors** across all files
- ✅ **All pages functional** (tested locally)
- ✅ **Performance optimized** (lazy loading, code splitting)
- ✅ **Responsive design** (mobile, tablet, desktop)
- ✅ **SEO metadata** added to all pages

### Features Complete
- ✅ Homepage with animations
- ✅ Dashboard (7 components)
- ✅ Scan Workflow (6 components)
- ✅ Vulnerability Explorer (6 components)
- ✅ Automation Bot
- ✅ Authentication (Login/Signup)
- ✅ Static Pages (Terms, Privacy, Status, Docs, API, Blog, About)
- ✅ 404 Page
- ✅ Loading Architecture

---

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Why Vercel?**
- Built by Next.js creators
- Zero configuration
- Automatic HTTPS
- Global CDN
- Free tier available
- Automatic deployments from Git

**Steps:**

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy Frontend**
   ```bash
   cd frontend
   vercel
   ```

4. **Follow prompts:**
   - Set up and deploy? `Y`
   - Which scope? (Select your account)
   - Link to existing project? `N`
   - Project name? `secora`
   - Directory? `./`
   - Override settings? `N`

5. **Production Deployment**
   ```bash
   vercel --prod
   ```

**Environment Variables:**
```bash
# Add in Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

---

### Option 2: Netlify

**Steps:**

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the project**
   ```bash
   cd frontend
   npm run build
   ```

3. **Deploy**
   ```bash
   netlify deploy
   ```

4. **Production**
   ```bash
   netlify deploy --prod
   ```

---

### Option 3: Docker (Full Stack)

**Create docker-compose.yml** (already exists):

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:5000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - OPENAI_API_KEY=${OPENAI_API_KEY}
```

**Deploy:**
```bash
docker-compose up -d
```

---

## 🔧 Backend Deployment

### Option 1: Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Deploy**
   ```bash
   cd backend
   railway init
   railway up
   ```

4. **Add Environment Variables**
   ```bash
   railway variables set OPENAI_API_KEY=your_key
   railway variables set ANTHROPIC_API_KEY=your_key
   railway variables set GOOGLE_API_KEY=your_key
   ```

---

### Option 2: Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   cd backend
   heroku create secora-backend
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Set Environment Variables**
   ```bash
   heroku config:set OPENAI_API_KEY=your_key
   heroku config:set PORT=5000
   ```

---

## 📋 Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Backend (.env)
```env
PORT=5000
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
JWT_SECRET=your_secure_random_string
NODE_ENV=production
```

---

## 🔒 Security Checklist

### Before Deployment

- [ ] **Remove console.logs** from production code
- [ ] **Set secure JWT_SECRET** (use random 64-character string)
- [ ] **Enable CORS** properly (whitelist your frontend domain)
- [ ] **Add rate limiting** to API endpoints
- [ ] **Validate all inputs** on backend
- [ ] **Use HTTPS** for all connections
- [ ] **Hide API keys** (use environment variables)
- [ ] **Add CSP headers** (Content Security Policy)

### Update CORS in Backend

Edit `backend/src/server.js`:

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend-domain.com',
  credentials: true
}));
```

---

## 🚀 Build Commands

### Frontend
```bash
cd frontend
npm run build
npm start  # Test production build locally
```

### Backend
```bash
cd backend
npm install --production
npm start
```

---

## 📊 Performance Optimization

### Frontend

1. **Enable Image Optimization**
   - Already configured with Next.js Image component

2. **Add Caching Headers**
   ```javascript
   // next.config.ts
   async headers() {
     return [
       {
         source: '/:all*(svg|jpg|png)',
         headers: [
           {
             key: 'Cache-Control',
             value: 'public, max-age=31536000, immutable',
           },
         ],
       },
     ];
   }
   ```

3. **Enable Compression**
   - Automatically handled by Vercel/Netlify

### Backend

1. **Add Compression**
   ```bash
   npm install compression
   ```

   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Add Helmet for Security**
   ```bash
   npm install helmet
   ```

   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

---

## 🔍 Testing Before Deployment

### 1. Build Test
```bash
cd frontend
npm run build
```
Should complete without errors.

### 2. Production Test
```bash
npm start
```
Visit http://localhost:3000 and test all pages.

### 3. Check All Routes
- [ ] Homepage (/)
- [ ] Dashboard (/dashboard)
- [ ] Scan Wizard (/scan/new)
- [ ] Vulnerabilities (/vulnerabilities)
- [ ] Automation (/automation)
- [ ] Login (/login)
- [ ] Signup (/signup)
- [ ] About (/about)
- [ ] Terms (/terms)
- [ ] Privacy (/privacy)
- [ ] Status (/status)
- [ ] Docs (/docs)
- [ ] API (/api)
- [ ] Blog (/blog)
- [ ] 404 (any invalid route)

### 4. Mobile Test
- Test on mobile viewport (Chrome DevTools)
- Check all animations work
- Verify touch interactions

---

## 🌍 Custom Domain Setup

### Vercel

1. Go to Project Settings → Domains
2. Add your domain: `secora.com`
3. Add DNS records (provided by Vercel)
4. Wait for DNS propagation (5-30 minutes)

### Netlify

1. Go to Domain Settings
2. Add custom domain
3. Update DNS records
4. Enable HTTPS (automatic)

---

## 📈 Monitoring & Analytics

### Add Analytics

1. **Vercel Analytics** (Built-in)
   ```bash
   npm install @vercel/analytics
   ```

   ```typescript
   // app/layout.tsx
   import { Analytics } from '@vercel/analytics/react';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

2. **Google Analytics**
   - Add tracking ID to environment variables
   - Use next/script to load GA

3. **Error Tracking (Sentry)**
   ```bash
   npm install @sentry/nextjs
   ```

---

## 🔄 CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📝 Post-Deployment

### 1. Update Links
- Update social media links in About page
- Update contact emails
- Update API documentation URLs

### 2. Test Everything
- Test all forms
- Test authentication
- Test scan workflow
- Test API endpoints
- Test on multiple devices

### 3. SEO
- Submit sitemap to Google Search Console
- Add robots.txt
- Verify meta tags
- Test Open Graph images

### 4. Performance
- Run Lighthouse audit
- Check Core Web Vitals
- Optimize images if needed
- Monitor load times

---

## 🐛 Troubleshooting

### Build Fails

**Error**: "Module not found"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Error**: "Out of memory"
```bash
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

### Images Not Loading

- Check image paths start with `/`
- Verify images are in `public/` folder
- Clear browser cache

### API Connection Issues

- Verify NEXT_PUBLIC_API_URL is set
- Check CORS configuration
- Verify backend is running
- Check network tab in DevTools

---

## 📊 Deployment Checklist

### Pre-Deployment
- [ ] All TypeScript errors fixed
- [ ] All pages tested locally
- [ ] Environment variables configured
- [ ] Build succeeds without errors
- [ ] Production build tested locally
- [ ] Images optimized
- [ ] SEO metadata added
- [ ] Security headers configured

### Deployment
- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] HTTPS enabled
- [ ] CORS configured correctly

### Post-Deployment
- [ ] All routes accessible
- [ ] Forms working
- [ ] Authentication working
- [ ] API calls successful
- [ ] Mobile responsive
- [ ] Performance acceptable
- [ ] Analytics configured
- [ ] Error tracking setup

---

## 🎉 Quick Deploy Commands

### Vercel (Fastest)
```bash
cd frontend
vercel --prod
```

### Netlify
```bash
cd frontend
npm run build
netlify deploy --prod --dir=.next
```

### Docker
```bash
docker-compose up -d
```

---

## 📞 Support

### Resources
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)

### Common Issues
- Check environment variables are set
- Verify API URL is correct
- Check CORS configuration
- Review build logs for errors

---

## ✅ Your Project is Ready!

SECORA is production-ready with:
- ✅ Zero errors
- ✅ Optimized performance
- ✅ Complete features
- ✅ Professional design
- ✅ Responsive layout
- ✅ SEO optimized

**Choose your deployment platform and go live!** 🚀

---

**Recommended**: Start with Vercel for frontend (easiest) and Railway for backend.

Total deployment time: ~15 minutes 🎉
