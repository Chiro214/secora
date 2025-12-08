# 📸 How to Add Your Photo to the About Page

## Quick Guide

### Step 1: Prepare Your Photo

1. **Choose a professional photo** (headshot or professional portrait)
2. **Recommended size**: 500x500 pixels or larger (square format works best)
3. **Format**: JPG or PNG
4. **File size**: Keep under 500KB for fast loading

### Step 2: Add Photo to Project

1. Create a `team` folder in the `public` directory:
   ```
   frontend/public/team/
   ```

2. Save your photo as:
   ```
   frontend/public/team/founder.jpg
   ```

3. (Optional) Add photos for other team members:
   ```
   frontend/public/team/cto.jpg
   frontend/public/team/security.jpg
   ```

### Step 3: Update the About Page

Open `frontend/app/about/page.tsx` and update the team array:

```typescript
const team = [
  {
    name: 'Your Actual Name',  // ← Change this
    role: 'Founder & CEO',
    bio: 'Your actual bio here...', // ← Change this
    image: '/team/founder.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/yourprofile', // ← Add your links
      twitter: 'https://twitter.com/yourhandle',
      github: 'https://github.com/yourusername',
      email: 'your.email@secora.security'
    },
    featured: true
  },
  // ... other team members
];
```

### Step 4: Uncomment the Image Component

In the same file, find this section (around line 150):

```typescript
{/* Replace this div with actual image */}
<div className="text-6xl">👤</div>
{/* Uncomment when you have an image:
<Image
  src={member.image}
  alt={member.name}
  width={192}
  height={192}
  className="object-cover"
/>
*/}
```

Replace it with:

```typescript
<Image
  src={member.image}
  alt={member.name}
  width={192}
  height={192}
  className="object-cover rounded-2xl"
/>
```

### Step 5: Add the Image Import

At the top of `frontend/app/about/page.tsx`, the Image component is already imported:

```typescript
import Image from 'next/image';
```

## Example: Complete Setup

### File Structure
```
frontend/
├── public/
│   └── team/
│       ├── founder.jpg      ← Your photo
│       ├── cto.jpg          ← Optional
│       └── security.jpg     ← Optional
└── app/
    └── about/
        └── page.tsx         ← Update this file
```

### Updated Team Data Example

```typescript
const team = [
  {
    name: 'John Doe',
    role: 'Founder & CEO',
    bio: 'Cybersecurity expert with 10+ years of experience. Founded SECORA to democratize security testing and make the web safer for everyone.',
    image: '/team/founder.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/johndoe',
      twitter: 'https://twitter.com/johndoe',
      github: 'https://github.com/johndoe',
      email: 'john@secora.security'
    },
    featured: true
  },
  {
    name: 'Jane Smith',
    role: 'CTO',
    bio: 'AI and machine learning expert specializing in security automation.',
    image: '/team/cto.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/janesmith',
      github: 'https://github.com/janesmith',
      email: 'jane@secora.security'
    }
  },
];
```

## Customization Options

### Change Photo Size

For the featured founder card:
```typescript
<Image
  src={member.image}
  alt={member.name}
  width={192}    // ← Change width
  height={192}   // ← Change height
  className="object-cover rounded-2xl"
/>
```

### Change Photo Shape

- **Square**: `rounded-2xl`
- **Circle**: `rounded-full`
- **Rectangle**: `rounded-lg`

### Add More Team Members

Simply add more objects to the team array:

```typescript
const team = [
  // Founder (featured)
  { ... },
  
  // Team members
  {
    name: 'New Team Member',
    role: 'Position',
    bio: 'Description...',
    image: '/team/member.jpg',
    social: { ... }
  },
  // Add as many as you want!
];
```

## Tips for Best Results

### Photo Quality
- ✅ Use high-resolution photos (at least 500x500px)
- ✅ Good lighting
- ✅ Professional background
- ✅ Clear face visibility
- ✅ Consistent style across team photos

### Bio Writing
- ✅ Keep it concise (2-3 sentences)
- ✅ Highlight expertise
- ✅ Show personality
- ✅ Include achievements
- ✅ Make it relatable

### Social Links
- ✅ Use actual profile URLs
- ✅ Remove links you don't want to show
- ✅ Test all links work
- ✅ Keep profiles professional

## Alternative: Use Placeholder Avatar

If you don't have a photo yet, you can use:

1. **Emoji** (current): `<div className="text-6xl">👤</div>`
2. **Initials**: `<div className="text-4xl font-bold">JD</div>`
3. **Avatar Service**: Use services like:
   - UI Avatars: `https://ui-avatars.com/api/?name=John+Doe&size=192`
   - DiceBear: `https://avatars.dicebear.com/api/avataaars/johndoe.svg`

Example with UI Avatars:
```typescript
<Image
  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=192&background=06B6D4&color=fff`}
  alt={member.name}
  width={192}
  height={192}
  className="object-cover rounded-2xl"
/>
```

## Testing

After adding your photo:

1. **Start the dev server**: `npm run dev`
2. **Navigate to**: http://localhost:3001/about
3. **Check**:
   - Photo loads correctly
   - Size looks good
   - Links work
   - Mobile responsive

## Need Help?

If you encounter issues:

1. **Photo not showing**: Check file path and name match exactly
2. **Photo too large**: Compress using tools like TinyPNG
3. **Wrong size**: Adjust width/height in Image component
4. **Blurry**: Use higher resolution source image

## Quick Checklist

- [ ] Photo saved in `frontend/public/team/founder.jpg`
- [ ] Updated name in team array
- [ ] Updated bio in team array
- [ ] Updated social links
- [ ] Uncommented Image component
- [ ] Tested on localhost
- [ ] Photo looks professional
- [ ] All links work

---

**Your About page is now ready to showcase you and your team!** 🎉

Access it at: http://localhost:3001/about
