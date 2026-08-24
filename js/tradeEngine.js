/**
 * Trading & Execution Engine
 * Supports Fixed Time Trades (Options) & CFD Positions with real-time settlement
 */

import { soundEngine } from './soundEngine.js';

export class TradeEngine {
  constructor(marketEngine, portfolioManager) {
    this.marketEngine = marketEngine;
    this.portfolioManager = portfolioManager;
    this.activeTrades = [];
    this.closedTrades = [];
    this.listeners = new Set();

    this.marketEngine.subscribe((event) => {
      if (event.type === 'tick') {
        this._checkActiveTrades(event);
      }
    });

    setInterval(() => this._tickExpirationCheck(), 200);
  }

  openOptionTrade({ assetId, symbol, strikePrice, amount, durationSeconds, direction, payoutPercent }) {
    return this.placeFTTTrade({
      assetId,
      direction: direction.toLowerCase(),
      amount,
      durationSeconds
    });
  }

  placeFTTTrade({ assetId, direction, amount, durationSeconds }) {
    const asset = this.marketEngine.getAsset(assetId);
    if (!asset) return null;

    if (!this.portfolioManager.deductBalance(amount)) {
      return null;
    }

    const now = Date.now();
    const trade = {
      id: 'FTT_' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      type: 'FTT',
      assetId,
      symbol: asset.symbol,
      direction: direction.toUpperCase(),
      amount,
      strikePrice: asset.currentPrice,
      currentPrice: asset.currentPrice,
      payoutRate: asset.payout || 90,
      potentialPayout: Math.round(amount * (1 + (asset.payout || 90) / 100) * 100) / 100,
      createdAt: now,
      expiryTime: now + durationSeconds * 1000,
      durationSeconds,
      status: 'active'
    };

    this.activeTrades.unshift(trade);
    soundEngine.playOrderPlaced();
    this._notify('trade_placed', trade);

    return trade;
  }

  _checkActiveTrades(event) {
    this.activeTrades.forEach(trade => {
      if (trade.assetId === event.assetId) {
        trade.currentPrice = event.price;
      }
    });
    this._notify('trades_updated', this.activeTrades);
  }

  _tickExpirationCheck() {
    const now = Date.now();
    const expiredFTT = [];

    for (let i = this.activeTrades.length - 1; i >= 0; i--) {
      const trade = this.activeTrades[i];
      if (now >= trade.expiryTime) {
        expiredFTT.push(trade);
        this.activeTrades.splice(i, 1);
      }
    }

    expiredFTT.forEach(trade => this._settleTrade(trade));

    if (expiredFTT.length > 0) {
      this._notify('trades_updated', this.activeTrades);
    }
  }

  _settleTrade(trade) {
    const asset = this.marketEngine.getAsset(trade.assetId);
    const closePrice = asset ? asset.currentPrice : trade.currentPrice;
    trade.closePrice = closePrice;
    trade.closedAt = Date.now();

    let isWin = false;
    let profit = 0;
    let payout = 0;

    if (trade.direction === 'UP') {
      if (closePrice > trade.strikePrice) {
        isWin = true;
        payout = trade.potentialPayout;
        profit = payout - trade.amount;
      }
    } else {
      // DOWN
      if (closePrice < trade.strikePrice) {
        isWin = true;
        payout = trade.potentialPayout;
        profit = payout - trade.amount;
      }
    }

    trade.status = isWin ? 'won' : 'lost';
    trade.profit = profit;
    trade.payout = payout;

    if (payout > 0) {
      this.portfolioManager.addBalance(payout);
    }

    this.closedTrades.unshift(trade);

    this._notify('trade_settled', {
      trade,
      isWin,
      profit
    });
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
        if (typeof data === 'object' && !data.type) {
          cb({ type, ...data });
        } else {
          cb({ type, data });
        }
      } catch (e) {}
    });
  }
}
