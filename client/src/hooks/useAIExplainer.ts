import { useState, useCallback } from 'react';

const PROXY_URL = import.meta.env.VITE_ANTHROPIC_PROXY_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SECURITY_SYSTEM_PROMPT = `You are GuardDog AI — an expert DeFi security analyst. 
You provide concise, accurate, plain-language security analysis.
- Be direct and specific. No fluff.
- Use concrete numbers and patterns when available.
- Format with short paragraphs. Use bullet points for lists of risks.
- Never exceed 200 words unless asked.
- Always end with a clear verdict: SAFE / CAUTION / DANGER.`;

async function callClaude(userPrompt: string): Promise<string> {
  if (!PROXY_URL) throw new Error('VITE_ANTHROPIC_PROXY_URL not configured');

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      system: SECURITY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 400,
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || '';
}


export interface ThreatData {
  contractAddress: string;
  threatType: string;
  threatLevel: number;
  evidence: string;
  reportCount: number;
  verified: boolean;
  upvotes: number;
  aggregateScore?: number;
}

export function useThreatExplainer() {
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const explain = useCallback(async (threat: ThreatData) => {
    setLoading(true);
    setError('');
    setExplanation('');

    try {
      const prompt = `Analyze this DeFi threat report and explain it in plain English:

Contract: ${threat.contractAddress}
Threat Type: ${threat.threatType}
Threat Level: ${threat.threatLevel}/100
Aggregate Score: ${threat.aggregateScore ?? threat.threatLevel}/100
Community Reports: ${threat.reportCount}
Verified by community: ${threat.verified ? 'Yes' : 'No'}
Upvotes: ${threat.upvotes}
Evidence: "${threat.evidence}"

Explain:
1. What this specific threat type does to victims
2. Why this contract is dangerous based on the evidence
3. What would happen if a user held or interacted with it
4. How GuardDog's autonomous protection would respond

Be specific about the mechanics. End with SAFE / CAUTION / DANGER verdict.`;

      const result = await callClaude(prompt);
      setExplanation(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setExplanation('');
    setError('');
  }, []);

  return { explanation, loading, error, explain, reset };
}


export interface RiskFactor {
  label: string;
  impact: number;
  description: string;
}

export interface WalletRiskData {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  factors: RiskFactor[];
  aiInsight: string;
  loading: boolean;
  error: string;
}

export function computeRiskScore(params: {
  isProtected: boolean;
  threatCount: number;
  maxThreatLevel: number;
  verifiedThreats: number;
  isCorrectNetwork: boolean;
  protectionDays: number;
}): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  let score = 100;

  if (!params.isProtected) {
    score -= 25;
    factors.push({
      label: 'No Active Protection',
      impact: -25,
      description: 'GuardDog agent is not monitoring this wallet',
    });
  } else {
    factors.push({
      label: 'GuardDog Active',
      impact: 0,
      description: `Protected for ${params.protectionDays}+ days`,
    });
  }

  if (params.threatCount > 0) {
    const deduction = Math.min(params.threatCount * 10, 35);
    score -= deduction;
    factors.push({
      label: `${params.threatCount} Threat Report${params.threatCount > 1 ? 's' : ''} Nearby`,
      impact: -deduction,
      description: 'Community-reported threats in your monitored tokens',
    });
  }

  if (params.maxThreatLevel >= 75) {
    score -= 20;
    factors.push({
      label: 'Critical Threat Detected',
      impact: -20,
      description: `Highest threat score: ${params.maxThreatLevel}/100`,
    });
  } else if (params.maxThreatLevel >= 50) {
    score -= 10;
    factors.push({
      label: 'Moderate Threat Detected',
      impact: -10,
      description: `Highest threat score: ${params.maxThreatLevel}/100`,
    });
  }

  if (params.verifiedThreats > 0) {
    score -= 15;
    factors.push({
      label: `${params.verifiedThreats} Verified Threat${params.verifiedThreats > 1 ? 's' : ''}`,
      impact: -15,
      description: 'Community-verified malicious contracts',
    });
  }

  if (!params.isCorrectNetwork) {
    score -= 5;
    factors.push({
      label: 'Unsupported Network',
      impact: -5,
      description: 'Protection contracts not deployed on this chain',
    });
  }

  score = Math.max(0, Math.min(100, score));
  return { score, factors };
}

export function getGradeFromScore(score: number): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; color: string; label: string } {
  if (score >= 85) return { grade: 'A', color: '#10B981', label: 'Excellent' };
  if (score >= 70) return { grade: 'B', color: '#3B82F6', label: 'Good' };
  if (score >= 55) return { grade: 'C', color: '#F59E0B', label: 'Moderate Risk' };
  if (score >= 35) return { grade: 'D', color: '#F97316', label: 'High Risk' };
  return { grade: 'F', color: '#EF4444', label: 'Critical Risk' };
}

