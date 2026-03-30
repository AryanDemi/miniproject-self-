import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import fs from 'fs';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);

// Configure Multer for local memory buffering or temp file storage
const upload = multer({ dest: 'uploads/' });

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

// Proxies the file upload to the FastAPI AI service
app.post('/api/v1/analyze', upload.single('report'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No report file provided' });
      return;
    }

    // Create form data to send to FastAPI
    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    // Make request to local Python FastAPI service (assumed running on port 8000)
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    console.log(`Forwarding report to AI Service at ${aiServiceUrl}/analyze-report`);
    
    const response = await axios.post(`${aiServiceUrl}/analyze-report`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    // Cleanup temp uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error forwarding to AI Service:', error.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Pass along the error from the AI service if possible
    if (error.response) {
       res.status(error.response.status).json(error.response.data);
       return;
    }
    res.status(500).json({ error: 'Failed to process report via AI Service' });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
