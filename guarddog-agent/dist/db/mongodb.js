import { MongoClient } from 'mongodb';
// ── MongoDB Service ───────────────────────────────────────────────────
export class MongoDBService {
    client = null;
    db = null;
    enabled;
    // Collections
    scanCycles = null;
    threats = null;
    protections = null;
    walletStats = null;
    constructor() {
        this.enabled = !!process.env.MONGODB_URI;
    }
    async connect() {
        if (!this.enabled) {
            console.log('📦 MongoDB: URI not set — running without persistence');
            return;
        }
        try {
            this.client = new MongoClient(process.env.MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db(process.env.MONGODB_DB || 'guarddog');
            // Init collections
            this.scanCycles = this.db.collection('scan_cycles');
            this.threats = this.db.collection('threats');
            this.protections = this.db.collection('protections');
            this.walletStats = this.db.collection('wallet_stats');
            // Indexes for fast queries
            await this.threats.createIndex({ timestamp: -1 });
            await this.threats.createIndex({ walletAddress: 1 });
            await this.threats.createIndex({ tokenAddress: 1 });
            await this.protections.createIndex({ timestamp: -1 });
            await this.protections.createIndex({ walletAddress: 1 });
            await this.scanCycles.createIndex({ timestamp: -1 });
            await this.walletStats.createIndex({ walletAddress: 1 }, { unique: true });
            console.log(`✅ MongoDB connected — db: ${this.db.databaseName}`);
        }
        catch (error) {
            console.error(`❌ MongoDB connection failed: ${error.message}`);
            // Degrade gracefully — agent keeps running without DB
            this.enabled = false;
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('📦 MongoDB disconnected');
        }
    }
    // ── Save scan cycle ─────────────────────────────────────────────────
    async saveScanCycle(data) {
        if (!this.enabled || !this.scanCycles)
            return;
        try {
            await this.scanCycles.insertOne({ timestamp: new Date(), ...data });
        }
        catch (err) {
            console.warn('MongoDB: Failed to save scan cycle:', err.message);
        }
    }
    // ── Save threat detection ───────────────────────────────────────────
    async saveThreatDetection(data) {
        if (!this.enabled || !this.threats)
            return;
        try {
            await this.threats.insertOne({ timestamp: new Date(), ...data });
            await this.updateWalletStats(data.walletAddress, data.network, {
                threatsFound: 1,
                protections: data.protected ? 1 : 0,
            });
        }
        catch (err) {
            console.warn('MongoDB: Failed to save threat:', err.message);
        }
    }
    // ── Save protection event ───────────────────────────────────────────
    async saveProtectionEvent(data) {
        if (!this.enabled || !this.protections)
            return;
        try {
            await this.protections.insertOne({ timestamp: new Date(), ...data });
        }
        catch (err) {
            console.warn('MongoDB: Failed to save protection:', err.message);
        }
    }
    // ── Update wallet stats (upsert) ────────────────────────────────────
    async updateWalletStats(walletAddress, network, delta) {
        if (!this.walletStats)
            return;
        try {
            await this.walletStats.updateOne({ walletAddress: walletAddress.toLowerCase() }, {
                $set: { lastScan: new Date(), isProtected: true, network },
                $inc: {
                    totalThreatsFound: delta.threatsFound,
                    totalProtections: delta.protections,
                },
                $setOnInsert: { walletAddress: walletAddress.toLowerCase() },
            }, { upsert: true });
        }
        catch (err) {
            console.warn('MongoDB: Failed to update wallet stats:', err.message);
        }
    }
    // ── Query helpers (used by REST API) ────────────────────────────────
    async getRecentThreats(limit = 20) {
        if (!this.enabled || !this.threats)
            return [];
        try {
            return await this.threats.find().sort({ timestamp: -1 }).limit(limit).toArray();
        }
        catch {
            return [];
        }
    }
    async getWalletThreats(walletAddress, limit = 50) {
        if (!this.enabled || !this.threats)
            return [];
        try {
            return await this.threats
                .find({ walletAddress: walletAddress.toLowerCase() })
                .sort({ timestamp: -1 }).limit(limit).toArray();
        }
        catch {
            return [];
        }
    }
    async getRecentProtections(limit = 20) {
        if (!this.enabled || !this.protections)
            return [];
        try {
            return await this.protections.find().sort({ timestamp: -1 }).limit(limit).toArray();
        }
        catch {
            return [];
        }
    }
    async getScanHistory(limit = 50) {
        if (!this.enabled || !this.scanCycles)
            return [];
        try {
            return await this.scanCycles.find().sort({ timestamp: -1 }).limit(limit).toArray();
        }
        catch {
            return [];
        }
    }
    async getStats() {
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
        }
        catch {
            return { totalScans: 0, totalThreats: 0, totalProtections: 0, walletsMonitored: 0 };
        }
    }
    isConnected() {
        return this.enabled && this.client !== null;
    }
}
// ── Singleton ─────────────────────────────────────────────────────────
export const mongoService = new MongoDBService();
//# sourceMappingURL=mongodb.js.map