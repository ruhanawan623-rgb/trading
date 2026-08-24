/**
 * Olymp Trade Pro - Trading & Execution Engine
 * Supports Fixed Time Trades (FTT / Binary Options) & Forex CFD Multipliers
 */

import { soundEngine } from './soundEngine.js';

export class TradeEngine {
  constructor(marketEngine, portfolioManager) {
    this.marketEngine = marketEngine;
    this.portfolioManager = portfolioManager;
    this.activeTrades = [];
    this.closedTrades = [];
    this.listeners = new Set();

    // Check trades on every tick
    this.marketEngine.subscribe((event) => {
      if (event.type === 'tick') {
        this._checkActiveTrades(event);
      }
    });

    // Check timer loop every 200ms for FTT expiration accuracy
    setInterval(() => this._tickExpirationCheck(), 200);
  }

  placeFTTTrade({ assetId, direction, amount, durationSeconds }) {
    const asset = this.marketEngine.getAsset(assetId);
    if (!asset) throw new Error('Invalid asset');

    if (!this.portfolioManager.deductBalance(amount)) {
      throw new Error('Insufficient balance');
    }

    const now = Date.now();
    const trade = {
      id: 'FTT_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      type: 'FTT',
      assetId,
      assetSymbol: asset.symbol,
      direction, // 'up' or 'down'
      amount,
      strikePrice: asset.currentPrice,
      currentPrice: asset.currentPrice,
      payoutRate: asset.payout,
      potentialPayout: Math.round(amount * (1 + asset.payout / 100) * 100) / 100,
      createdAt: now,
      expiresAt: now + durationSeconds * 1000,
      durationSeconds,
      status: 'active', // 'active', 'won', 'lost', 'tie'
      isDemo: this.portfolioManager.isDemoAccount
    };

    this.activeTrades.unshift(trade);
    soundEngine.playOrderPlaced();
    this._notify('trade_placed', trade);

    return trade;
  }

  placeCFDTrade({ assetId, direction, amount, leverage, takeProfit, stopLoss }) {
    const asset = this.marketEngine.getAsset(assetId);
    if (!asset) throw new Error('Invalid asset');

    if (!this.portfolioManager.deductBalance(amount)) {
      throw new Error('Insufficient balance');
    }

    const now = Date.now();
    const trade = {
      id: 'CFD_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      type: 'CFD',
      assetId,
      assetSymbol: asset.symbol,
      direction, // 'buy' or 'sell'
      amount,
      leverage,
      entryPrice: asset.currentPrice,
      currentPrice: asset.currentPrice,
      takeProfit: takeProfit || null,
      stopLoss: stopLoss || null,
      pnl: 0,
      pnlPct: 0,
      createdAt: now,
      status: 'active',
      isDemo: this.portfolioManager.isDemoAccount
    };

    this.activeTrades.unshift(trade);
    soundEngine.playOrderPlaced();
    this._notify('trade_placed', trade);

    return trade;
  }

  // Early Cashout / Sellout for FTT trade
  earlyCloseFTTTrade(tradeId) {
    const index = this.activeTrades.findIndex(t => t.id === tradeId);
    if (index === -1) return;

    const trade = this.activeTrades[index];
    const asset = this.marketEngine.getAsset(trade.assetId);
    if (!asset) return;

    const isWinning = trade.direction === 'up' 
      ? asset.currentPrice > trade.strikePrice 
      : asset.currentPrice < trade.strikePrice;

    const remainingRatio = Math.max(0, (trade.expiresAt - Date.now()) / (trade.durationSeconds * 1000));
    let cashoutAmount = 0;

    if (isWinning) {
      cashoutAmount = trade.amount + (trade.potentialPayout - trade.amount) * (1 - remainingRatio * 0.5);
    } else {
      cashoutAmount = trade.amount * (remainingRatio * 0.4);
    }
    cashoutAmount = Math.round(cashoutAmount * 100) / 100;

    // Settle early
    trade.status = cashoutAmount >= trade.amount ? 'won' : 'lost';
    trade.closedAt = Date.now();
    trade.closePrice = asset.currentPrice;
    trade.profit = Math.round((cashoutAmount - trade.amount) * 100) / 100;
    trade.cashoutAmount = cashoutAmount;
    trade.isEarlyClosed = true;

    this.activeTrades.splice(index, 1);
    this.closedTrades.unshift(trade);
    this.portfolioManager.addBalance(cashoutAmount);

    if (trade.profit >= 0) soundEngine.playWin();
    else soundEngine.playLoss();

    this._notify('trade_closed', trade);
  }

