
import { ethers } from 'ethers';
import { RPC_ENDPOINTS } from '../config';
import { ChainId } from '../types';
import logger from '../utils/logger';

export class BlockchainProvider {
  private providers: Map<ChainId, ethers.JsonRpcProvider[]> = new Map();
  private currentProviderIndex: Map<ChainId, number> = new Map();
  private providerHealth: Map<string, boolean> = new Map();

  constructor() {
    this.initializeProviders();
    this.startHealthChecks();
  }

  private initializeProviders(): void {
    // Ethereum
    const ethProviders = RPC_ENDPOINTS.ethereum.map(url => new ethers.JsonRpcProvider(url));
    this.providers.set(ChainId.ETHEREUM, ethProviders);
    this.currentProviderIndex.set(ChainId.ETHEREUM, 0);

    // BSC
    const bscProviders = RPC_ENDPOINTS.bsc.map(url => new ethers.JsonRpcProvider(url));
    this.providers.set(ChainId.BSC, bscProviders);
    this.currentProviderIndex.set(ChainId.BSC, 0);

    // Polygon
    const polygonProviders = RPC_ENDPOINTS.polygon.map(url => new ethers.JsonRpcProvider(url));
    this.providers.set(ChainId.POLYGON, polygonProviders);
    this.currentProviderIndex.set(ChainId.POLYGON, 0);

    // Arbitrum
    const arbitrumProviders = RPC_ENDPOINTS.arbitrum.map(url => new ethers.JsonRpcProvider(url));
    this.providers.set(ChainId.ARBITRUM, arbitrumProviders);
    this.currentProviderIndex.set(ChainId.ARBITRUM, 0);

    // Optimism
    const optimismProviders = RPC_ENDPOINTS.optimism.map(url => new ethers.JsonRpcProvider(url));
    this.providers.set(ChainId.OPTIMISM, optimismProviders);
    this.currentProviderIndex.set(ChainId.OPTIMISM, 0);

    logger.info('Blockchain providers initialized for all chains');
  }

  public getProvider(chainId: ChainId): ethers.JsonRpcProvider {
    const providers = this.providers.get(chainId);
    if (!providers || providers.length === 0) {
      throw new Error(`No providers available for chain ${chainId}`);
    }

    const currentIndex = this.currentProviderIndex.get(chainId) || 0;
    return providers[currentIndex];
  }

  public async getProviderWithFailover(chainId: ChainId): Promise<ethers.JsonRpcProvider> {
    const providers = this.providers.get(chainId);
    if (!providers || providers.length === 0) {
      throw new Error(`No providers available for chain ${chainId}`);
    }

    let attempts = 0;
    const maxAttempts = providers.length;

    while (attempts < maxAttempts) {
      const currentIndex = this.currentProviderIndex.get(chainId) || 0;
      const provider = providers[currentIndex];

      try {
        // Quick health check
        await provider.getBlockNumber();
        return provider;
      } catch (error) {
        logger.warn(`Provider ${currentIndex} for chain ${chainId} failed, switching to next`);
        
        // Move to next provider
        const nextIndex = (currentIndex + 1) % providers.length;
        this.currentProviderIndex.set(chainId, nextIndex);
        attempts++;
      }
    }

    throw new Error(`All providers failed for chain ${chainId}`);
  }

  private async startHealthChecks(): Promise<void> {
    setInterval(async () => {
      for (const [chainId, providers] of this.providers.entries()) {
        for (let i = 0; i < providers.length; i++) {
          const provider = providers[i];
          const key = `${chainId}-${i}`;
          
          try {
            await provider.getBlockNumber();
            this.providerHealth.set(key, true);
          } catch (error) {
            this.providerHealth.set(key, false);
            logger.warn(`Provider ${i} for chain ${chainId} health check failed`);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  public getHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.providerHealth.forEach((health, key) => {
      status[key] = health;
    });
    return status;
  }

  public async getGasPrice(chainId: ChainId): Promise<bigint> {
    const provider = await this.getProviderWithFailover(chainId);
    const feeData = await provider.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  public async getBlockNumber(chainId: ChainId): Promise<number> {
    const provider = await this.getProviderWithFailover(chainId);
    return await provider.getBlockNumber();
  }

  public async estimateGas(
    chainId: ChainId,
    transaction: ethers.TransactionRequest
  ): Promise<bigint> {
    const provider = await this.getProviderWithFailover(chainId);
    return await provider.estimateGas(transaction);
  }
}

export const blockchainProvider = new BlockchainProvider();
