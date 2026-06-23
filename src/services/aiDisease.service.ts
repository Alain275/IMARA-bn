import axios from 'axios';
import FormData from 'form-data';

// Read Render configuration or fallback to local
const rawUrl = process.env.AI_SERVICE_URL || process.env.ML_API_URL || 'http://localhost:8000';
const AI_SERVICE_URL = rawUrl.replace(/\/$/, ''); // Remove trailing slash if present
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || process.env.ML_API_KEY || 'imara-ai-key-2024-secure';

export interface AIPrediction {
  disease: string;
  confidence: number;
  crop: string;
  status: string;
  warning: string;
}

export interface AIDetails {
  symptoms: string;
  treatment: string;
  prevention: string;
}

export interface AIMetadata {
  model: string;
  classes: number;
  demo_mode: boolean;
  mode: string;
}

export interface AIDetectionResponse {
  success: boolean;
  prediction: AIPrediction;
  details: AIDetails;
  metadata: AIMetadata;
}

export class AIServiceError extends Error {
  public status: number;
  public details: any;

  constructor(message: string, status: number = 502, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'AIServiceError';
  }
}

export const detectDiseaseWithAI = async (
  imageBuffer: Buffer,
  filename: string = 'image.jpg'
): Promise<AIDetectionResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', imageBuffer, { filename });

    const targetUrl = `${AI_SERVICE_URL}/api/detect`;
    
    console.log(`\n[AI Service] Calling AI service...`);
    console.log(`[AI Service] URL: ${targetUrl}`);
    console.log(`[AI Service] Method: POST`);
    console.log(`[AI Service] Headers: x-api-key: ${AI_SERVICE_API_KEY ? '***' : 'missing'}`);
    console.log(`[AI Service] Image filename: ${filename}`);

    const startTime = Date.now();

    const response = await axios.post<AIDetectionResponse>(
      targetUrl,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'x-api-key': AI_SERVICE_API_KEY,
        },
        timeout: 60000, // 60 seconds
      }
    );

    const timeTaken = Date.now() - startTime;
    console.log(`[AI Service] Response Status: ${response.status} (Time taken: ${timeTaken}ms)\n`);

    return response.data;
  } catch (error: any) {
    console.error(`\n[AI Service] Request failed`);
    console.error({
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      throw new AIServiceError(`Python AI service error (${status})`, status, data);
    } else if (error.code === 'ECONNABORTED') {
      throw new AIServiceError('AI Service Timeout: The request took too long.', 504);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new AIServiceError(`AI Service Unreachable (${error.code}): Please ensure the Python service is running at ${AI_SERVICE_URL}`, 502);
    } else {
      throw new AIServiceError(`Error calling AI Service: ${error.message}`, 500);
    }
  }
};
