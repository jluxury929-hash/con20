
import * as tf from '@tensorflow/tfjs-node';
import { Opportunity, TradeResult, StrategyType } from '../types';
import logger from '../utils/logger';

export class NeuralNetworkPredictor {
  private model: tf.LayersModel | null = null;
  private isTraining: boolean = false;
  private trainingData: Array<{
    features: number[];
    label: number;
  }> = [];
  private readonly maxTrainingData = 100000;

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      // Create a deep neural network for trade prediction
      this.model = tf.sequential({
        layers: [
          // Input layer
          tf.layers.dense({
            inputShape: [20], // 20 features
            units: 256,
            activation: 'relu',
            kernelInitializer: 'heNormal'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          
          // Hidden layers
          tf.layers.dense({
            units: 512,
            activation: 'relu',
            kernelInitializer: 'heNormal'
          }),
          tf.layers.batchNormalization(),
          tf.layers.dropout({ rate: 0.3 }),
          
          tf.layers.dense({
            units: 256,
            activation: 'relu',
            kernelInitializer: 'heNormal'
          }),
          tf.layers.batchNormalization(),
          tf.layers.dropout({ rate: 0.2 }),
          
          tf.layers.dense({
            units: 128,
            activation: 'relu',
            kernelInitializer: 'heNormal'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          
          tf.layers.dense({
            units: 64,
            activation: 'relu',
            kernelInitializer: 'heNormal'
          }),
          
          // Output layer - probability of profit
          tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
          })
        ]
      });

      // Compile with advanced optimizer
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy', 'precision', 'recall']
      });

      logger.info('Neural network model initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize neural network:', error);
    }
  }

  /**
   * Extract features from opportunity for neural network
   */
  private extractFeatures(opportunity: Opportunity): number[] {
    const features: number[] = [
      // Price and profit features
      opportunity.estimatedProfit,
      opportunity.estimatedProfitUSD,
      opportunity.confidence,
      opportunity.gasEstimate / 1000000, // Normalize gas
      
      // Time features
      (opportunity.expiresAt - opportunity.timestamp) / 1000, // Time to expiry in seconds
      (Date.now() - opportunity.timestamp) / 1000, // Age in seconds
      
      // Strategy type encoding (one-hot-like)
      opportunity.type === StrategyType.ARBITRAGE ? 1 : 0,
      opportunity.type === StrategyType.FLASH_LOAN ? 1 : 0,
      opportunity.type === StrategyType.MEV ? 1 : 0,
      opportunity.type === StrategyType.LIQUIDATION ? 1 : 0,
      
      // Risk level encoding
      opportunity.riskLevel === 'LOW' ? 1 : 0,
      opportunity.riskLevel === 'MEDIUM' ? 1 : 0,
      opportunity.riskLevel === 'HIGH' ? 1 : 0,
      
      // Market features
      opportunity.tokens.length,
      opportunity.dexes.length,
      
      // Chain features
      opportunity.chainId / 100, // Normalize chain ID
      
      // Time-based features
      new Date().getHours() / 24, // Hour of day normalized
      new Date().getDay() / 7, // Day of week normalized
      
      // Volatility proxy (using confidence inverse)
      1 - opportunity.confidence,
      
      // Profit margin
      opportunity.estimatedProfitUSD / Math.max(opportunity.gasEstimate * 0.00005, 1)
    ];

    return features;
  }

  /**
   * Predict probability of profitable trade
   */
  public async predictProfitProbability(opportunity: Opportunity): Promise<number> {
    if (!this.model) {
      logger.warn('Model not initialized, returning default probability');
      return opportunity.confidence;
    }

    try {
      const features = this.extractFeatures(opportunity);
      const inputTensor = tf.tensor2d([features], [1, 20]);
      
      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      const probability = (await prediction.data())[0];
      
      // Cleanup tensors
      inputTensor.dispose();
      prediction.dispose();
      
      return probability;
    } catch (error) {
      logger.error('Prediction error:', error);
      return opportunity.confidence;
    }
  }

  /**
   * Predict optimal flash loan amount based on opportunity
   */
  public async predictOptimalFlashLoanAmount(
    opportunity: Opportunity,
    baseAmount: number
  ): Promise<number> {
    const probability = await this.predictProfitProbability(opportunity);
    
    // Scale flash loan amount based on confidence
    // 40% confidence = base amount
    // 100% confidence = 5x base amount
    const minConfidence = 0.40;
    const maxMultiplier = 5.0;
    
    if (probability < minConfidence) {
      return 0; // Don't execute
    }
    
    const confidenceAboveMin = probability - minConfidence;
    const confidenceRange = 1.0 - minConfidence;
    const multiplier = 1 + (confidenceAboveMin / confidenceRange) * (maxMultiplier - 1);
    
    return baseAmount * multiplier;
  }

  /**
   * Add training data from executed trade
   */
  public addTrainingData(opportunity: Opportunity, result: TradeResult): void {
    const features = this.extractFeatures(opportunity);
    const label = result.success && (result.profitUSD || 0) > 0 ? 1 : 0;
    
    this.trainingData.push({ features, label });
    
    // Keep only recent data
    if (this.trainingData.length > this.maxTrainingData) {
      this.trainingData.shift();
    }
    
    // Auto-train when we have enough data
    if (this.trainingData.length % 1000 === 0 && this.trainingData.length >= 5000) {
      this.trainModel().catch(error => {
        logger.error('Auto-training failed:', error);
      });
    }
  }

  /**
   * Train the model with collected data
   */
  public async trainModel(): Promise<void> {
    if (!this.model || this.isTraining || this.trainingData.length < 1000) {
      return;
    }

    this.isTraining = true;
    logger.info(`Training neural network with ${this.trainingData.length} samples...`);

    try {
      // Prepare training data
      const features = this.trainingData.map(d => d.features);
      const labels = this.trainingData.map(d => d.label);
      
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels, [labels.length, 1]);
      
      // Train the model
      const history = await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: 128,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              logger.info(`Epoch ${epoch}: loss=${logs?.loss.toFixed(4)}, accuracy=${logs?.acc.toFixed(4)}`);
            }
          }
        }
      });
      
      // Cleanup
      xs.dispose();
      ys.dispose();
      
      const finalLoss = history.history.loss[history.history.loss.length - 1];
      const finalAcc = history.history.acc[history.history.acc.length - 1];
      
      logger.info(`Training completed: loss=${finalLoss.toFixed(4)}, accuracy=${finalAcc.toFixed(4)}`);
    } catch (error) {
      logger.error('Training error:', error);
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Save model to disk
   */
  public async saveModel(path: string = 'file://./models/trading-model'): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    try {
      await this.model.save(path);
      logger.info(`Model saved to ${path}`);
    } catch (error) {
      logger.error('Failed to save model:', error);
      throw error;
    }
  }

  /**
   * Load model from disk
   */
  public async loadModel(path: string = 'file://./models/trading-model'): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`${path}/model.json`);
      logger.info(`Model loaded from ${path}`);
    } catch (error) {
      logger.error('Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Get model performance metrics
   */
  public getMetrics(): {
    trainingDataSize: number;
    isTraining: boolean;
    modelInitialized: boolean;
  } {
    return {
      trainingDataSize: this.trainingData.length,
      isTraining: this.isTraining,
      modelInitialized: this.model !== null
    };
  }
}

export const neuralNetworkPredictor = new NeuralNetworkPredictor();
