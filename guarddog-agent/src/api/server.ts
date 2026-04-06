import express, { Request, Response } from 'express';
import cors from 'cors';
import type GuardDogAgent from '../index.js';

export function createServer(agent: GuardDogAgent): express.Application {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3001', 10);

  app.use(cors({
    origin: [
      'https://guard-dog.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
      /\.vercel\.app$/,
    ],
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  }));

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'guarddog-agent',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/status', (_req: Request, res: Response) => {
    try {
      const status = agent.getStatus();
      res.json({
        success: true,
        data: {
          ...status,
          network: process.env.NETWORK || 'bscTestnet',
          monitorInterval: parseInt(process.env.MONITOR_INTERVAL_MINUTES || '5'),
          threatThreshold: parseInt(process.env.THREAT_THRESHOLD || '75'),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/scan', async (_req: Request, res: Response) => {
    try {
      res.json({ success: true, message: 'Scan cycle triggered', timestamp: Date.now() });
      await agent.runScanCycle();
    } catch (error: any) {
      console.error('Manual scan error:', error.message);
    }
  });

  app.get('/api/wallets', (_req: Request, res: Response) => {
    try {
      const { monitoredWallets } = agent.getStatus();
      res.json({ success: true, data: { wallets: monitoredWallets, count: monitoredWallets.length } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/wallets', (req: Request, res: Response) => {
    const { address, tokens = [] } = req.body;

    if (!address || typeof address !== 'string') {
      res.status(400).json({ success: false, error: 'address (string) is required' });
      return;
    }

    if (!address.match(/^0x[0-9a-fA-F]{40}$/)) {
      res.status(400).json({ success: false, error: 'Invalid Ethereum address format' });
      return;
    }

    try {
      agent.addWallet(address, tokens);
      res.json({ success: true, message: `Wallet ${address} added to monitoring`, data: { address, tokens } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/wallets/:address', (req: Request, res: Response) => {
    const { address } = req.params;

    if (!address.match(/^0x[0-9a-fA-F]{40}$/)) {
      res.status(400).json({ success: false, error: 'Invalid Ethereum address format' });
      return;
    }

    try {
      agent.removeWallet(address);
      res.json({ success: true, message: `Wallet ${address} removed from monitoring` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 GuardDog API server listening on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Status: http://localhost:${PORT}/api/status`);
  });

  return app;
}