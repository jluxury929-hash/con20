
import { ethers } from 'ethers';
import { FlashLoanOpportunity, ChainId } from '../types';
import { blockchainProvider } from '../blockchain/provider';
import { walletManager } from '../blockchain/wallet';
import { neuralNetworkPredictor } from '../ai/neuralNetwork';
import { config, FLASH_LOAN_PROVIDERS } from '../config';
import logger from '../utils/logger';

// Aave V3 Pool ABI (simplified)
const AAVE_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external'
];

// Flash Loan Executor Contract ABI
const FLASH_LOAN_EXECUTOR_ABI = [
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  'function withdrawProfit(address token) external',
  'function withdrawETH() external'
];

export class RealFlashLoanExecutor {
  private executorContract: ethers.Contract | null = null;
  private aavePool: ethers.Contract | null = null;
  private executionCount: number = 0;
  private totalProfit: number = 0;
  private successfulExecutions: number = 0;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (!walletManager.isInitialized()) {
        logger.warn('Wallet not initialized - flash loan execution disabled');
        return;
      }

      const provider = await blockchainProvider.getProviderWithFailover(ChainId.ETHEREUM);
      const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY || '', provider);

      // Initialize Aave Pool contract
      this.aavePool = new ethers.Contract(
        FLASH_LOAN_PROVIDERS.aaveLendingPool,
        AAVE_POOL_ABI,
        signer
      );

      // Note: You need to deploy the FlashLoanExecutor contract first
      // and set the address in environment variables
      if (process.env.FLASH_LOAN_EXECUTOR_ADDRESS) {
        this.executorContract = new ethers.Contract(
          process.env.FLASH_LOAN_EXECUTOR_ADDRESS,
          FLASH_LOAN_EXECUTOR_ABI,
          signer
        );
        logger.info('Real flash loan executor initialized');
      } else {
        logger.warn('Flash loan executor contract not deployed - set FLASH_LOAN_EXECUTOR_ADDRESS');
      }
    } catch (error) {
      logger.error('Failed to initialize flash loan executor:', error);
    }
  }

  /**
   * Execute a real flash loan with AI-optimized amount
   */
  public async executeFlashLoan(opportunity: FlashLoanOpportunity): Promise<{
    success: boolean;
    profit?: number;
    transactionHash?: string;
    error?: string;
  }> {
    if (!this.executorContract || !this.aavePool) {
      return {
        success: false,
        error: 'Flash loan executor not initialized'
      };
    }

    try {
      // Use AI to predict profit probability
      const aiProbability = await neuralNetworkPredictor.predictProfitProbability({
        id: opportunity.id,
        type: 'FLASH_LOAN' as any,
        riskLevel: 'MEDIUM' as any,
        estimatedProfit: opportunity.estimatedProfit,
        estimatedProfitUSD: opportunity.estimatedProfitUSD,
        confidence: opportunity.confidence,
        gasEstimate: opportunity.gasEstimate,
        tokens: [],
        dexes: [],
        chainId: ChainId.ETHEREUM,
        timestamp: opportunity.timestamp,
        expiresAt: opportunity.timestamp + 10000,
        metadata: {}
      });

      logger.info(`AI predicted profit probability: ${(aiProbability * 100).toFixed(2)}%`);

      // Only execute if AI confidence is above threshold (40%)
      if (aiProbability < 0.40) {
        logger.info('AI confidence too low, skipping flash loan');
        return {
          success: false,
          error: 'AI confidence below threshold'
        };
      }

      // Calculate optimal flash loan amount based on AI confidence
      const optimalAmount = await neuralNetworkPredictor.predictOptimalFlashLoanAmount(
        {
          id: opportunity.id,
          type: 'FLASH_LOAN' as any,
          riskLevel: 'MEDIUM' as any,
          estimatedProfit: opportunity.estimatedProfit,
          estimatedProfitUSD: opportunity.estimatedProfitUSD,
          confidence: opportunity.confidence,
          gasEstimate: opportunity.gasEstimate,
          tokens: [],
          dexes: [],
          chainId: ChainId.ETHEREUM,
          timestamp: opportunity.timestamp,
          expiresAt: opportunity.timestamp + 10000,
          metadata: {}
        },
        opportunity.loanAmount
      );

      if (optimalAmount === 0) {
        return {
          success: false,
          error: 'Optimal amount is zero'
        };
      }

      logger.info(`Executing flash loan: ${optimalAmount} ETH (AI confidence: ${(aiProbability * 100).toFixed(2)}%)`);

      // Encode parameters for the flash loan
      const params = this.encodeFlashLoanParams(opportunity);

      // Get WETH address (Ethereum mainnet)
      const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

      // Convert ETH amount to Wei
      const amountInWei = ethers.parseEther(optimalAmount.toString());

      // Estimate gas
      const gasEstimate = await this.executorContract.executeFlashLoan.estimateGas(
        WETH_ADDRESS,
        amountInWei,
        params
      );

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

      // Get current gas price
      const feeData = await blockchainProvider.getProvider(ChainId.ETHEREUM).getFeeData();
      const gasPrice = feeData.gasPrice;

      // Check if gas price is acceptable
      const gasPriceGwei = Number(gasPrice) / 1e9;
      if (gasPriceGwei > config.trading.maxGasPriceGwei) {
        logger.warn(`Gas price too high: ${gasPriceGwei} gwei`);
        return {
          success: false,
          error: 'Gas price too high'
        };
      }

      // Execute the flash loan
      const tx = await this.executorContract.executeFlashLoan(
        WETH_ADDRESS,
        amountInWei,
        params,
        {
          gasLimit,
          gasPrice
        }
      );

      logger.info(`Flash loan transaction submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        // Parse profit from events
        const profit = await this.calculateProfit(receipt);
        
        this.executionCount++;
        this.successfulExecutions++;
        this.totalProfit += profit;

        logger.info(`Flash loan executed successfully! Profit: ${profit} ETH`);

        // Automatically withdraw profits
        await this.withdrawProfits();

        return {
          success: true,
          profit,
          transactionHash: tx.hash
        };
      } else {
        logger.error('Flash loan transaction failed');
        this.executionCount++;
        return {
          success: false,
          error: 'Transaction failed'
        };
      }
    } catch (error: any) {
      logger.error('Flash loan execution error:', error);
      this.executionCount++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Encode parameters for flash loan execution
   */
  private encodeFlashLoanParams(opportunity: FlashLoanOpportunity): string {
    // Extract swap path from opportunity steps
    const path: string[] = [];
    const dexes: string[] = [];
    const minAmounts: bigint[] = [];

    for (const step of opportunity.steps) {
      if (step.action === 'SWAP') {
        if (step.tokenIn) path.push(step.tokenIn.address);
        if (step.tokenOut) path.push(step.tokenOut.address);
        if (step.dex) dexes.push(step.dex);
        
        const minAmount = step.expectedAmountOut 
          ? ethers.parseEther((step.expectedAmountOut * 0.98).toString()) // 2% slippage
          : BigInt(0);
        minAmounts.push(minAmount);
      }
    }

    // Encode parameters
    const abiCoder = new ethers.AbiCoder();
    return abiCoder.encode(
      ['address[]', 'address[]', 'uint256[]'],
      [path, dexes, minAmounts]
    );
  }

  /**
   * Calculate profit from transaction receipt
   */
  private async calculateProfit(receipt: any): Promise<number> {
    try {
      // Parse FlashLoanExecuted event
      const iface = new ethers.Interface([
        'event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 profit, uint256 timestamp)'
      ]);

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === 'FlashLoanExecuted') {
            return Number(ethers.formatEther(parsed.args.profit));
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }

      return 0;
    } catch (error) {
      logger.error('Error calculating profit:', error);
      return 0;
    }
  }

  /**
   * Automatically withdraw profits to main wallet
   */
  public async withdrawProfits(): Promise<void> {
    if (!this.executorContract) {
      return;
    }

    try {
      logger.info('Withdrawing profits from flash loan executor...');

      // Withdraw WETH
      const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const tx1 = await this.executorContract.withdrawProfit(WETH_ADDRESS);
      await tx1.wait();
      logger.info('WETH profits withdrawn');

      // Withdraw ETH
      const tx2 = await this.executorContract.withdrawETH();
      await tx2.wait();
      logger.info('ETH profits withdrawn');

    } catch (error) {
      logger.error('Error withdrawing profits:', error);
    }
  }

  /**
   * Check if flash loan execution is available
   */
  public isAvailable(): boolean {
    return this.executorContract !== null && this.aavePool !== null;
  }

  /**
   * Get execution statistics
   */
  public getStatistics(): {
    executionCount: number;
    successfulExecutions: number;
    totalProfit: number;
    successRate: number;
    averageProfit: number;
  } {
    return {
      executionCount: this.executionCount,
      successfulExecutions: this.successfulExecutions,
      totalProfit: this.totalProfit,
      successRate: this.executionCount > 0 ? this.successfulExecutions / this.executionCount : 0,
      averageProfit: this.successfulExecutions > 0 ? this.totalProfit / this.successfulExecutions : 0
    };
  }
}

export const realFlashLoanExecutor = new RealFlashLoanExecutor();
