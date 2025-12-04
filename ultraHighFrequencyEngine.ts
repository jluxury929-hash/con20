
import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { Opportunity, TradeResult, Strategy } from '../types';
import { strategyRegistry } from '../strategies/strategyRegistry';
import { neuralNetworkPredictor } from '../ai/neuralNetwork';
import { realFlashLoanExecutor } from '../flashloan/realFlashLoanExecutor';
import { config } from '../config';
import logger from '../utils/logger';
import * as os from 'os';

export class UltraHighFrequencyEngine extends EventEmitter {
  private isRunning: boolean = false;
  private workers: Worker[] = [];
  private readonly numWorkers: number;
  private tradeCount: number = 0;
  private opportunityQueue: Opportunity[] = [];
  private readonly maxQueueSize: number = 1000000; // 1 million opportunities
  private executionLoops: NodeJS.Timeout[] = [];
  private strategiesPerSecond: number = 0;
  private lastSecondTimestamp: number = 0;

  constructor() {
    super();
    // Use all available CPU cores for maximum performance
    this.numWorkers = os.cpus().length;
    logger.info(`Ultra-high-frequency engine initialized with ${this.numWorkers} workers`);
  }

  /**
   * Start ultra-high-frequency trading
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Ultra-HF engine already running');
      return;
    }

    logger.info('Starting ultra-high-frequency trading engine...');
    this.isRunning = true;
    this.lastSecondTimestamp = Date.now();

    // Start multiple execution loops for maximum throughput
    const loopsPerCore = 10; // 10 loops per CPU core
    const totalLoops = this.numWorkers * loopsPerCore;

    for (let i = 0; i < totalLoops; i++) {
      this.startExecutionLoop(i);
    }

    // Start opportunity generation loops
    this.startOpportunityGenerators();

    // Start AI training loop
    this.startAITrainingLoop();

    // Start flash loan monitoring
    this.startFlashLoanMonitoring();

    logger.info(`Ultra-HF engine started with ${totalLoops} execution loops`);
  }

  /**
   * Start a single execution loop
   */
  private startExecutionLoop(loopId: number): void {
    const loop = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(loop);
        return;
      }

