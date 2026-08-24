/**
 * Olymp Trade Pro - Main Application Entrypoint
 */

import { marketEngine } from './marketEngine.js';
import { ChartEngine } from './chartEngine.js';
import { TradeEngine } from './tradeEngine.js';
import { PortfolioManager } from './portfolioManager.js';
import { UIController } from './uiController.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Portfolio
  const portfolioManager = new PortfolioManager();

  // 2. Initialize Trading Engine
  const tradeEngine = new TradeEngine(marketEngine, portfolioManager);

  // 3. Initialize High-Performance Chart Engine
  const canvas = document.getElementById('mainChartCanvas');
  const chartEngine = new ChartEngine(canvas, marketEngine, tradeEngine);

  // 4. Initialize UI Controller
  const uiController = new UIController(marketEngine, chartEngine, tradeEngine, portfolioManager);

  // Expose UI controller and global trade closure for table actions
  window._uiController = uiController;
  window._closeTrade = (tradeId, tradeType) => {
    if (tradeType === 'FTT') {
      tradeEngine.earlyCloseFTTTrade(tradeId);
    } else {
      tradeEngine.closeCFDTrade(tradeId);
    }
  };

  // Welcome Toast
  setTimeout(() => {
    uiController.showToast('🚀 Welcome to Olymp Trade Pro! Live market feed connected.', 'success');
  }, 600);
});
