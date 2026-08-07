import axios, { type AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { ethers } from 'ethers';

const BASE_URL = 'https://app.keeperhub.com';

/**
 * KeeperHub's API expects standard JSON ABI (array of {type, name, inputs,
 * outputs, stateMutability} objects) - the format Solidity compilers and
 * block explorers produce. GuardDog's ABIs are written in ethers' more
 * convenient "human-readable" string format
 * (e.g. "function protectTokens(...) external"), so we normalize here,
 * once, rather than requiring every caller to remember to convert.
 */
function toStandardAbiJson(abi: unknown[]): unknown[] {
    const iface = new ethers.Interface(abi as any);
    return JSON.parse(iface.formatJson());
}

export interface KeeperHubChain {
    id: string;
    chainId: number;
    name: string;
    symbol: string;
    chainType: 'evm' | 'solana';
    isTestnet: boolean;
    isEnabled: boolean;
}

export interface SimulateResult {
    success: boolean;
    wouldRevert: boolean;
    gasEstimate?: string;
    revertReason?: string;
    error?: string;
    code?: string;
}

export interface ExecutionResult {
    executionId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ExecutionStatus {
    executionId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    transactionHash?: string;
    transactionLink?: string;
    sponsored: boolean;
    receipts: Array<{
        hash: string;
        chainId: number;
        verified: boolean;
        receiptStatus: 'success' | 'reverted' | 'safe_inner_failure' | 'not_found' | 'timeout';
        blockNumber?: number;
        gasUsed?: string;
    }>;
    error?: string | null;
}

/**
 * Thin wrapper around KeeperHub's Direct Execution REST API.
 * Docs: https://docs.keeperhub.com/api/direct-execution
 *
 * This intentionally does NOT replace BlockchainService — it's a separate,
 * swappable execution path. See wallet-monitor.ts for where it plugs in.
 */
export class KeeperHubService {
    private client: AxiosInstance;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('KEEPERHUB_API_KEY is required to use KeeperHubService');
        }
        this.client = axios.create({
            baseURL: BASE_URL,
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 30_000,
        });
    }

    /** Step 0 (one-time check, not part of the per-tx flow): confirm a chain is usable. */
    async listChains(includeDisabled = false): Promise<KeeperHubChain[]> {
        const res = await this.client.get<KeeperHubChain[]>('/api/chains', {
            params: { includeDisabled },
        });
        return res.data;
    }

    async isChainSupported(chainId: number): Promise<KeeperHubChain | undefined> {
        const chains = await this.listChains();
        return chains.find(c => c.chainId === chainId && c.isEnabled);
    }

    /** Step 1: dry-run. Never signs or broadcasts - safe to call freely. */
    async simulateContractCall(params: {
        contractAddress: string;
        chainId: number;
        functionName: string;
        functionArgs: unknown[];
        abi: unknown[];
        value?: string;
    }): Promise<SimulateResult> {
        try {
            const res = await this.client.post('/api/execute/contract-call', {
                contractAddress: params.contractAddress,
                chainId: params.chainId,
                functionName: params.functionName,
                functionArgs: JSON.stringify(params.functionArgs),
                abi: JSON.stringify(toStandardAbiJson(params.abi)),
                value: params.value,
                simulate: true,
            });
            return res.data;
        } catch (error: any) {
            // A would-revert simulate comes back as HTTP 400 with the decoded reason —
            // that's informative, not a transport failure, so surface it as data.
            if (error.response?.data) return error.response.data;
            throw error;
        }
    }

    /**
     * Step 2: the real, signed, broadcast call. Always pass a fresh
     * idempotencyKey per logical protection action (e.g. `${wallet}:${token}:${Date.now()}`)
     * so a retry after a network blip can't double-execute.
     */
    async executeContractCall(params: {
        contractAddress: string;
        chainId: number;
        functionName: string;
        functionArgs: unknown[];
        abi: unknown[];
        value?: string;
        idempotencyKey?: string;
    }): Promise<ExecutionResult> {
        const res = await this.client.post('/api/execute/contract-call', {
            contractAddress: params.contractAddress,
            chainId: params.chainId,
            functionName: params.functionName,
            functionArgs: JSON.stringify(params.functionArgs),
            abi: JSON.stringify(toStandardAbiJson(params.abi)),
            value: params.value,
        }, {
            headers: {
                'Idempotency-Key': params.idempotencyKey || randomUUID(),
            },
        });
        return res.data;
    }

    /** Step 3: poll until completed/failed. Honors the poll-interval hint header. */
    async getExecutionStatus(executionId: string): Promise<{
        status: ExecutionStatus;
        pollAfterSeconds: number;
    }> {
        const res = await this.client.get<ExecutionStatus>(`/api/execute/${executionId}/status`);
        const hint = res.headers['x-poll-interval-hint'];
        return {
            status: res.data,
            pollAfterSeconds: hint ? parseInt(hint, 10) : 3,
        };
    }

    /** Convenience: run the full safe sequence (simulate → execute → poll) in one call. */
    async executeAndWait(params: {
        contractAddress: string;
        chainId: number;
        functionName: string;
        functionArgs: unknown[];
        abi: unknown[];
        value?: string;
        idempotencyKey?: string;
        maxPolls?: number;
    }): Promise<ExecutionStatus> {
        const sim = await this.simulateContractCall(params);
        if (!sim.success || sim.wouldRevert) {
            throw new Error(`Simulation failed: ${sim.error || sim.revertReason || 'unknown reason'}`);
        }

        const { executionId } = await this.executeContractCall(params);

        const maxPolls = params.maxPolls ?? 20;
        for (let i = 0; i < maxPolls; i++) {
            const { status, pollAfterSeconds } = await this.getExecutionStatus(executionId);
            if (status.status === 'completed' || status.status === 'failed') {
                return status;
            }
            await new Promise(r => setTimeout(r, Math.max(pollAfterSeconds, 1) * 1000));
        }

        throw new Error(`Execution ${executionId} did not settle after ${maxPolls} polls`);
    }
}