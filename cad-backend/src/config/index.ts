import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cad_db',
    pool: { min: 2, max: 10 },
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-key',
    expiry: process.env.JWT_EXPIRY || '24h',
  },
  
  socketIo: {
    corsOrigin: process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:3001',
  },
  
  telnyx: {
    apiKey: process.env.TELNYX_API_KEY || '',
    callRatePerMinute: 0.0575,
    smsRate: 0.0075,
  },
  
  metriport: {
    apiKey: process.env.METRIPORT_API_KEY || '',
  },
  
  features: {
    enableRepeatPatientDetection: process.env.ENABLE_REPEAT_PATIENT_DETECTION === 'true',
    enableAIRecommendations: process.env.ENABLE_AI_RECOMMENDATIONS === 'true',
    enableMetriportSync: process.env.ENABLE_METRIPORT_SYNC === 'true',
  },
};
