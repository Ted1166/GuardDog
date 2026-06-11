import express, { Request, Response } from 'express';
import cors from 'cors';
import type GuardDogAgent from '../index.js';
import { mongoService } from '../db/mongodb.js';

export function createServer(agent: GuardDogAgent): express.Application {
  const app  = express();
  const PORT = parseInt(process.env.PORT || '8080', 10);

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

  // ── Health ──────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok', service: 'guarddog-agent', version: '1.0.0',
      timestamp: new Date().toISOString(),
      mongo: mongoService.isConnected(),
    });
  });

  // ── Agent status ────────────────────────────────────────────────────
  app.get('/api/status', (_req: Request, res: Response) => {
    try {
      res.json({ success: true, data: {
        ...agent.getStatus(),
        network:          process.env.NETWORK || 'bscTestnet',
        monitorInterval:  parseInt(process.env.MONITOR_INTERVAL_MINUTES || '5'),
        threatThreshold:  parseInt(process.env.THREAT_THRESHOLD || '75'),
      }});
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Trigger scan ────────────────────────────────────────────────────
  app.post('/api/scan', async (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Scan cycle triggered', timestamp: Date.now() });
    await agent.runScanCycle();
  });

  // ── Wallets ─────────────────────────────────────────────────────────
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
    if (!address || !address.match(/^0x[0-9a-fA-F]{40}$/)) {
      res.status(400).json({ success: false, error: 'Valid Ethereum address required' });
      return;
    }
    agent.addWallet(address, tokens);
    res.json({ success: true, message: `Wallet ${address} added`, data: { address, tokens } });
  });

  app.delete('/api/wallets/:address', (req: Request, res: Response) => {
    const { address } = req.params;
    if (!address.match(/^0x[0-9a-fA-F]{40}$/)) {
      res.status(400).json({ success: false, error: 'Invalid address format' });
      return;
    }
    agent.removeWallet(address);
    res.json({ success: true, message: `Wallet ${address} removed` });
  });

  // ── MongoDB analytics endpoints ─────────────────────────────────────
  app.get('/api/threats', async (_req: Request, res: Response) => {
    try {
      const threats = await mongoService.getRecentThreats(20);
      res.json({ success: true, data: threats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/threats/:address', async (req: Request, res: Response) => {
    try {
      const threats = await mongoService.getWalletThreats(req.params.address);
      res.json({ success: true, data: threats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/protections', async (_req: Request, res: Response) => {
    try {
      const protections = await mongoService.getRecentProtections(20);
      res.json({ success: true, data: protections });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/history', async (_req: Request, res: Response) => {
    try {
      const history = await mongoService.getScanHistory(50);
      res.json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/analytics', async (_req: Request, res: Response) => {
    try {
      const stats = await mongoService.getStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 GuardDog API server on port ${PORT}`);
    console.log(`   Health:     http://localhost:${PORT}/health`);
    console.log(`   Status:     http://localhost:${PORT}/api/status`);
    console.log(`   Analytics:  http://localhost:${PORT}/api/analytics`);
  });

  return app;
}