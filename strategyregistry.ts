
import { Strategy, StrategyType, RiskLevel, Opportunity, TradeResult } from '../types';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class StrategyRegistry {
  private strategies: Map<string, Strategy> = new Map();
  private activeStrategies: Set<string> = new Set();
  private strategyQueue: string[] = [];

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    logger.info('Initializing massive strategy registry...');

    // Generate 1000+ strategies across all categories
    this.generateArbitrageStrategies();
    this.generateMEVStrategies();
    this.generateLiquidationStrategies();
    this.generateFlashLoanStrategies();
    this.generateMarketMakingStrategies();
    this.generateTrendStrategies();
    this.generateStatisticalStrategies();
    this.generateMomentumStrategies();
    this.generateCrossChainStrategies();
    this.generateAdvancedStrategies();

    logger.info(`Strategy registry initialized with ${this.strategies.size} strategies`);
  }

  private generateArbitrageStrategies(): void {
    // Simple Arbitrage (100 variations)
    for (let i = 0; i < 100; i++) {
      const strategy = this.createStrategy({
        name: `Simple Arbitrage ${i + 1}`,
        type: StrategyType.ARBITRAGE,
        riskLevel: RiskLevel.LOW,
        minProfitUSD: 0.5 + (i * 0.1),
        maxGasPrice: 50 + i,
        priority: 100 - i
      });
      this.strategies.set(strategy.id, strategy);
    }

    // Cross-DEX Arbitrage (100 variations)
    for (let i = 0; i < 100; i++) {
      const strategy = this.createStrategy({
        name: `Cross-DEX Arbitrage ${i + 1}`,
        type: StrategyType.CROSS_DEX,
        riskLevel: i < 50 ? RiskLevel.LOW : RiskLevel.MEDIUM,
        minProfitUSD: 1.0 + (i * 0.2),
        maxGasPrice: 60 + i,
        priority: 90 - (i % 50)
      });
      this.strategies.set(strategy.id, strategy);
    }

    // Triangular Arbitrage (100 variations)
    for (let i = 0; i < 100; i++) {
      const strategy = this.createStrategy({
        name: `Triangular Arbitrage ${i + 1}`,
        type: StrategyType.TRIANGULAR_ARBITRAGE,
        riskLevel: i < 30 ? RiskLevel.LOW : i < 70 ? RiskLevel.MEDIUM : RiskLevel.HIGH,
        minProfitUSD: 1.5 + (i * 0.15),
        maxGasPrice: 70 + i,
        priority: 85 - (i % 40)
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private generateMEVStrategies(): void {
    // Sandwich Strategies (50 variations)
    for (let i = 0; i < 50; i++) {
      const strategy = this.createStrategy({
        name: `Sandwich Strategy ${i + 1}`,
        type: StrategyType.SANDWICH,
        riskLevel: RiskLevel.HIGH,
        minProfitUSD: 5.0 + (i * 0.5),
        maxGasPrice: 100 + (i * 2),
        priority: 70 - i
      });
      this.strategies.set(strategy.id, strategy);
    }

    // Frontrun Strategies (50 variations)
    for (let i = 0; i < 50; i++) {
      const strategy = this.createStrategy({
        name: `Frontrun Strategy ${i + 1}`,
        type: StrategyType.FRONTRUN,
        riskLevel: RiskLevel.EXTREME,
        minProfitUSD: 10.0 + i,
        maxGasPrice: 150 + (i * 3),
        priority: 60 - i
      });
      this.strategies.set(strategy.id, strategy);
    }

    // Backrun Strategies (50 variations)
    for (let i = 0; i < 50; i++) {
      const strategy = this.createStrategy({
        name: `Backrun Strategy ${i + 1}`,
        type: StrategyType.BACKRUN,
        riskLevel: i < 25 ? RiskLevel.MEDIUM : RiskLevel.HIGH,
        minProfitUSD: 3.0 + (i * 0.3),
        maxGasPrice: 80 + (i * 2),
        priority: 75 - i
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private generateLiquidationStrategies(): void {
    // Liquidation Strategies (100 variations)
    for (let i = 0; i < 100; i++) {
      const strategy = this.createStrategy({
        name: `Liquidation Strategy ${i + 1}`,
        type: StrategyType.LIQUIDATION,
        riskLevel: i < 40 ? RiskLevel.MEDIUM : RiskLevel.HIGH,
        minProfitUSD: 2.0 + (i * 0.25),
        maxGasPrice: 90 + i,
        priority: 80 - (i % 50)
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private generateFlashLoanStrategies(): void {
    // Flash Loan Arbitrage (100 variations)
    for (let i = 0; i < 100; i++) {
      const strategy = this.createStrategy({
        name: `Flash Loan Arbitrage ${i + 1}`,
        type: StrategyType.FLASH_LOAN,
        riskLevel: i < 30 ? RiskLevel.MEDIUM : RiskLevel.HIGH,
        minProfitUSD: 10.0 + (i * 0.5),
        maxGasPrice: 120 + (i * 2),
        priority: 65 - (i % 40)
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private generateMarketMakingStrategies(): void {
    // Market Making (80 variations)
    for (let i = 0; i < 80; i++) {
      const strategy = this.createStrategy({
        name: `Market Making ${i + 1}`,
        type: StrategyType.MARKET_MAKING,
        riskLevel: i < 50 ? RiskLevel.LOW : RiskLevel.MEDIUM,
        minProfitUSD: 0.3 + (i * 0.05),
        maxGasPrice: 40 + i,
        priority: 95 - i
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private generateTrendStrategies(): void {
    // Trend Following (60 variations)
    for (let i = 0; i < 60; i++) {
      const strategy = this.createStrategy({
        name: `Trend Following ${i + 1}`,
        type: StrategyType.TREND_FOLLOWING,
        riskLevel: i < 30 ? RiskLevel.LOW : RiskLevel.MEDIUM,
        minProfitUSD: 1.0 + (i * 0.1),
        maxGasPrice: 50 + i,
        priority: 70 - i
      });
      this.strategies.set(strategy.id, strategy);
    }

    // Mean Reversion (60 variations)
    for (let i = 0; i < 60; i++) {
      const strategy = this.createStrategy({
        name: `Mean Reversion ${i + 1}`,
        type: StrategyType.MEAN_REVERSION,
        riskLevel: i < 35 ? RiskLevel.LOW : RiskLevel.MEDIUM,
        minProfitUSD: 0.8 + (i * 0.08),
        maxGasPrice: 45 + i,
        priority: 72 - i
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private generateStatisticalStrategies(): void {
    // Statistical Arbitrage (80 variations)
    for (let i = 0; i < 80; i++) {
      const strategy = this.createStrategy({
        name: `Statistical Arbitrage ${i + 1}`,
        type: StrategyType.STATISTICAL_ARBITRAGE,
        riskLevel: i < 50 ? RiskLevel.LOW : RiskLevel.MEDIUM,
        minProfitUSD: 0.7 + (i * 0.07),
        maxGasPrice: 55 + i,
        priority: 88 - i
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private generateMomentumStrategies(): void {
    // Momentum Strategies (70 variations)
    for (let i = 0; i < 70; i++) {
      const strategy = this.createStrategy({
        name: `Momentum Strategy ${i + 1}`,
        type: StrategyType.MOMENTUM,
        riskLevel: i < 30 ? RiskLevel.MEDIUM : RiskLevel.HIGH,
        minProfitUSD: 1.2 + (i * 0.12),
        maxGasPrice: 60 + i,
        priority: 68 - i
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private generateCrossChainStrategies(): void {
    // Cross-Chain Arbitrage (60 variations)
    for (let i = 0; i < 60; i++) {
      const strategy = this.createStrategy({
        name: `Cross-Chain Arbitrage ${i + 1}`,
        type: StrategyType.CROSS_CHAIN,
        riskLevel: i < 20 ? RiskLevel.MEDIUM : RiskLevel.HIGH,
        minProfitUSD: 5.0 + (i * 0.3),
        maxGasPrice: 100 + (i * 2),
        priority: 55 - i
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private generateAdvancedStrategies(): void {
    // JIT Liquidity (40 variations)
    for (let i = 0; i < 40; i++) {
      const strategy = this.createStrategy({
        name: `JIT Liquidity ${i + 1}`,
        type: StrategyType.JIT_LIQUIDITY,
        riskLevel: i < 20 ? RiskLevel.MEDIUM : RiskLevel.HIGH,
        minProfitUSD: 2.0 + (i * 0.2),
        maxGasPrice: 80 + (i * 2),
        priority: 65 - i
      });
      this.strategies.set(strategy.id, strategy);
    }

    // Volume Analysis (40 variations)
    for (let i = 0; i < 40; i++) {
      const strategy = this.createStrategy({
        name: `Volume Analysis ${i + 1}`,
        type: StrategyType.VOLUME_ANALYSIS,
        riskLevel: RiskLevel.LOW,
        minProfitUSD: 0.5 + (i * 0.05),
        maxGasPrice: 40 + i,
        priority: 85 - i
      });
      this.strategies.set(strategy.id, strategy);
    }

    // Orderbook Imbalance (40 variations)
    for (let i = 0; i < 40; i++) {
      const strategy = this.createStrategy({
        name: `Orderbook Imbalance ${i + 1}`,
        type: StrategyType.ORDERBOOK_IMBALANCE,
        riskLevel: i < 25 ? RiskLevel.LOW : RiskLevel.MEDIUM,
        minProfitUSD: 0.6 + (i * 0.06),
        maxGasPrice: 45 + i,
        priority: 82 - i
      });
      this.strategies.set(strategy.id, strategy);
    }

    // Funding Rate Arbitrage (30 variations)
    for (let i = 0; i < 30; i++) {
      const strategy = this.createStrategy({
        name: `Funding Rate Arbitrage ${i + 1}`,
        type: StrategyType.FUNDING_RATE,
        riskLevel: RiskLevel.LOW,
        minProfitUSD: 1.0 + (i * 0.1),
        maxGasPrice: 50 + i,
        priority: 78 - i
      });
      this.strategies.set(strategy.id, strategy);
    }

    // Basis Trading (30 variations)
    for (let i = 0; i < 30; i++) {
      const strategy = this.createStrategy({
        name: `Basis Trading ${i + 1}`,
        type: StrategyType.BASIS_TRADING,
        riskLevel: RiskLevel.LOW,
        minProfitUSD: 0.8 + (i * 0.08),
        maxGasPrice: 48 + i,
        priority: 80 - i
      });
      this.strategies.set(strategy.id, strategy);
    }
  }

  private createStrategy(params: {
    name: string;
    type: StrategyType;
    riskLevel: RiskLevel;
    minProfitUSD: number;
    maxGasPrice: number;
    priority: number;
  }): Strategy {
    const id = uuidv4();

    return {
      id,
      name: params.name,
      type: params.type,
      riskLevel: params.riskLevel,
      enabled: true,
      priority: params.priority,
      minProfitUSD: params.minProfitUSD,
      maxGasPrice: params.maxGasPrice,
      successRate: 0,
      totalTrades: 0,
      profitabletrades: 0,
      totalProfitUSD: 0,
      averageExecutionTime: 0,
      parameters: {
        slippage: 0.5,
        maxRetries: 3,
        timeout: 5000
      },
      execute: async (opportunity: Opportunity): Promise<TradeResult> => {
        // Simulated execution
        const startTime = Date.now();
        
        // Simulate execution delay (microseconds to milliseconds)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

        const success = Math.random() > 0.3; // 70% success rate simulation
        const executionTime = Date.now() - startTime;

        return {
          success,
          profit: success ? opportunity.estimatedProfit : 0,
          profitUSD: success ? opportunity.estimatedProfitUSD : 0,
          gasUsed: opportunity.gasEstimate,
          executionTime,
          timestamp: Date.now(),
          transactionHash: success ? `0x${Math.random().toString(16).substr(2, 64)}` : undefined,
          error: success ? undefined : 'Execution failed'
        };
      },
      analyze: async (): Promise<Opportunity[]> => {
        // Simulated opportunity detection
        return [];
      }
    };
  }

  public getAllStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  public getStrategy(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }

  public getStrategiesByType(type: StrategyType): Strategy[] {
    return Array.from(this.strategies.values()).filter(s => s.type === type);
  }

  public getStrategiesByRisk(riskLevel: RiskLevel): Strategy[] {
    return Array.from(this.strategies.values()).filter(s => s.riskLevel === riskLevel);
  }

  public getActiveStrategies(): Strategy[] {
    return Array.from(this.activeStrategies)
      .map(id => this.strategies.get(id))
      .filter((s): s is Strategy => s !== undefined && s.enabled);
  }

  public activateStrategy(id: string): void {
    const strategy = this.strategies.get(id);
    if (strategy) {
      strategy.enabled = true;
      this.activeStrategies.add(id);
      logger.info(`Strategy activated: ${strategy.name}`);
    }
  }

  public deactivateStrategy(id: string): void {
    const strategy = this.strategies.get(id);
    if (strategy) {
      strategy.enabled = false;
      this.activeStrategies.delete(id);
      logger.info(`Strategy deactivated: ${strategy.name}`);
    }
  }

  public updateStrategyPerformance(
    id: string,
    result: TradeResult
  ): void {
    const strategy = this.strategies.get(id);
    if (!strategy) return;

    strategy.totalTrades++;
    if (result.success) {
      strategy.profitabletrades++;
      strategy.totalProfitUSD += result.profitUSD || 0;
    }

    strategy.successRate = strategy.profitabletrades / strategy.totalTrades;
    strategy.averageExecutionTime = 
      (strategy.averageExecutionTime * (strategy.totalTrades - 1) + result.executionTime) / 
      strategy.totalTrades;
    strategy.lastExecuted = Date.now();
  }

  public getTopPerformingStrategies(limit: number = 10): Strategy[] {
    return Array.from(this.strategies.values())
      .filter(s => s.totalTrades > 0)
      .sort((a, b) => {
        const scoreA = a.successRate * a.totalProfitUSD;
        const scoreB = b.successRate * b.totalProfitUSD;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  public getStrategyStats(): {
    total: number;
    active: number;
    byType: Record<string, number>;
    byRisk: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const byRisk: Record<string, number> = {};

    for (const strategy of this.strategies.values()) {
      byType[strategy.type] = (byType[strategy.type] || 0) + 1;
      byRisk[strategy.riskLevel] = (byRisk[strategy.riskLevel] || 0) + 1;
    }

    return {
      total: this.strategies.size,
      active: this.activeStrategies.size,
      byType,
      byRisk
    };
  }
}

export const strategyRegistry = new StrategyRegistry();
