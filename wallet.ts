
import { ethers } from 'ethers';
import { WALLET_CONFIG } from '../config';
import { blockchainProvider } from './provider';
import { ChainId } from '../types';
import logger from '../utils/logger';

export class WalletManager {
  private wallet: ethers.Wallet | null = null;
  private balances: Map<ChainId, bigint> = new Map();

  constructor() {
    this.initializeWallet();
  }

  private initializeWallet(): void {
    if (!WALLET_CONFIG.privateKey) {
      logger.warn('No private key configured - wallet functionality disabled');
      return;
    }

    try {
      this.wallet = new ethers.Wallet(WALLET_CONFIG.privateKey);
      logger.info(`Wallet initialized: ${this.wallet.address}`);
    } catch (error) {
      logger.error('Failed to initialize wallet:', error);
    }
  }

  public getAddress(): string {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    return this.wallet.address;
  }

  public async getBalance(chainId: ChainId): Promise<bigint> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      const provider = await blockchainProvider.getProviderWithFailover(chainId);
      const connectedWallet = this.wallet.connect(provider);
      const balance = await connectedWallet.provider.getBalance(this.wallet.address);
      this.balances.set(chainId, balance);
      return balance;
    } catch (error) {
      logger.error(`Failed to get balance for chain ${chainId}:`, error);
      return BigInt(0);
    }
  }

  public async getBalanceInEther(chainId: ChainId): Promise<string> {
    const balance = await this.getBalance(chainId);
    return ethers.formatEther(balance);
  }

  public async getAllBalances(): Promise<Record<string, string>> {
    const balances: Record<string, string> = {};
    
    const chains = [
      ChainId.ETHEREUM,
      ChainId.BSC,
      ChainId.POLYGON,
      ChainId.ARBITRUM,
      ChainId.OPTIMISM
    ];

    await Promise.all(
      chains.map(async (chainId) => {
        try {
          const balance = await this.getBalanceInEther(chainId);
          balances[ChainId[chainId]] = balance;
        } catch (error) {
          logger.error(`Failed to get balance for ${ChainId[chainId]}:`, error);
          balances[ChainId[chainId]] = '0.0';
        }
      })
    );

    return balances;
  }

  public async sendTransaction(
    chainId: ChainId,
    to: string,
    value: bigint,
    data?: string
  ): Promise<ethers.TransactionResponse> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    const provider = await blockchainProvider.getProviderWithFailover(chainId);
    const connectedWallet = this.wallet.connect(provider);

    const tx: ethers.TransactionRequest = {
      to,
      value,
      data: data || '0x'
    };

    logger.info(`Sending transaction on chain ${chainId}:`, {
      to,
      value: ethers.formatEther(value)
    });

    return await connectedWallet.sendTransaction(tx);
  }

  public async signMessage(message: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    return await this.wallet.signMessage(message);
  }

  public async estimateTransactionCost(
    chainId: ChainId,
    to: string,
    value: bigint,
    data?: string
  ): Promise<bigint> {
    const provider = await blockchainProvider.getProviderWithFailover(chainId);
    
    const tx: ethers.TransactionRequest = {
      to,
      value,
      data: data || '0x',
      from: this.wallet?.address
    };

    const gasEstimate = await provider.estimateGas(tx);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);

    return gasEstimate * gasPrice;
  }

  public isInitialized(): boolean {
    return this.wallet !== null;
  }

  public getCachedBalance(chainId: ChainId): bigint {
    return this.balances.get(chainId) || BigInt(0);
  }
}

export const walletManager = new WalletManager();
