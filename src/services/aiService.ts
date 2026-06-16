import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || 'imara-ai-key-2024-secure';
const AI_SERVICE_ENABLED = process.env.AI_SERVICE_ENABLED === 'true';

interface AIDetectionResponse {
  success: boolean;
  prediction: {
    disease: string;
    confidence: number;
    crop: string;
    status: string;
    warning: string;
  };
  details: {
    symptoms: string;
    treatment: string;
    prevention: string;
  };
  metadata: {
    model: string;
    classes: number;
    demo_mode: boolean;
  };
}

export const detectDiseaseWithAI = async (imagePath: string): Promise<AIDetectionResponse> => {
  if (!AI_SERVICE_ENABLED) {
    throw new Error('AI Service is not enabled');
  }

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/detect`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'x-api-key': AI_SERVICE_API_KEY,
        },
        timeout: 30000, // 30 seconds
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(`AI Service Error: ${error.response.data.detail || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('AI Service not reachable. Please ensure it is running.');
    } else {
      throw new Error(`Error calling AI Service: ${error.message}`);
    }
  }
};

export const checkAIServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('AI Service health check failed:', error);
    return false;
  }
};

export const getAISupportedDiseases = async (): Promise<string[]> => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/api/diseases`, {
      headers: {
        'x-api-key': AI_SERVICE_API_KEY,
      },
      timeout: 5000,
    });
    return response.data.diseases || [];
  } catch (error) {
    console.error('Failed to get AI supported diseases:', error);
    return [];
  }
};
