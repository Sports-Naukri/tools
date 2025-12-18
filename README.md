# SportsNaukri Tools

**The Future of Sports Careers, Powered by AI**

A modern web application showcasing AI-powered tools designed specifically for sports professionals. This platform provides intelligent assistants for resume optimization, job description refinement, and career advancement in the sports industry.

---

## 🚀 Features

- **AI-Powered Tools**: Purpose-built assistants for every step of a sports professional's journey
- **Modern UI/UX**: Beautiful, responsive design with smooth animations and transitions
- **Performance Optimized**: Built with Next.js 16 and React 19 for optimal speed
- **SEO Ready**: Complete meta tags, Open Graph, and Twitter Card support
- **Analytics Integration**: Built-in Vercel Analytics and Speed Insights
- **Accessibility**: WCAG compliant with proper ARIA labels and semantic HTML

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Analytics**: Vercel Analytics & Speed Insights
- **Fonts**: Google Fonts (Inter) + Custom Fonts (Cedora)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher
- **npm** 10.x or higher (or yarn/pnpm/bun)
- **Git** for version control

## 🚦 Getting Started

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Sports-Naukri/tools.git
   cd tools
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The page auto-updates as you edit files. Start by modifying:

- `src/app/page.tsx` - Main page component
- `src/components/HeroSection.tsx` - Hero section
- `src/components/ToolsSection.tsx` - Tools showcase
- `src/lib/siteContent.ts` - Site content and configuration

### Build

Create an optimized production build:

```bash
npm run build
```

### Production

Run the production server:

```bash
npm run start
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

## 📁 Project Structure

```
tools/
├── public/                 # Static assets
│   ├── Cedora-BoldItalic.otf
│   ├── jay.jpg
│   ├── sportscareernavigator.jpg
│   └── robots.txt
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Home page
│   │   ├── globals.css    # Global styles
│   │   ├── sitemap.ts     # Sitemap generation
│   │   └── ...           # Meta images & error pages
│   ├── components/        # React components
│   │   ├── Header.tsx
│   │   ├── HeroSection.tsx
│   │   ├── HomePageClient.tsx
│   │   ├── SiteFooter.tsx
│   │   └── ToolsSection.tsx
│   └── lib/              # Utility functions
│       └── siteContent.ts
├── eslint.config.mjs      # ESLint configuration
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── package.json           # Project dependencies
```

## 🎨 Customization

### Update Site Content

Edit `src/lib/siteContent.ts` to modify:

- Navigation links
- Tool descriptions and images
- Call-to-action buttons
- Meta information

### Modify Styles

- **Global Styles**: `src/app/globals.css`
- **Component Styles**: Inline Tailwind classes in component files
- **Theme Colors**: CSS variables in `globals.css` (:root)

### Add New Tools

1. Add tool data to `src/lib/siteContent.ts`
2. Add tool image to `public/` directory
3. The `ToolsSection` component will automatically display the new tool

## 🌐 Deployment

### Deploy on Vercel (Recommended)

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new):

1. Push your code to GitHub
2. Import the repository in Vercel
3. Vercel will automatically detect Next.js and configure the build
4. Your app will be live in minutes!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Sports-Naukri/tools)

### Other Platforms

This Next.js app can also be deployed on:

- **Netlify**: Follow [Next.js on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- **AWS Amplify**: Follow [Deploy Next.js](https://docs.amplify.aws/guides/hosting/nextjs/)
- **Self-hosted**: Build and run with `npm run build && npm run start`

## 📊 Analytics

This project uses Vercel Analytics and Speed Insights for monitoring:

- Page views and user engagement
- Web Vitals (LCP, FID, CLS, etc.)
- Performance metrics

Analytics are automatically enabled when deployed on Vercel.

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for local environment variables (if needed):

```env
# Add your environment variables here
# NEXT_PUBLIC_API_URL=https://api.example.com
```

### Next.js Configuration

Modify `next.config.ts` for advanced configurations:

- Image optimization settings
- Redirects and rewrites
- Headers and security
- Environment-specific settings

## 📎 Attachments & Uploads

- **Allowed types**: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`
- **Max size**: 5 MB per file (client and server enforce the same limit)
- **Count limit**: Up to 5 attachments per user message; older selections must be removed before adding more
- **URL safety**: Remote attachments must use HTTPS and a valid absolute URL
- **Consistency**: The upload route, chat API, and client composer all share the validation helpers in `src/lib/chat/attachments.ts`

If a file violates any rule, the composer shows an inline error and the server responds with a structured validation error so the UI can surface the issue gracefully.

**Manual validation checklist**
- Attempt to attach 6 files and confirm the composer blocks the action with the count-limit error
- Upload a file >5 MB or a disallowed MIME type and verify both the client and `/api/upload` reject it
- Paste an `http://` or malformed URL in the attachment editor and ensure the server returns `invalid_protocol`
- Re-run `npm run lint` after attachment changes to ensure TypeScript types stay in sync

### Configuring Vercel Blob Tokens

> **For a detailed step-by-step guide with screenshots and troubleshooting, see [ATTACHMENTS_SETUP_GUIDE.md](./ATTACHMENTS_SETUP_GUIDE.md).**

File uploads depend on a Vercel Blob read/write token. Set it up once per environment:

1. **Create or verify a Blob store**: In the Vercel dashboard, open *Storage → Blob* and create a store if you don’t already have one tied to the project.
2. **Generate a token**: From the Blob store page, click **Tokens → Generate token**, choose **Read & Write**, and copy the value (it starts with `vercel_blob_rw_...`). Treat it like a secret.
3. **Local development**: Add the token to `.env.local` as `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...` and ensure `NEXT_PUBLIC_ATTACHMENTS_DISABLED=false`. Restart `npm run dev` so `/api/upload` sees the new env var.
4. **env.example**: Keep the key present (value left blank) so other developers know it’s required. Never commit the real token.
5. **GitHub Actions**: In your repo settings, add a new secret (e.g., `BLOB_READ_WRITE_TOKEN`) containing the token. Reference it inside your workflow and export it before `npm run build`/`npm run test`:

    ```yaml
    env:
       BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
    ```

6. **Vercel deployment**: In the Vercel project, add the same `BLOB_READ_WRITE_TOKEN` under **Settings → Environment Variables** for Production, Preview, and Development so serverless uploads work everywhere.

If the token is missing or `NEXT_PUBLIC_ATTACHMENTS_DISABLED` is set to `true`, `/api/upload` will return `blob_token_missing`, and the UI will display “File uploads are not configured.”

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🤝 Contributing

This is a private, proprietary project. All rights reserved.

For authorized contributors:

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## 📄 License

Copyright © 2024-2025 SportsNaukri. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use of this software, via any medium, is strictly prohibited without explicit written permission from SportsNaukri.

See [LICENSE](./LICENSE) file for details.

## 🔗 Links

- **Website**: [SportsNaukri](https://sportsnaukri.com)
- **Documentation**: [Next.js Docs](https://nextjs.org/docs)
- **Support**: Contact the development team

## 👥 Team

Developed and maintained by the SportsNaukri development team.

---

**Made with ❤️ for the Sports Industry**
