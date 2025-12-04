
import { AIDecision, Opportunity, RiskLevel, Strategy, StrategyType } from '../types';
import logger from '../utils/logger';

export class AIDecisionEngine {
  private historicalData: Array<{
    opportunity: Opportunity;
    executed: boolean;
    result?: any;
    timestamp: number;
  }> = [];

  private strategyPerformance: Map<string, {
    successRate: number;
    avgProfit: number;
    totalTrades: number;
    recentPerformance: number[];
  }> = new Map();

  constructor() {
    logger.info('AI Decision Engine initialized');
  }

  public async analyzeOpportunity(opportunity: Opportunity): Promise<AIDecision> {
    const startTime = Date.now();

    // Multi-factor analysis
    const riskScore = this.calculateRiskScore(opportunity);
    const profitProbability = this.calculateProfitProbability(opportunity);
    const marketConditions = this.analyzeMarketConditions(opportunity);
    const strategyReliability = this.getStrategyReliability(opportunity.type);
    const timingScore = this.analyzeTimingFactors(opportunity);

    // Weighted confidence calculation
    const confidence = this.calculateConfidence({
      riskScore,
      profitProbability,
      marketConditions,
      strategyReliability,
      timingScore
    });

    // Determine if should execute
    const shouldExecute = this.shouldExecuteTrade(
      confidence,
      riskScore,
      opportunity
    );

    // Generate reasoning
    const reasoning = this.generateReasoning({
      confidence,
      riskScore,
      profitProbability,
      marketConditions,
      strategyReliability,
      timingScore,
      shouldExecute
    });

    // Recommend strategies
    const recommendedStrategies = this.recommendStrategies(opportunity);

    const decision: AIDecision = {
      shouldExecute,
      confidence,
      reasoning,
      recommendedStrategies,
      riskAssessment: {
        overallRisk: this.getRiskLevel(riskScore),
        factors: this.getRiskFactors(opportunity),
        score: riskScore
      },
      expectedProfit: opportunity.estimatedProfitUSD,
      timestamp: Date.now()
    };

    logger.debug(`AI decision made in ${Date.now() - startTime}ms:`, {
      shouldExecute,
      confidence,
      riskScore
    });

    return decision;
  }

  private calculateRiskScore(opportunity: Opportunity): number {
    let score = 0;

    // Base risk by type
    const typeRisk: Record<StrategyType, number> = {
      [StrategyType.ARBITRAGE]: 0.2,
      [StrategyType.CROSS_DEX]: 0.3,
      [StrategyType.TRIANGULAR_ARBITRAGE]: 0.4,
      [StrategyType.FLASH_LOAN]: 0.7,
      [StrategyType.MEV]: 0.6,
      [StrategyType.SANDWICH]: 0.8,
      [StrategyType.FRONTRUN]: 0.9,
      [StrategyType.BACKRUN]: 0.5,
      [StrategyType.LIQUIDATION]: 0.5,
      [StrategyType.MARKET_MAKING]: 0.3,
      [StrategyType.TREND_FOLLOWING]: 0.4,
      [StrategyType.MEAN_REVERSION]: 0.4,
      [StrategyType.MOMENTUM]: 0.5,
      [StrategyType.STATISTICAL_ARBITRAGE]: 0.3,
      [StrategyType.CROSS_CHAIN]: 0.6,
      [StrategyType.JIT_LIQUIDITY]: 0.5,
      [StrategyType.VOLUME_ANALYSIS]: 0.3,
      [StrategyType.ORDERBOOK_IMBALANCE]: 0.4,
      [StrategyType.FUNDING_RATE]: 0.3,
      [StrategyType.BASIS_TRADING]: 0.3
    };

    score += typeRisk[opportunity.type] || 0.5;

    // Gas cost risk
    const gasCostPercent = (opportunity.gasEstimate * 50) / opportunity.estimatedProfitUSD;
    score += Math.min(gasCostPercent / 100, 0.3);

    // Time sensitivity risk
    const timeToExpiry = opportunity.expiresAt - Date.now();
    if (timeToExpiry < 1000) score += 0.3; // Less than 1 second
    else if (timeToExpiry < 5000) score += 0.2; // Less than 5 seconds
    else if (timeToExpiry < 10000) score += 0.1; // Less than 10 seconds

    // Confidence risk (inverse)
    score += (1 - opportunity.confidence) * 0.3;

    // Normalize to 0-1
    return Math.min(Math.max(score, 0), 1);
  }