  // Close CFD Position
  closeCFDTrade(tradeId) {
    const index = this.activeTrades.findIndex(t => t.id === tradeId);
    if (index === -1) return;

    const trade = this.activeTrades[index];
    const asset = this.marketEngine.getAsset(trade.assetId);
    if (!asset) return;

    trade.closePrice = asset.currentPrice;
    trade.closedAt = Date.now();
    trade.profit = trade.pnl;
    trade.status = trade.profit >= 0 ? 'won' : 'lost';

    const returnFunds = Math.max(0, trade.amount + trade.pnl);
    this.portfolioManager.addBalance(returnFunds);

    this.activeTrades.splice(index, 1);
    this.closedTrades.unshift(trade);

    if (trade.profit >= 0) soundEngine.playWin();
    else soundEngine.playLoss();

    this._notify('trade_closed', trade);
  }

  _checkActiveTrades(event) {
    const now = Date.now();

    this.activeTrades.forEach(trade => {
      if (trade.assetId === event.assetId) {
        trade.currentPrice = event.price;

        if (trade.type === 'CFD') {
          // Calculate floating P&L
          const priceChange = (event.price - trade.entryPrice) / trade.entryPrice;
          const multiplier = trade.direction === 'buy' ? 1 : -1;
          trade.pnlPct = priceChange * multiplier * trade.leverage * 100;
          trade.pnl = Math.round((trade.amount * (trade.pnlPct / 100)) * 100) / 100;

          // Check Stop Loss & Take Profit
          if (trade.stopLoss && trade.pnl <= -trade.stopLoss) {
            this.closeCFDTrade(trade.id);
          } else if (trade.takeProfit && trade.pnl >= trade.takeProfit) {
            this.closeCFDTrade(trade.id);
          }
        }
      }
    });

    this._notify('trades_updated', this.activeTrades);
  }

  _tickExpirationCheck() {
    const now = Date.now();
    const expiredFTT = [];

    for (let i = this.activeTrades.length - 1; i >= 0; i--) {
      const trade = this.activeTrades[i];
      if (trade.type === 'FTT' && now >= trade.expiresAt) {
        expiredFTT.push(trade);
        this.activeTrades.splice(i, 1);
      }
    }

    expiredFTT.forEach(trade => this._settleFTTTrade(trade));

    if (expiredFTT.length > 0) {
      this._notify('trades_updated', this.activeTrades);
    }
  }

  _settleFTTTrade(trade) {
    const asset = this.marketEngine.getAsset(trade.assetId);
    const closePrice = asset ? asset.currentPrice : trade.currentPrice;
    trade.closePrice = closePrice;
    trade.closedAt = Date.now();

    let profit = 0;
    let payout = 0;

    if (trade.direction === 'up') {
      if (closePrice > trade.strikePrice) {
        trade.status = 'won';
        payout = trade.potentialPayout;
        profit = payout - trade.amount;
      } else if (closePrice < trade.strikePrice) {
        trade.status = 'lost';
        payout = 0;
        profit = -trade.amount;
      } else {
        trade.status = 'tie';
        payout = trade.amount;
        profit = 0;
      }
    } else {
      // DOWN trade
      if (closePrice < trade.strikePrice) {
        trade.status = 'won';
        payout = trade.potentialPayout;
        profit = payout - trade.amount;
      } else if (closePrice > trade.strikePrice) {
        trade.status = 'lost';
        payout = 0;
        profit = -trade.amount;
      } else {
        trade.status = 'tie';
        payout = trade.amount;
        profit = 0;
      }
    }

    trade.profit = Math.round(profit * 100) / 100;
    trade.payout = Math.round(payout * 100) / 100;

    if (payout > 0) {
      this.portfolioManager.addBalance(payout);
    }

    this.closedTrades.unshift(trade);

    if (trade.status === 'won') {
      soundEngine.playWin();
    } else if (trade.status === 'lost') {
      soundEngine.playLoss();
    }

    this._notify('trade_settled', trade);
  }

  getActiveTrades(assetId) {
    if (!assetId) return this.activeTrades;
    return this.activeTrades.filter(t => t.assetId === assetId);
  }

  getClosedTrades() {
    return this.closedTrades;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(type, data) {
    this.listeners.forEach(cb => {
      try {
        cb({ type, data });
      } catch (e) {
        console.error('Trade engine listener error:', e);
      }
    });
  }
}