export function useWalletRiskAI() {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateInsight = useCallback(async (
    score: number,
    factors: RiskFactor[],
    address: string
  ) => {
    setLoading(true);
    try {
      const factorList = factors.map(f => `${f.label} (${f.impact > 0 ? '+' : ''}${f.impact}): ${f.description}`).join('\n');
      const prompt = `Wallet risk assessment for ${address.slice(0, 10)}...:

Risk Score: ${score}/100
Risk Factors:
${factorList}

Give a 2-sentence security insight: what the biggest risk is right now and the single most important action this wallet owner should take. Be direct.`;

      const result = await callClaude(prompt);
      setInsight(result);
    } catch {
      setInsight('');
    } finally {
      setLoading(false);
    }
  }, []);

  return { insight, loading, generateInsight };
}


export interface TransactionRisk {
  level: 'safe' | 'caution' | 'danger';
  score: number;
  summary: string;
  details: string;
  recommendation: string;
}

export function useTransactionScreener() {
  const [risk, setRisk] = useState<TransactionRisk | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const screenTransaction = useCallback(async (params: {
    to: string;
    data?: string;
    value?: string;
    from?: string;
    threatScore?: number;
    isVerifiedThreat?: boolean;
    reportCount?: number;
  }) => {
    setLoading(true);
    setError('');
    setRisk(null);

    try {
      const methodSig = params.data ? params.data.slice(0, 10) : '0x';
      const hasData = params.data && params.data.length > 10;
      const valueEth = params.value ? (parseInt(params.value, 16) / 1e18).toFixed(6) : '0';

      const prompt = `Screen this blockchain transaction for security risks:

To: ${params.to}
From: ${params.from || 'unknown'}
Value: ${valueEth} ETH/BNB
Method Signature: ${methodSig}
Has Contract Data: ${hasData ? 'Yes' : 'No'}
Data Length: ${params.data ? Math.floor(params.data.length / 2) : 0} bytes
ThreatRegistry Score: ${params.threatScore ?? 'Not checked'}/100
Verified Threat: ${params.isVerifiedThreat ? 'YES - FLAGGED' : 'No'}
Community Reports: ${params.reportCount ?? 0}

Known dangerous method signatures:
- 0x095ea7b3: approve() — check if unlimited amount
- 0x23b872dd: transferFrom() — check source/destination  
- 0xa9059cbb: transfer() — standard transfer
- 0x38ed1739: swapExactTokensForTokens() — DEX swap

Assess:
1. Is the destination contract suspicious?
2. What does this transaction likely do?
3. What are the specific risks?
4. Should the user proceed?

Respond with:
RISK_LEVEL: [SAFE|CAUTION|DANGER]
SCORE: [0-100]
SUMMARY: [one sentence]
DETAILS: [2-3 sentences of specifics]
RECOMMENDATION: [one clear action]`;

      const result = await callClaude(prompt);

      const lines = result.split('\n');
      const get = (key: string) => {
        const line = lines.find(l => l.startsWith(key));
        return line ? line.split(':').slice(1).join(':').trim() : '';
      };

      const levelStr = get('RISK_LEVEL').toLowerCase();
      const level: TransactionRisk['level'] =
        levelStr === 'danger' ? 'danger' :
        levelStr === 'caution' ? 'caution' : 'safe';

      const scoreStr = get('SCORE');
      const score = parseInt(scoreStr) || (level === 'danger' ? 85 : level === 'caution' ? 50 : 15);

      setRisk({
        level,
        score,
        summary: get('SUMMARY') || 'Transaction screened.',
        details: get('DETAILS') || result,
        recommendation: get('RECOMMENDATION') || (level === 'danger' ? 'Do not proceed.' : 'Proceed with caution.'),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to screen transaction');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRisk(null);
    setError('');
  }, []);

  return { risk, loading, error, screenTransaction, reset };
}