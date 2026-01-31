# Nexora - AI-Powered Study Optimization Platform

<div align="center">
  <img src="https://via.placeholder.com/200x60?text=NEXORA" alt="Nexora Logo" />
  <p><strong>Transform your learning with AI-powered study planning</strong></p>
</div>

## 🚀 Overview

Nexora is a futuristic SaaS web application that helps students optimize their study schedules using AI. It features smart scheduling, gamification, and comprehensive analytics to boost productivity and learning outcomes.

### Key Features

- **📊 Dashboard** - Overview of weekly progress, focus scores, and streaks
- **🗓️ Smart Planner** - AI-generated weekly schedules with drag-and-drop
- **📚 Subjects Manager** - Manage subjects with priority and difficulty settings
- **🎯 Study Presets** - Pre-configured subject sets for ENEM, Medicine, Public Exams, and more
- **📈 Analytics** - Productivity charts, heatmaps, and AI insights
- **🎮 Gamification** - XP, levels, achievements, and streaks
- **⚙️ Settings** - Customizable study preferences and AI tuning

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma ORM + PostgreSQL (Neon / Vercel)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Drag & Drop**: @dnd-kit

## 📋 Prerequisites

Make sure you have the following installed on your Windows machine:

- [Node.js](https://nodejs.org/) (v18.17 or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- [Git](https://git-scm.com/)

## 🚀 Getting Started (Windows / local Postgres)

### 1. Clone or Navigate to the Project

```powershell
cd C:\Users\lucas\nexora
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Set Up Environment Variables

Copy `.env.example` to `.env` and configure your Postgres URL (local or remote):

```env
# Example using Neon (always use sslmode=require)
DATABASE_URL="postgresql://user:password@host/neon_db?sslmode=require"
```

### 4. Initialize the Database

```powershell
# Generate Prisma client
npm run prisma:generate

# Apply schema (non-destructive) or run migrations
npm run db:push          # quick sync in dev
# or
npm run prisma:migrate:deploy

# Seed with mock data
npm run db:seed
```

### 5. Start the Development Server

```powershell
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## ☁️ Deploy on Vercel + Neon (PostgreSQL)

1. **Criar banco no Neon**
   - Provisione um DB e copie a connection string com `sslmode=require`.
2. **Variáveis na Vercel**
   - Defina `DATABASE_URL` com a string do Neon.
3. **Build command**
   - Em *Build & Output*, use:
     ```
     npx prisma migrate deploy && npm run build
     ```
   - O `postinstall` já roda `prisma generate`, mas a linha acima garante migrations + build.
4. **Migrations**
   - Gere migrations localmente (`npx prisma migrate dev --name init`) e commit.
   - Vercel executará `prisma migrate deploy` em cada deploy.

## 🔧 Scripts

- `npm run dev` — start Next.js
- `npm run build` — build app
- `npm run start` — start produção
- `npm run prisma:generate` — gerar client
- `npm run prisma:migrate:deploy` — aplicar migrations (CI/produção)
- `npm run db:push` — sync dev rápido
- `npm run db:seed` — seed de exemplo
- `npm run vercel-build` — helper: `prisma migrate deploy && next build`

## 📁 Project Structure

```
nexora/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Mock data seeder
├── src/
│   ├── app/
│   │   ├── (app)/         # App routes (with layout)
│   │   │   ├── dashboard/
│   │   │   ├── planner/
│   │   │   ├── subjects/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── api/           # API routes
│   │   │   └── presets/   # Preset API endpoints
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home (redirects to dashboard)
│   ├── components/
│   │   ├── analytics/     # Analytics components
│   │   ├── dashboard/     # Dashboard components
│   │   ├── layout/        # Layout components (Sidebar, TopBar)
│   │   ├── planner/       # Planner components
│   │   ├── subjects/      # Subject components (includes PresetSelector)
│   │   └── ui/            # Reusable UI components
│   ├── lib/
│   │   ├── prisma.ts      # Prisma client
│   │   └── utils.ts       # Utility functions
│   ├── services/
│   │   ├── studyAlgorithm.ts  # AI scheduling algorithm
│   │   └── gamification.ts    # XP, levels, achievements
│   └── types/
│       └── index.ts       # TypeScript types
├── .env                   # Environment variables
├── package.json
├── tailwind.config.ts     # Tailwind configuration
└── tsconfig.json          # TypeScript configuration
```

## 🎨 Design System

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Background | `#05080F` | Main background |
| Neon Blue | `#00B4FF` | Primary accent |
| Neon Purple | `#7F00FF` | Secondary accent |
| Neon Cyan | `#00FFC8` | Success states |
| Neon Pink | `#FF00AA` | Highlights |

### Typography

- **Headings**: Space Grotesk (Google Fonts)
- **Body**: Inter (Google Fonts)

### Components

All components use glassmorphism styling with:
- Backdrop blur (12px)
- Semi-transparent backgrounds
- Subtle borders with neon accents
- 16px border radius
- Hover glow effects

## 🎮 Gamification System

### XP Calculation

```typescript
XP = minutes * focusMultiplier * difficultyBonus * streakBonus

// Example: 60 min session, 85% focus, difficulty 7, 5-day streak
// XP = 60 * 1.35 * 1.35 * 1.25 = 136 XP
```

### Level Progression

| Level | XP Required | Title |
|-------|-------------|-------|
| 1-4 | 100-300 | Beginner |
| 5-9 | 400-800 | Apprentice |
| 10-14 | 1000-2000 | Rising Star |
| 15-19 | 2500-5000 | Dedicated Learner |
| 20+ | 6000+ | Senior Scholar |

## 🎯 Study Presets

Nexora includes pre-configured study presets based on common academic objectives. These presets automatically set up subjects with suggested priorities and weekly hour targets.

### Available Presets

#### 1. **ENEM** (Exame Nacional do Ensino Médio)
Complete preparation for Brazil's national high school exam with all knowledge areas:
- **High Priority (5)**: Mathematics, Essay Writing
- **Medium-High Priority (4)**: Portuguese/Languages, Biology, Physics, Chemistry
- **Medium Priority (3)**: History, Geography, Philosophy, Sociology
- **Total**: 10 subjects, ~76 hours/week suggested

#### 2. **Medicina** (Medical School Entrance)
Focused preparation for medical school entrance exams:
- **High Priority (5)**: Advanced Biology, Advanced Chemistry
- **Medium-High Priority (4)**: Physics, Mathematics, Essay Writing
- **Low Priority (2)**: History, Geography
- **Total**: 8 subjects, ~69 hours/week suggested

#### 3. **Concursos Públicos** (Public Exams)
Preparation for Brazilian public service exams:
- **High Priority (5)**: Portuguese
- **Medium-High Priority (4)**: Logical Reasoning, Constitutional Law, Administrative Law
- **Medium Priority (3)**: Computer Science, Current Events
- **Total**: 6 subjects, ~50 hours/week suggested

### Using Presets

1. **Select a Preset**: When you first visit the Subjects page, you'll see preset options
2. **Import Subjects**: Click "Importar disciplinas" to automatically create subjects with suggested settings
3. **Customize**: All imported subjects can be fully customized - edit priorities, hours, difficulty, etc.
4. **Manual Creation**: You can skip presets and create subjects manually at any time

### Preset Features

- **Smart Mapping**: Preset priorities (1-5) are automatically mapped to Subject priorities (1-10)
- **Icon Assignment**: Subjects automatically get appropriate icons based on their names
- **Color Distribution**: Colors are distributed evenly across imported subjects
- **Flexible**: Presets are suggestions only - everything can be edited after import

## 📊 Study Algorithm

The AI scheduling algorithm considers:

1. **Subject Priority** (1-10) - Higher priority subjects get scheduled first
2. **Difficulty** (1-10) - Harder subjects get shorter, more frequent blocks
3. **Target Hours** - Weekly target for each subject
4. **User Preferences** - Preferred study times, max block duration, break length
5. **Rest Days** - Configurable days to exclude from scheduling

### Block Duration Rules

- Maximum block: 2 hours (configurable)
- Minimum block: 30 minutes
- Auto-break insertion after each block
- Harder subjects → shorter blocks

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with mock data and presets |
| `npm run db:studio` | Open Prisma Studio |

## 📡 API Endpoints

### Presets

- **GET `/api/presets`** - List all available study presets with their subjects
- **POST `/api/presets/[id]/import`** - Import a preset's subjects to a user
  - Body: `{ userId: string }`
  - Returns: Imported subjects with mapped priorities and difficulties

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` |

## 📱 Responsive Design

The app is built mobile-first with responsive breakpoints:

- **Mobile**: < 768px (collapsible sidebar)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px (full sidebar)

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Docker

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for learning and development.

---

<div align="center">
  <p>Built with ❤️ using Next.js, TypeScript, and Tailwind CSS</p>
  <p><strong>Nexora</strong> - Study Smarter, Not Harder</p>
</div>
