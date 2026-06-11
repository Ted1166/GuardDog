import { MongoClient, Db, Collection } from 'mongodb';

// ── Document types ────────────────────────────────────────────────────

export interface ScanCycleDoc {
  timestamp:          Date;
  walletsScanned:     number;
  threatsFound:       number;
  protectionsExecuted: number;
  network:            string;
  uptime:             string;
}

export interface ThreatDetectionDoc {
  timestamp:        Date;
  walletAddress:    string;
  tokenAddress:     string;
  threatLevel:      number;
  reason:           string;
  threatSource:     string;
  oklinkLevel:      string | null;
  oklinkCategories: string[];
  network:          string;
  protected:        boolean;
  txHash:           string | null;
}

export interface ProtectionEventDoc {
  timestamp:     Date;
  walletAddress: string;
  tokenAddress:  string;
  amount:        string;
  threatLevel:   number;
  txHash:        string;
  network:       string;
  reason:        string;
}

export interface WalletStatsDoc {
  walletAddress:       string;
  lastScan:            Date;
  totalThreatsFound:   number;
  totalProtections:    number;
  isProtected:         boolean;
  network:             string;
}

// ── MongoDB Service ───────────────────────────────────────────────────

export class MongoDBService {
  private client:      MongoClient | null = null;
  private db:          Db | null = null;
  private enabled:     boolean;

  // Collections
  private scanCycles:    Collection<ScanCycleDoc>        | null = null;
  private threats:       Collection<ThreatDetectionDoc>  | null = null;
  private protections:   Collection<ProtectionEventDoc>  | null = null;
  private walletStats:   Collection<WalletStatsDoc>      | null = null;

  constructor() {
    this.enabled = !!process.env.MONGODB_URI;
  }

  async connect(): Promise<void> {
    if (!this.enabled) {
      console.log('📦 MongoDB: URI not set — running without persistence');
      return;
    }

    try {
      this.client = new MongoClient(process.env.MONGODB_URI!);
      await this.client.connect();

      this.db = this.client.db(process.env.MONGODB_DB || 'guarddog');

      // Init collections
      this.scanCycles  = this.db.collection<ScanCycleDoc>('scan_cycles');
      this.threats     = this.db.collection<ThreatDetectionDoc>('threats');
      this.protections = this.db.collection<ProtectionEventDoc>('protections');
      this.walletStats = this.db.collection<WalletStatsDoc>('wallet_stats');

      // Indexes for fast queries
      await this.threats.createIndex({ timestamp: -1 });
      await this.threats.createIndex({ walletAddress: 1 });
      await this.threats.createIndex({ tokenAddress: 1 });
      await this.protections.createIndex({ timestamp: -1 });
      await this.protections.createIndex({ walletAddress: 1 });
      await this.scanCycles.createIndex({ timestamp: -1 });
      await this.walletStats.createIndex({ walletAddress: 1 }, { unique: true });

      console.log(`✅ MongoDB connected — db: ${this.db.databaseName}`);
    } catch (error: any) {
      console.error(`❌ MongoDB connection failed: ${error.message}`);
      // Degrade gracefully — agent keeps running without DB
      this.enabled = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('📦 MongoDB disconnected');
    }
  }

  // ── Save scan cycle ─────────────────────────────────────────────────
  async saveScanCycle(data: {
    walletsScanned:      number;
    threatsFound:        number;
    protectionsExecuted: number;
    network:             string;
    uptime:              string;
  }): Promise<void> {
    if (!this.enabled || !this.scanCycles) return;
    try {
      await this.scanCycles.insertOne({ timestamp: new Date(), ...data });
    } catch (err: any) {
      console.warn('MongoDB: Failed to save scan cycle:', err.message);
    }
  }