  private calculateProfitProbability(opportunity: Opportunity): number {
    let probability = opportunity.confidence;

    // Adjust based on historical performance
    const strategyPerf = this.strategyPerformance.get(opportunity.type);
    if (strategyPerf) {
      probability = (probability + strategyPerf.successRate) / 2;
    }

    // Adjust based on profit margin
    const profitMargin = opportunity.estimatedProfitUSD / (opportunity.gasEstimate * 50 || 1);
    if (profitMargin > 5) probability += 0.1;
    else if (profitMargin > 2) probability += 0.05;
    else if (profitMargin < 1.2) probability -= 0.2;

    return Math.min(Math.max(probability, 0), 1);
  }

  private analyzeMarketConditions(opportunity: Opportunity): number {
    // Simulate market condition analysis
    // In production, this would analyze:
    // - Volatility
    // - Liquidity
    // - Trading volume
    // - Market trends
    // - Network congestion

    let score = 0.7; // Base favorable conditions

    // Time-based adjustments (simulate market activity)
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 16) score += 0.1; // Peak trading hours
    if (hour >= 0 && hour <= 4) score -= 0.1; // Low activity hours

    return Math.min(Math.max(score, 0), 1);
  }

  private getStrategyReliability(strategyType: StrategyType): number {
    const perf = this.strategyPerformance.get(strategyType);
    if (!perf || perf.totalTrades < 10) {
      // Default reliability for new strategies
      const defaultReliability: Partial<Record<StrategyType, number>> = {
        [StrategyType.ARBITRAGE]: 0.8,
        [StrategyType.CROSS_DEX]: 0.75,
        [StrategyType.TRIANGULAR_ARBITRAGE]: 0.7,
        [StrategyType.MARKET_MAKING]: 0.7,
        [StrategyType.STATISTICAL_ARBITRAGE]: 0.75
      };
      return defaultReliability[strategyType] || 0.6;
    }

    return perf.successRate;
  }

  private analyzeTimingFactors(opportunity: Opportunity): number {
    const timeToExpiry = opportunity.expiresAt - Date.now();
    const age = Date.now() - opportunity.timestamp;

    let score = 1.0;

    // Penalize old opportunities
    if (age > 5000) score -= 0.3;
    else if (age > 2000) score -= 0.1;

    // Penalize soon-to-expire opportunities
    if (timeToExpiry < 1000) score -= 0.4;
    else if (timeToExpiry < 3000) score -= 0.2;

    return Math.min(Math.max(score, 0), 1);
  }

  private calculateConfidence(factors: {
    riskScore: number;
    profitProbability: number;
    marketConditions: number;
    strategyReliability: number;
    timingScore: number;
  }): number {
    // Weighted average of all factors
    const weights = {
      riskScore: 0.25,
      profitProbability: 0.30,
      marketConditions: 0.15,
      strategyReliability: 0.20,
      timingScore: 0.10
    };

    const confidence =
      (1 - factors.riskScore) * weights.riskScore +
      factors.profitProbability * weights.profitProbability +
      factors.marketConditions * weights.marketConditions +
      factors.strategyReliability * weights.strategyReliability +
      factors.timingScore * weights.timingScore;

    return Math.min(Math.max(confidence, 0), 1);
  }

  private shouldExecuteTrade(
    confidence: number,
    riskScore: number,
    opportunity: Opportunity
  ): boolean {
    // Minimum confidence threshold
    if (confidence < 0.6) return false;

    // Risk-adjusted decision
    if (riskScore > 0.7 && confidence < 0.85) return false;
    if (riskScore > 0.5 && confidence < 0.75) return false;

    // Profit threshold
    if (opportunity.estimatedProfitUSD < 1.0) return false;

    // Gas efficiency check
    const profitAfterGas = opportunity.estimatedProfitUSD - (opportunity.gasEstimate * 50);
    if (profitAfterGas < 0.5) return false;

    return true;
  }

  private generateReasoning(params: any): string {
    const reasons: string[] = [];

    if (params.shouldExecute) {
      reasons.push(`High confidence (${(params.confidence * 100).toFixed(1)}%)`);
      reasons.push(`Profit probability: ${(params.profitProbability * 100).toFixed(1)}%`);
      
      if (params.riskScore < 0.3) {
        reasons.push('Low risk profile');
      } else if (params.riskScore < 0.6) {
        reasons.push('Acceptable risk level');
      }

      if (params.marketConditions > 0.7) {
        reasons.push('Favorable market conditions');
      }

      if (params.strategyReliability > 0.75) {
        reasons.push('Proven strategy reliability');
      }
    } else {
      if (params.confidence < 0.6) {
        reasons.push('Insufficient confidence');
      }
      if (params.riskScore > 0.7) {
        reasons.push('Risk too high');
      }
      if (params.profitProbability < 0.5) {
        reasons.push('Low profit probability');
      }
      if (params.timingScore < 0.5) {
        reasons.push('Poor timing factors');
      }
    }

    return reasons.join('; ');
  }

  private recommendStrategies(opportunity: Opportunity): string[] {
    const recommendations: string[] = [opportunity.type];

    // Add complementary strategies
    const complementary: Partial<Record<StrategyType, StrategyType[]>> = {
      [StrategyType.ARBITRAGE]: [StrategyType.CROSS_DEX, StrategyType.TRIANGULAR_ARBITRAGE],
      [StrategyType.FLASH_LOAN]: [StrategyType.ARBITRAGE, StrategyType.LIQUIDATION],
      [StrategyType.MEV]: [StrategyType.SANDWICH, StrategyType.BACKRUN]
    };

    const related = complementary[opportunity.type];
    if (related) {
      recommendations.push(...related);
    }

    return recommendations;
  }

  private getRiskLevel(riskScore: number): RiskLevel {
    if (riskScore < 0.3) return RiskLevel.LOW;
    if (riskScore < 0.6) return RiskLevel.MEDIUM;
    if (riskScore < 0.8) return RiskLevel.HIGH;
    return RiskLevel.EXTREME;
  }

  private getRiskFactors(opportunity: Opportunity): string[] {
    const factors: string[] = [];

    if (opportunity.gasEstimate > 500000) {
      factors.push('High gas cost');
    }

    const timeToExpiry = opportunity.expiresAt - Date.now();
    if (timeToExpiry < 5000) {
      factors.push('Time-sensitive');
    }

    if (opportunity.confidence < 0.7) {
      factors.push('Uncertain outcome');
    }

    if ([StrategyType.FLASH_LOAN, StrategyType.SANDWICH, StrategyType.FRONTRUN].includes(opportunity.type)) {
      factors.push('Complex execution');
    }

    return factors;
  }

  public updateStrategyPerformance(
    strategyType: StrategyType,
    success: boolean,
    profit: number
  ): void {
    let perf = this.strategyPerformance.get(strategyType);
    
    if (!perf) {
      perf = {
        successRate: 0,
        avgProfit: 0,
        totalTrades: 0,
        recentPerformance: []
      };
    }

    perf.totalTrades++;
    perf.recentPerformance.push(success ? 1 : 0);
    
    // Keep only last 100 trades
    if (perf.recentPerformance.length > 100) {
      perf.recentPerformance.shift();
    }

    // Calculate success rate from recent performance
    const recentSuccesses = perf.recentPerformance.filter(x => x === 1).length;
    perf.successRate = recentSuccesses / perf.recentPerformance.length;

    // Update average profit
    perf.avgProfit = (perf.avgProfit * (perf.totalTrades - 1) + profit) / perf.totalTrades;

    this.strategyPerformance.set(strategyType, perf);
  }

  public getStrategyPerformance(): Map<string, any> {
    return new Map(this.strategyPerformance);
  }

  public recordOpportunity(opportunity: Opportunity, executed: boolean, result?: any): void {
    this.historicalData.push({
      opportunity,
      executed,
      result,
      timestamp: Date.now()
    });

    // Keep only last 10000 records
    if (this.historicalData.length > 10000) {
      this.historicalData.shift();
    }
  }
}

export const aiDecisionEngine = new AIDecisionEngine();
