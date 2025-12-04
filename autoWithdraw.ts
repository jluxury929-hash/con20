
import { ethers } from 'ethers';
import { ChainId } from '../types';
import { blockchainProvider } from '../blockchain/provider';
import { walletManager } from '../blockchain/wallet';
import logger from '../utils/logger';

export class AutoWithdrawSystem {
  private isRunning: boolean = false;
  private withdrawInterval: NodeJS.Timeout | null = null;
  private totalWithdrawn: number = 0;
  private withdrawCount: number = 0;
  private minWithdrawThreshold: number = 0.1; // Minimum 0.1 ETH to withdraw

  constructor() {
    logger.info('Auto-withdraw system initialized');
  }

  /**
   * Start automatic profit withdrawal
   */
  public start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      logger.warn('Auto-withdraw already running');
      return;
    }

    this.isRunning = true;
    
    // Run immediately
    this.checkAndWithdraw();

    // Then run on interval
    this.withdrawInterval = setInterval(() => {
      this.checkAndWithdraw();
    }, intervalMinutes * 60 * 1000);

    logger.info(`Auto-withdraw started (interval: ${intervalMinutes} minutes)`);
  }

  /**
   * Stop automatic withdrawal
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.withdrawInterval) {
      clearInterval(this.withdrawInterval);
      this.withdrawInterval = null;
    }

    logger.info('Auto-withdraw stopped');
  }

  /**
   * Check balance and withdraw if above threshold
   */
  private async checkAndWithdraw(): Promise<void> {
    try {
      logger.info('Checking balances for auto-withdrawal...');

      // Check Ethereum balance
      await this.withdrawFromChain(ChainId.ETHEREUM);
      
      // Check other chains
      await this.withdrawFromChain(ChainId.BSC);
      await this.withdrawFromChain(ChainId.POLYGON);
      await this.withdrawFromChain(ChainId.ARBITRUM);
      await this.withdrawFromChain(ChainId.OPTIMISM);

    } catch (error) {
      logger.error('Error in auto-withdraw check:', error);
    }
  }

  /**
   * Withdraw profits from a specific chain
   */
  private async withdrawFromChain(chainId: ChainId): Promise<void> {
    try {
      const balance = await walletManager.getBalance(chainId);
      const balanceInEther = Number(ethers.formatEther(balance));

      logger.info(`${ChainId[chainId]} balance: ${balanceInEther.toFixed(4)} ETH`);

      if (balanceInEther < this.minWithdrawThreshold) {
        logger.debug(`Balance below threshold on ${ChainId[chainId]}, skipping withdrawal`);
        return;
      }

      // Get destination wallet from environment
      const destinationWallet = process.env.PROFIT_WALLET_ADDRESS || process.env.WALLET_ADDRESS;
      
      if (!destinationWallet) {
        logger.error('No destination wallet configured');
        return;
      }

      // Calculate amount to withdraw (leave some for gas)
      const gasReserve = ethers.parseEther('0.05'); // Reserve 0.05 ETH for gas
      const withdrawAmount = balance - gasReserve;

      if (withdrawAmount <= BigInt(0)) {
        logger.debug('Insufficient balance after gas reserve');
        return;
      }

      logger.info(`Withdrawing ${ethers.formatEther(withdrawAmount)} ETH from ${ChainId[chainId]} to ${destinationWallet}`);

      // Execute withdrawal
      const tx = await walletManager.sendTransaction(
        chainId,
        destinationWallet,
        withdrawAmount
      );

      logger.info(`Withdrawal transaction submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        const withdrawnAmount = Number(ethers.formatEther(withdrawAmount));
        this.totalWithdrawn += withdrawnAmount;
        this.withdrawCount++;

        logger.info(`\u2705 Successfully withdrew ${withdrawnAmount.toFixed(4)} ETH from ${ChainId[chainId]}`);
        logger.info(`Total withdrawn: ${this.totalWithdrawn.toFixed(4)} ETH (${this.withdrawCount} withdrawals)`);
      } else {
        logger.error(`Withdrawal transaction failed on ${ChainId[chainId]}`);
      }

    } catch (error: any) {
      logger.error(`Error withdrawing from ${ChainId[chainId]}:`, error.message);
    }
  }

  /**
   * Manual withdrawal to specific address
   */
  public async withdrawTo(
    chainId: ChainId,
    toAddress: string,
    amount: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      logger.info(`Manual withdrawal: ${amount} ETH to ${toAddress} on ${ChainId[chainId]}`);

      const amountInWei = ethers.parseEther(amount);
      
      // Check balance
      const balance = await walletManager.getBalance(chainId);
      if (balance < amountInWei) {
        return {
          success: false,
          error: 'Insufficient balance'
        };
      }

      // Execute transaction
      const tx = await walletManager.sendTransaction(
        chainId,
        toAddress,
        amountInWei
      );

      logger.info(`Manual withdrawal transaction: ${tx.hash}`);

      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        this.totalWithdrawn += Number(amount);
        this.withdrawCount++;

        return {
          success: true,
          transactionHash: tx.hash
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed'
        };
      }

    } catch (error: any) {
      logger.error('Manual withdrawal error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Withdraw all profits from all chains
   */
  public async withdrawAll(): Promise<void> {
    logger.info('Withdrawing all profits from all chains...');

    await this.withdrawFromChain(ChainId.ETHEREUM);
    await this.withdrawFromChain(ChainId.BSC);
    await this.withdrawFromChain(ChainId.POLYGON);
    await this.withdrawFromChain(ChainId.ARBITRUM);
    await this.withdrawFromChain(ChainId.OPTIMISM);

    logger.info('All withdrawals completed');
  }

  /**
   * Set minimum withdrawal threshold
   */
  public setMinWithdrawThreshold(amount: number): void {
    this.minWithdrawThreshold = amount;
    logger.info(`Minimum withdrawal threshold set to ${amount} ETH`);
  }

  /**
   * Get withdrawal statistics
   */
  public getStatistics(): {
    totalWithdrawn: number;
    withdrawCount: number;
    averageWithdrawal: number;
    isRunning: boolean;
  } {
    return {
      totalWithdrawn: this.totalWithdrawn,
      withdrawCount: this.withdrawCount,
      averageWithdrawal: this.withdrawCount > 0 ? this.totalWithdrawn / this.withdrawCount : 0,
      isRunning: this.isRunning
    };
  }

  /**
   * Get current balances across all chains
   */
  public async getAllBalances(): Promise<Record<string, string>> {
    return await walletManager.getAllBalances();
  }
}

export const autoWithdrawSystem = new AutoWithdrawSystem();