      try {
        // Process multiple opportunities in parallel
        const batchSize = 1000; // Process 1000 opportunities per loop iteration
        const batch = this.opportunityQueue.splice(0, batchSize);

        if (batch.length === 0) {
          return;
        }

        // Execute all opportunities in parallel
        const results = await Promise.allSettled(
          batch.map(opp => this.executeOpportunity(opp))
        );

        // Update metrics
        this.tradeCount += results.length;
        this.updateStrategiesPerSecond(results.length);

        // Process results
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const opportunity = batch[index];
            const tradeResult = result.value;

            // Add to AI training data
            neuralNetworkPredictor.addTrainingData(opportunity, tradeResult);

            // Emit event
            this.emit('trade_executed', {
              opportunity,
              result: tradeResult,
              loopId
            });
          }
        });

      } catch (error) {
        logger.error(`Error in execution loop ${loopId}:`, error);
      }
    }, 1); // Run every 1ms for maximum speed
  }

  /**
   * Execute a single opportunity
   */
  private async executeOpportunity(opportunity: Opportunity): Promise<TradeResult> {
    const startTime = Date.now();

    try {
      // Use AI to predict success probability
      const aiProbability = await neuralNetworkPredictor.predictProfitProbability(opportunity);

      // Only execute if AI is confident
      if (aiProbability < config.ai.confidenceThreshold) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: Date.now(),
          error: 'AI confidence too low'
        };
      }

      // Get strategy
      const strategies = strategyRegistry.getStrategiesByType(opportunity.type);
      if (strategies.length === 0) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: Date.now(),
          error: 'No strategy available'
        };
      }

      // Select best strategy
      const strategy = strategies.sort((a, b) => b.priority - a.priority)[0];

      // Execute trade
      const result = await strategy.execute(opportunity);

      // Update strategy performance
      strategyRegistry.updateStrategyPerformance(strategy.id, result);

      return result;

    } catch (error: any) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Start opportunity generation loops
   */
  private startOpportunityGenerators(): void {
    // Generate opportunities from all strategies simultaneously
    const strategies = strategyRegistry.getAllStrategies();
    
    // Create generator for each strategy
    strategies.forEach((strategy, index) => {
      const generator = setInterval(async () => {
        if (!this.isRunning) {
          clearInterval(generator);
          return;
        }

        try {
          // Generate opportunities
          const opportunities = await strategy.analyze();
          
          // Add to queue if not full
          if (this.opportunityQueue.length < this.maxQueueSize) {
            this.opportunityQueue.push(...opportunities);
          }

        } catch (error) {
          logger.debug(`Strategy ${strategy.name} analysis failed:`, error);
        }
      }, 10); // Run every 10ms

      this.executionLoops.push(generator);
    });

    logger.info(`Started ${strategies.length} opportunity generators`);
  }

  /**
   * Start AI training loop
   */
  private startAITrainingLoop(): void {
    const trainingLoop = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(trainingLoop);
        return;
      }

      try {
        const metrics = neuralNetworkPredictor.getMetrics();
        
        // Train when we have enough data
        if (metrics.trainingDataSize >= 5000 && !metrics.isTraining) {
          logger.info('Starting AI model training...');
          await neuralNetworkPredictor.trainModel();
          
          // Save model after training
          await neuralNetworkPredictor.saveModel();
        }
      } catch (error) {
        logger.error('AI training loop error:', error);
      }
    }, 60000); // Check every minute

    this.executionLoops.push(trainingLoop);
  }

  /**
   * Start flash loan monitoring and execution
   */
  private startFlashLoanMonitoring(): void {
    if (!config.trading.enableFlashLoans) {
      logger.info('Flash loans disabled in config');
      return;
    }

    if (!realFlashLoanExecutor.isAvailable()) {
      logger.warn('Real flash loan executor not available');
      return;
    }

    const flashLoanLoop = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(flashLoanLoop);
        return;
      }

      try {
        // Check for flash loan opportunities in queue
        const flashLoanOpps = this.opportunityQueue.filter(
          opp => opp.type === 'FLASH_LOAN'
        );

        for (const opp of flashLoanOpps) {
          // Use AI to predict success
          const aiProbability = await neuralNetworkPredictor.predictProfitProbability(opp);

          // Execute if AI confidence is above 40%
          if (aiProbability >= 0.40) {
            logger.info(`Executing flash loan with ${(aiProbability * 100).toFixed(2)}% AI confidence`);
            
            const result = await realFlashLoanExecutor.executeFlashLoan({
              id: opp.id,
              loanAmount: config.trading.flashLoanAmountETH,
              loanToken: opp.tokens[0],
              estimatedProfit: opp.estimatedProfit,
              estimatedProfitUSD: opp.estimatedProfitUSD,
              confidence: aiProbability,
              riskScore: 1 - aiProbability,
              steps: [],
              gasEstimate: opp.gasEstimate,
              timestamp: opp.timestamp
            });

            if (result.success) {
              logger.info(`\u2705 Flash loan executed successfully! Profit: ${result.profit} ETH`);
              this.emit('flash_loan_success', result);
            }
          }
        }

      } catch (error) {
        logger.error('Flash loan monitoring error:', error);
      }
    }, 100); // Check every 100ms

    this.executionLoops.push(flashLoanLoop);
  }

  /**
   * Update strategies per second metric
   */
  private updateStrategiesPerSecond(count: number): void {
    const now = Date.now();
    
    if (now - this.lastSecondTimestamp >= 1000) {
      this.strategiesPerSecond = count;
      this.lastSecondTimestamp = now;
      
      logger.debug(`Strategies/second: ${this.strategiesPerSecond.toLocaleString()}`);
    }
  }

  /**
   * Stop the engine
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping ultra-high-frequency engine...');
    this.isRunning = false;

    // Clear all loops
    this.executionLoops.forEach(loop => clearInterval(loop));
    this.executionLoops = [];

    // Terminate workers
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];

    logger.info('Ultra-HF engine stopped');
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): {
    isRunning: boolean;
    tradeCount: number;
    strategiesPerSecond: number;
    queueSize: number;
    numWorkers: number;
    aiMetrics: any;
    flashLoanStats: any;
  } {
    return {
      isRunning: this.isRunning,
      tradeCount: this.tradeCount,
      strategiesPerSecond: this.strategiesPerSecond,
      queueSize: this.opportunityQueue.length,
      numWorkers: this.numWorkers,
      aiMetrics: neuralNetworkPredictor.getMetrics(),
      flashLoanStats: realFlashLoanExecutor.getStatistics()
    };
  }

  /**
   * Add opportunity to queue
   */
  public addOpportunity(opportunity: Opportunity): void {
    if (this.opportunityQueue.length < this.maxQueueSize) {
      this.opportunityQueue.push(opportunity);
    }
  }

  /**
   * Clear opportunity queue
   */
  public clearQueue(): void {
    this.opportunityQueue = [];
  }
}

export const ultraHighFrequencyEngine = new UltraHighFrequencyEngine();
