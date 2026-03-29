import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'hms-backend', timestamp: new Date().toISOString() });
});

// A basic route for testing the API
app.get('/api/v1', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Welcome to the HMS API v1' });
});

// Zod validation middleware example
const helloSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

app.post('/api/v1/hello', (req: Request, res: Response) => {
  try {
    const data = helloSchema.parse(req.body);
    res.status(200).json({ message: `Hello, ${data.name}! AI-augmented backend is ready.` });
  } catch (error) {
    res.status(400).json({ error: 'Validation failed', details: error });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