  // ── Save threat detection ───────────────────────────────────────────
  async saveThreatDetection(data: {
    walletAddress:    string;
    tokenAddress:     string;
    threatLevel:      number;
    reason:           string;
    threatSource:     string;
    oklinkLevel:      string | null;
    oklinkCategories: string[];
    network:          string;
    protected:        boolean;
    txHash:           string | null;
  }): Promise<void> {
    if (!this.enabled || !this.threats) return;
    try {
      await this.threats.insertOne({ timestamp: new Date(), ...data });
      await this.updateWalletStats(data.walletAddress, data.network, {
        threatsFound: 1,
        protections: data.protected ? 1 : 0,
      });
    } catch (err: any) {
      console.warn('MongoDB: Failed to save threat:', err.message);
    }
  }

  // ── Save protection event ───────────────────────────────────────────
  async saveProtectionEvent(data: {
    walletAddress: string;
    tokenAddress:  string;
    amount:        string;
    threatLevel:   number;
    txHash:        string;
    network:       string;
    reason:        string;
  }): Promise<void> {
    if (!this.enabled || !this.protections) return;
    try {
      await this.protections.insertOne({ timestamp: new Date(), ...data });
    } catch (err: any) {
      console.warn('MongoDB: Failed to save protection:', err.message);
    }
  }

  // ── Update wallet stats (upsert) ────────────────────────────────────
  private async updateWalletStats(
    walletAddress: string,
    network: string,
    delta: { threatsFound: number; protections: number }
  ): Promise<void> {
    if (!this.walletStats) return;
    try {
      await this.walletStats.updateOne(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $set:  { lastScan: new Date(), isProtected: true, network },
          $inc:  {
            totalThreatsFound: delta.threatsFound,
            totalProtections:  delta.protections,
          },
          $setOnInsert: { walletAddress: walletAddress.toLowerCase() },
        },
        { upsert: true }
      );
    } catch (err: any) {
      console.warn('MongoDB: Failed to update wallet stats:', err.message);
    }
  }

  // ── Query helpers (used by REST API) ────────────────────────────────
  async getRecentThreats(limit = 20): Promise<ThreatDetectionDoc[]> {
    if (!this.enabled || !this.threats) return [];
    try {
      return await this.threats.find().sort({ timestamp: -1 }).limit(limit).toArray();
    } catch { return []; }
  }

  async getWalletThreats(walletAddress: string, limit = 50): Promise<ThreatDetectionDoc[]> {
    if (!this.enabled || !this.threats) return [];
    try {
      return await this.threats
        .find({ walletAddress: walletAddress.toLowerCase() })
        .sort({ timestamp: -1 }).limit(limit).toArray();
    } catch { return []; }
  }

  async getRecentProtections(limit = 20): Promise<ProtectionEventDoc[]> {
    if (!this.enabled || !this.protections) return [];
    try {
      return await this.protections.find().sort({ timestamp: -1 }).limit(limit).toArray();
    } catch { return []; }
  }

  async getScanHistory(limit = 50): Promise<ScanCycleDoc[]> {
    if (!this.enabled || !this.scanCycles) return [];
    try {
      return await this.scanCycles.find().sort({ timestamp: -1 }).limit(limit).toArray();
    } catch { return []; }
  }

  async getStats(): Promise<{
    totalScans: number;
    totalThreats: number;
    totalProtections: number;
    walletsMonitored: number;
  }> {
    if (!this.enabled) {
      return { totalScans: 0, totalThreats: 0, totalProtections: 0, walletsMonitored: 0 };
    }
    try {
      const [totalScans, totalThreats, totalProtections, walletsMonitored] = await Promise.all([
        this.scanCycles?.countDocuments() ?? 0,
        this.threats?.countDocuments() ?? 0,
        this.protections?.countDocuments() ?? 0,
        this.walletStats?.countDocuments() ?? 0,
      ]);
      return { totalScans, totalThreats, totalProtections, walletsMonitored };
    } catch {
      return { totalScans: 0, totalThreats: 0, totalProtections: 0, walletsMonitored: 0 };
    }
  }

  isConnected(): boolean {
    return this.enabled && this.client !== null;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────
export const mongoService = new MongoDBService();