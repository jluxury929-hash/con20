
import { apiServer } from './api/server';
import { tradingEngine } from './engine/tradingEngine';
import { priceFeedAggregator } from './market/priceFeeds';
import { flashLoanEngine } from './flashloan/flashLoanEngine';
import { walletManager } from './blockchain/wallet';
import { blockchainProvider } from './blockchain/provider';
import logger from './utils/logger';
import { config } from './config';

// Banner
console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                                                               \u2551
\u2551   MASSIVE TRADING STRATEGY ENGINE                            \u2551
\u2551   Ultra-High-Speed Trading with AI Optimization              \u2551
\u2551                                                               \u2551
\u2551   \u2022 1000+ Strategies Across All Risk Levels                  \u2551
\u2551   \u2022 100,000+ Trades Per Second Capability                    \u2551
\u2551   \u2022 AI-Powered Decision Making                               \u2551
\u2551   \u2022 Flash Loan Opportunity Detection                         \u2551
\u2551   \u2022 Multi-Chain Support                                      \u2551
\u2551   \u2022 Real-Time Market Analysis                                \u2551
\u2551                                                               \u2551
\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d
`);

async function initialize(): Promise<void> {
  try {
    logger.info('Initializing Massive Trading Engine...');

    // Display configuration
    logger.info('Configuration:', {
      maxTradesPerSecond: config.trading.maxTradesPerSecond,
      maxActiveStrategies: config.strategies.maxActiveStrategies,
      enableFlashLoans: config.trading.enableFlashLoans,
      enableAI: config.ai.enableOptimization,
      environment: config.server.environment
    });

    // Check wallet
    if (walletManager.isInitialized()) {
      logger.info(`Wallet initialized: ${walletManager.getAddress()}`);
      
      // Get initial balances
      const balances = await walletManager.getAllBalances();
      logger.info('Initial balances:', balances);
    } else {
      logger.warn('Wallet not initialized - trading functionality limited');
    }

    // Check blockchain providers
    const providerHealth = blockchainProvider.getHealthStatus();
    logger.info('Blockchain provider health:', providerHealth);

    // Start API server
    apiServer.start();

    logger.info('System initialized successfully');
    logger.info(`API Server: http://localhost:${config.server.port}`);
    logger.info(`WebSocket Server: ws://localhost:${config.server.wsPort}`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info('  GET  /health                    - Health check');
    logger.info('  GET  /api/status                - System status');
    logger.info('  POST /api/start                 - Start trading engine');
    logger.info('  POST /api/stop                  - Stop trading engine');
    logger.info('  GET  /api/metrics               - Performance metrics');
    logger.info('  GET  /api/strategies            - List strategies');
    logger.info('  GET  /api/strategies/stats      - Strategy statistics');
    logger.info('  GET  /api/prices                - Current prices');
    logger.info('  GET  /api/arbitrage             - Arbitrage opportunities');
    logger.info('  GET  /api/flashloans            - Flash loan opportunities');
    logger.info('  GET  /api/wallet/balance        - Wallet balance');
    logger.info('  GET  /api/ai/performance        - AI performance metrics');
    logger.info('');
    logger.info('Ready to start trading! Use POST /api/start to begin.');

  } catch (error) {
    logger.error('Failed to initialize system:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('Shutting down...');

  try {
    // Stop trading engine
    if (tradingEngine.isEngineRunning()) {
      await tradingEngine.stop();
    }

    // Stop flash loan scanning
    flashLoanEngine.stopScanning();

    // Stop price feeds
    priceFeedAggregator.stop();

    // Stop API server
    apiServer.stop();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the system
initialize().catch((error) => {
  logger.error('Fatal error during initialization:', error);
  process.exit(1);
});

import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    wsPort: parseInt(process.env.WS_PORT || '3001'),
    environment: process.env.NODE_ENV || 'development'
  },
  trading: {
    maxTradesPerSecond: parseInt(process.env.MAX_TRADES_PER_SECOND || '100000'),
    minProfitThresholdUSD: parseFloat(process.env.MIN_PROFIT_THRESHOLD_USD || '1.0'),
    maxGasPriceGwei: parseInt(process.env.MAX_GAS_PRICE_GWEI || '100'),
    enableFlashLoans: process.env.ENABLE_FLASH_LOANS === 'true',
    flashLoanAmountETH: parseFloat(process.env.FLASH_LOAN_AMOUNT_ETH || '100')
  },
  risk: {
    maxPositionSizeETH: parseFloat(process.env.MAX_POSITION_SIZE_ETH || '10'),
    maxDailyLossETH: parseFloat(process.env.MAX_DAILY_LOSS_ETH || '5'),
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '2'),
    enableRiskLimits: process.env.ENABLE_RISK_LIMITS === 'true'
  },
  strategies: {
    enableLowRisk: process.env.ENABLE_LOW_RISK_STRATEGIES !== 'false',
    enableMediumRisk: process.env.ENABLE_MEDIUM_RISK_STRATEGIES !== 'false',
    enableHighRisk: process.env.ENABLE_HIGH_RISK_STRATEGIES === 'true',
    maxActiveStrategies: parseInt(process.env.MAX_ACTIVE_STRATEGIES || '1000'),
    rotationIntervalMs: parseInt(process.env.STRATEGY_ROTATION_INTERVAL_MS || '1000')
  },
  ai: {
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.75'),
    enableOptimization: process.env.ENABLE_AI_OPTIMIZATION !== 'false',
    retrainingIntervalHours: parseInt(process.env.AI_RETRAINING_INTERVAL_HOURS || '24')
  }
};

