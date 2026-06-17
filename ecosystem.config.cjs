module.exports = {
  apps: [
    {
      name: 'flatstore-backend',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
    {
      name: 'flatstore-ocr',
      cwd: './ocr-service',
      script: 'main.py',
      interpreter: 'python',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      env: {
        OCR_CONFIDENCE_THRESHOLD: '0.5',
      },
    },
  ],
};
