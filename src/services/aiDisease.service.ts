import axios from 'axios';
import FormData from 'form-data';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';
const ML_API_KEY = process.env.ML_API_KEY || 'imara-ai-key-2024-secure';

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

export const detectDiseaseWithAI = async (
  imageBuffer: Buffer,
  filename: string = 'image.jpg'
): Promise<AIDetectionResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', imageBuffer, { filename });

    const response = await axios.post<AIDetectionResponse>(
      `${ML_API_URL}/api/detect`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'x-api-key': ML_API_KEY,
        },
        timeout: 60000, // 60 seconds
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail || error.response.statusText;
      throw new Error(`AI Service Error (${status}): ${detail}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('AI Service Timeout: The request took too long.');
    } else if (error.request) {
      throw new Error('AI Service Unreachable: Please ensure the Python service is running.');
    } else {
      throw new Error(`Error calling AI Service: ${error.message}`);
    }
  }
};