export const RPC_ENDPOINTS = {
  ethereum: [
    process.env.ETHEREUM_RPC_1,
    process.env.ETHEREUM_RPC_2,
    process.env.ETHEREUM_RPC_3,
    'https://rpc.ankr.com/eth',
    'https://eth.llamarpc.com'
  ].filter(Boolean) as string[],
  bsc: [
    process.env.BSC_RPC_1,
    process.env.BSC_RPC_2,
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed2.binance.org'
  ].filter(Boolean) as string[],
  polygon: [
    process.env.POLYGON_RPC_1,
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon'
  ].filter(Boolean) as string[],
  arbitrum: [
    process.env.ARBITRUM_RPC_1,
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum'
  ].filter(Boolean) as string[],
  optimism: [
    process.env.OPTIMISM_RPC_1,
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism'
  ].filter(Boolean) as string[]
};

export const DEX_ADDRESSES = {
  uniswapV2Router: process.env.UNISWAP_V2_ROUTER || '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  uniswapV3Router: process.env.UNISWAP_V3_ROUTER || '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  sushiswapRouter: process.env.SUSHISWAP_ROUTER || '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
  pancakeswapRouter: process.env.PANCAKESWAP_ROUTER || '0x10ED43C718714eb63d5aA57B78B54704E256024E'
};

export const FLASH_LOAN_PROVIDERS = {
  aaveLendingPool: process.env.AAVE_LENDING_POOL || '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
  dydxSoloMargin: process.env.DYDX_SOLO_MARGIN || '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e'
};

export const WALLET_CONFIG = {
  privateKey: process.env.WALLET_PRIVATE_KEY || '',
  address: process.env.WALLET_ADDRESS || ''
};

export const API_KEYS = {
  binance: {
    key: process.env.BINANCE_API_KEY || '',
    secret: process.env.BINANCE_API_SECRET || ''
  },
  coinbase: process.env.COINBASE_API_KEY || '',
  coingecko: process.env.COINGECKO_API_KEY || '',
  etherscan: process.env.ETHERSCAN_API_KEY || '',
  bscscan: process.env.BSCSCAN_API_KEY || ''
};

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EXTREME = 'EXTREME'
}

export enum StrategyType {
  ARBITRAGE = 'ARBITRAGE',
  MEV = 'MEV',
  LIQUIDATION = 'LIQUIDATION',
  FLASH_LOAN = 'FLASH_LOAN',
  MARKET_MAKING = 'MARKET_MAKING',
  TREND_FOLLOWING = 'TREND_FOLLOWING',
  MEAN_REVERSION = 'MEAN_REVERSION',
  MOMENTUM = 'MOMENTUM',
  STATISTICAL_ARBITRAGE = 'STATISTICAL_ARBITRAGE',
  TRIANGULAR_ARBITRAGE = 'TRIANGULAR_ARBITRAGE',
  CROSS_DEX = 'CROSS_DEX',
  CROSS_CHAIN = 'CROSS_CHAIN',
  SANDWICH = 'SANDWICH',
  FRONTRUN = 'FRONTRUN',
  BACKRUN = 'BACKRUN',
  JIT_LIQUIDITY = 'JIT_LIQUIDITY',
  VOLUME_ANALYSIS = 'VOLUME_ANALYSIS',
  ORDERBOOK_IMBALANCE = 'ORDERBOOK_IMBALANCE',
  FUNDING_RATE = 'FUNDING_RATE',
  BASIS_TRADING = 'BASIS_TRADING'
}

