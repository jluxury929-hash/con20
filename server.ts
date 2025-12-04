 // Get configuration
    this.app.get('/api/config', (req: Request, res: Response) => {
      try {
        res.json(config);
      } catch (error) {
        logger.error('Error getting config:', error);
        res.status(500).json({ error: 'Failed to get config' });
      }
    });

    // Get UHF engine metrics
    this.app.get('/api/uhf/metrics', async (req: Request, res: Response) => {
      try {
        const { ultraHighFrequencyEngine } = await import('../engine/ultraHighFrequencyEngine');
        const metrics = ultraHighFrequencyEngine.getMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Error getting UHF metrics:', error);
        res.status(500).json({ error: 'Failed to get UHF metrics' });
      }
    });

    // Withdraw profits
    this.app.post('/api/withdraw', async (req: Request, res: Response) => {
      try {
        const { autoWithdrawSystem } = await import('../profit/autoWithdraw');
        const { chainId, toAddress, amount } = req.body;

        if (!chainId || !toAddress || !amount) {
          return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await autoWithdrawSystem.withdrawTo(chainId, toAddress, amount);
        res.json(result);
      } catch (error) {
        logger.error('Error withdrawing:', error);
        res.status(500).json({ error: 'Failed to withdraw' });
      }
    });

    // Withdraw all profits
    this.app.post('/api/withdraw-all', async (req: Request, res: Response) => {
      try {
        const { autoWithdrawSystem } = await import('../profit/autoWithdraw');
        await autoWithdrawSystem.withdrawAll();
        res.json({
          success: true,
          message: 'All profits withdrawn'
        });
      } catch (error) {
        logger.error('Error withdrawing all:', error);
        res.status(500).json({ error: 'Failed to withdraw all' });
      }
    });

    // Get withdrawal statistics
    this.app.get('/api/withdraw/stats', async (req: Request, res: Response) => {
      try {
        const { autoWithdrawSystem } = await import('../profit/autoWithdraw');
        const stats = autoWithdrawSystem.getStatistics();
        res.json(stats);
      } catch (error) {
        logger.error('Error getting withdrawal stats:', error);
        res.status(500).json({ error: 'Failed to get withdrawal stats' });
      }
    });

    // Get AI model metrics
    this.app.get('/api/ai/model', async (req: Request, res: Response) => {
      try {
        const { neuralNetworkPredictor } = await import('../ai/neuralNetwork');
        const metrics = neuralNetworkPredictor.getMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Error getting AI model metrics:', error);
        res.status(500).json({ error: 'Failed to get AI model metrics' });
      }
    });

    // Train AI model manually
    this.app.post('/api/ai/train', async (req: Request, res: Response) => {
      try {
        const { neuralNetworkPredictor } = await import('../ai/neuralNetwork');
        await neuralNetworkPredictor.trainModel();
        res.json({
          success: true,
          message: 'AI model training started'
        });
      } catch (error) {
        logger.error('Error training AI model:', error);
        res.status(500).json({ error: 'Failed to train AI model' });
      }
    });

    // Get flash loan executor stats
    this.app.get('/api/flashloan/executor/stats', async (req: Request, res: Response) => {
      try {
        const { realFlashLoanExecutor } = await import('../flashloan/realFlashLoanExecutor');
        const stats = realFlashLoanExecutor.getStatistics();
        res.json(stats);
      } catch (error) {
        logger.error('Error getting flash loan executor stats:', error);
        res.status(500).json({ error: 'Failed to get flash loan executor stats' });
      }
    });// Stop trading engine
    this.app.post('/api/stop', async (req: Request, res: Response) => {
      try {
        if (!tradingEngine.isEngineRunning()) {
          return res.status(400).json({ error: 'Engine not running' });
        }

        await tradingEngine.stop();
        flashLoanEngine.stopScanning();

        res.json({
          success: true,
          message: 'Trading engine stopped',
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error('Error stopping engine:', error);
        res.status(500).json({ error: 'Failed to stop engine' });
      }
    });

    // Stop ultra-high-frequency engine
    this.app.post('/api/stop-uhf', async (req: Request, res: Response) => {
      try {
        const { ultraHighFrequencyEngine } = await import('../engine/ultraHighFrequencyEngine');
        const { autoWithdrawSystem } = await import('../profit/autoWithdraw');
        
        await ultraHighFrequencyEngine.stop();
        autoWithdrawSystem.stop();

        res.json({
          success: true,
          message: 'Ultra-high-frequency engine stopped',
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error('Error stopping UHF engine:', error);
        res.status(500).json({ error: 'Failed to stop UHF engine' });
      }
    }); Start trading engine
    this.app.post('/api/start', async (req: Request, res: Response) => {
      try {
        if (tradingEngine.isEngineRunning()) {
          return res.status(400).json({ error: 'Engine already running' });
        }

        await tradingEngine.start();
        flashLoanEngine.startScanning();

        res.json({
          success: true,
          message: 'Trading engine started',
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error('Error starting engine:', error);
        res.status(500).json({ error: 'Failed to start engine' });
      }
    });

    // Start ultra-high-frequency engine
    this.app.post('/api/start-uhf', async (req: Request, res: Response) => {
      try {
        const { ultraHighFrequencyEngine } = await import('../engine/ultraHighFrequencyEngine');
        const { autoWithdrawSystem } = await import('../profit/autoWithdraw');
        
        await ultraHighFrequencyEngine.start();
        autoWithdrawSystem.start(60);

        res.json({
          success: true,
          message: 'Ultra-high-frequency engine started',
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error('Error starting UHF engine:', error);
        res.status(500).json({ error: 'Failed to start UHF engine' });
      }
    });
Replacement applied successfully
