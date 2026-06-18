import handler from './api/rewards/index.js';

const mockReq = {
    method: 'POST',
    headers: {
        authorization: 'Bearer mock_testuser_99'
    },
    body: {
        action: 'daily-bonus'
    }
};

const mockRes = {
    status: (code) => {
        console.log('HTTP Status:', code);
        return mockRes;
    },
    json: (data) => {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
        return mockRes;
    },
    setHeader: (name, value) => {
        console.log(`Header: ${name} = ${value}`);
        return mockRes;
    }
};

// Mock process.env
process.env.VERCEL_ENV = 'development';
process.env.FIREBASE_PROJECT_ID = 'astrotarot-3bc2a';

console.log('--- Testing POST /api/rewards action=daily-bonus ---');
handler(mockReq, mockRes).catch(err => {
    console.error('Execution Error:', err);
});