export enum ChainId {
  ETHEREUM = 1,
  BSC = 56,
  POLYGON = 137,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  AVALANCHE = 43114,
  FANTOM = 250
}

export interface Token {
  address: string;
  symbol: string;
  decimals: number;
  chainId: ChainId;
  name?: string;
  logoURI?: string;
}

export interface PriceData {
  token: string;
  price: number;
  timestamp: number;
  source: string;
  volume24h?: number;
  priceChange24h?: number;
  liquidity?: number;
}

export interface Opportunity {
  id: string;
  type: StrategyType;
  riskLevel: RiskLevel;
  estimatedProfit: number;
  estimatedProfitUSD: number;
  confidence: number;
  gasEstimate: number;
  tokens: Token[];
  dexes: string[];
  chainId: ChainId;
  timestamp: number;
  expiresAt: number;
  metadata: Record<string, any>;
}

export interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  riskLevel: RiskLevel;
  enabled: boolean;
  priority: number;
  minProfitUSD: number;
  maxGasPrice: number;
  successRate: number;
  totalTrades: number;
  profitabletrades: number;
  totalProfitUSD: number;
  averageExecutionTime: number;
  lastExecuted?: number;
  parameters: Record<string, any>;
  execute: (opportunity: Opportunity) => Promise<TradeResult>;
  analyze: () => Promise<Opportunity[]>;
}

export interface TradeResult {
  success: boolean;
  transactionHash?: string;
  profit?: number;
  profitUSD?: number;
  gasUsed?: number;
  executionTime: number;
  error?: string;
  timestamp: number;
}

export interface MarketData {
  prices: Map<string, PriceData>;
  volumes: Map<string, number>;
  liquidities: Map<string, number>;
  lastUpdate: number;
}

export interface FlashLoanOpportunity {
  id: string;
  loanAmount: number;
  loanToken: Token;
  estimatedProfit: number;
  estimatedProfitUSD: number;
  confidence: number;
  riskScore: number;
  steps: FlashLoanStep[];
  gasEstimate: number;
  timestamp: number;
}

export interface FlashLoanStep {
  action: 'SWAP' | 'BORROW' | 'REPAY' | 'TRANSFER';
  dex?: string;
  tokenIn?: Token;
  tokenOut?: Token;
  amountIn?: number;
  expectedAmountOut?: number;
  slippage?: number;
}

export interface AIDecision {
  shouldExecute: boolean;
  confidence: number;
  reasoning: string;
  recommendedStrategies: string[];
  riskAssessment: {
    overallRisk: RiskLevel;
    factors: string[];
    score: number;
  };
  expectedProfit: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfitUSD: number;
  totalLossUSD: number;
  netProfitUSD: number;
  averageTradeTime: number;
  tradesPerSecond: number;
  successRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  timestamp: number;
}

export interface SystemStatus {
  isRunning: boolean;
  activeStrategies: number;
  totalStrategies: number;
  tradesExecuted: number;
  opportunitiesFound: number;
  currentBalance: number;
  profitToday: number;
  uptime: number;
  performance: PerformanceMetrics;
  lastUpdate: number;
}

export interface Config {
  server: {
    port: number;
    wsPort: number;
    environment: string;
  };
  trading: {
    maxTradesPerSecond: number;
    minProfitThresholdUSD: number;
    maxGasPriceGwei: number;
    enableFlashLoans: boolean;
    flashLoanAmountETH: number;
  };
  risk: {
    maxPositionSizeETH: number;
    maxDailyLossETH: number;
    stopLossPercent: number;
    enableRiskLimits: boolean;
  };
  strategies: {
    enableLowRisk: boolean;
    enableMediumRisk: boolean;
    enableHighRisk: boolean;
    maxActiveStrategies: number;
    rotationIntervalMs: number;
  };
  ai: {
    confidenceThreshold: number;
    enableOptimization: boolean;
    retrainingIntervalHours: number;
  };
}
