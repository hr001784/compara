import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import chatRoute from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
];

const extraOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (defaultOrigins.includes(origin)) return true;
  if (extraOrigins.includes(origin)) return true;
  // Allow all Vercel production and preview deployments
  if (/^https:\/\/[\w.-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.warn('CORS blocked origin:', origin);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use('/api/chat', chatRoute);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    llmConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    cors: 'vercel.app allowed',
  });
});

app.get('/', (_req, res) => {
  res.json({ service: 'compara-layout-agent-api', health: '/api/health' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Allowed extra origins:', extraOrigins.length ? extraOrigins : '(none — using vercel.app wildcard)');
});
