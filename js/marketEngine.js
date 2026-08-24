/**
 * Real-Time Market Feed & Wave Engine
 * Produces smooth multi-candle market waves, realistic swings, and volume distribution
 */

import { ASSETS, TIMEFRAMES } from './config.js';

class MarketEngine {
  constructor() {
    this.assets = new Map();
    this.candles = new Map();
    this.subscribers = new Set();
    this.ws = null;
    this.isWsConnected = false;
    this.tickInterval = null;
    this.activeAssetId = 'XAUUSD';

    this._initializeAssets();
    this._generateSinusoidalWaveHistory();
    this._startLiveTickEngine();
    this._connectBinanceWebSocket();
  }

  _initializeAssets() {
    ASSETS.forEach(asset => {
      this.assets.set(asset.id, {
        ...asset,
        currentPrice: asset.basePrice,
        previousPrice: asset.basePrice,
        open24h: asset.basePrice * (1 + (Math.random() * 0.02 - 0.01)),
        high24h: asset.basePrice * 1.015,
        low24h: asset.basePrice * 0.985,
        volume24h: Math.floor(Math.random() * 50000) + 10000,
        change24h: 0,
        change24hPct: 0,
        direction: 'neutral',
        trendDirection: 1,
        waveProgress: 0,
        wavePeriod: 16, // 16 candles per cycle wave
        lastTickTime: Date.now()
      });
      this._update24hMetrics(asset.id);
    });
  }

  _update24hMetrics(assetId) {
    const asset = this.assets.get(assetId);
    if (!asset) return;
    asset.change24h = asset.currentPrice - asset.open24h;
    asset.change24hPct = (asset.change24h / asset.open24h) * 100;
    if (asset.currentPrice > asset.high24h) asset.high24h = asset.currentPrice;
    if (asset.currentPrice < asset.low24h) asset.low24h = asset.currentPrice;
  }

  _generateSinusoidalWaveHistory() {
    const numCandles = 250;
    const now = Date.now();

    ASSETS.forEach(asset => {
      TIMEFRAMES.forEach(tf => {
        const key = `${asset.id}_${tf.id}`;
        const candleDurationMs = tf.candleSeconds * 1000;
        const candleList = [];

        let currentPrice = asset.basePrice;
        const waveAmplitude = asset.basePrice * asset.volatility * 6;

        for (let i = numCandles; i >= 0; i--) {
          const timestamp = now - i * candleDurationMs;
          const phase = ((numCandles - i) / 14) * Math.PI; // Sinusoidal harmonic
          const waveSlope = Math.cos(phase);
          const noise = (Math.random() - 0.5) * (asset.basePrice * asset.volatility * 0.8);

          const open = currentPrice;
          const bodyStep = (waveSlope * (waveAmplitude / 7)) + noise;
          const close = open + bodyStep;

          const wickTop = Math.random() * (waveAmplitude * 0.18);
          const wickBottom = Math.random() * (waveAmplitude * 0.18);

          const high = Math.max(open, close) + wickTop;
          const low = Math.min(open, close) - wickBottom;

          // Realistic Volume bell curve
          const volume = Math.floor(Math.abs(bodyStep) * 45 + Math.random() * 25 + 15);

          currentPrice = close;

          candleList.push({
            time: timestamp,
            open: parseFloat(open.toFixed(asset.decimals)),
            high: parseFloat(high.toFixed(asset.decimals)),
            low: parseFloat(low.toFixed(asset.decimals)),
            close: parseFloat(close.toFixed(asset.decimals)),
            volume
          });
        }

        if (tf.id === '5m') {
          const last = candleList[candleList.length - 1];
          const assetObj = this.assets.get(asset.id);
          if (assetObj) {
            assetObj.currentPrice = last.close;
            assetObj.previousPrice = last.open;
          }
        }

        this.candles.set(key, candleList);
      });
    });
  }

  _connectBinanceWebSocket() {
    try {
      const streams = ['btcusdt@trade', 'ethusdt@trade', 'solusdt@trade'].join('/');
      const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => { this.isWsConnected = true; };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.s && data.p) {
            this._processTick(data.s, parseFloat(data.p), true);
          }
        } catch (e) {}
      };
      this.ws.onerror = () => { this.isWsConnected = false; };
      this.ws.onclose = () => {
        this.isWsConnected = false;
        setTimeout(() => this._connectBinanceWebSocket(), 5000);
      };
    } catch (e) {
      this.isWsConnected = false;
    }
  }

  _startLiveTickEngine() {
    this.tickInterval = setInterval(() => {
      ASSETS.forEach(asset => {
        if (asset.isLiveFeed && this.isWsConnected) return;

        const current = this.assets.get(asset.id);
        if (!current) return;

        current.waveProgress += 0.08;
        const waveSlope = Math.cos(current.waveProgress);
        const microVol = current.volatility * 0.15;
        const drift = waveSlope * microVol;
        const noise = (Math.random() - 0.5) * microVol * 0.6;
        const step = current.currentPrice * (drift + noise);
        const newPrice = Math.max(0.0001, current.currentPrice + step);

        this._processTick(asset.id, newPrice, false);
      });
    }, 200);
  }

  _processTick(assetId, price, isWsFeed) {
    const asset = this.assets.get(assetId);
    if (!asset) return;

    const prevPrice = asset.currentPrice;
    asset.previousPrice = prevPrice;
    asset.currentPrice = parseFloat(price.toFixed(asset.decimals));
    asset.direction = price > prevPrice ? 'up' : price < prevPrice ? 'down' : 'neutral';
    asset.lastTickTime = Date.now();
    this._update24hMetrics(assetId);

    TIMEFRAMES.forEach(tf => {
      const key = `${assetId}_${tf.id}`;
      const candleList = this.candles.get(key);
      if (!candleList || candleList.length === 0) return;

      const lastCandle = candleList[candleList.length - 1];
      const candleDurationMs = tf.candleSeconds * 1000;
      const now = Date.now();

      if (now - lastCandle.time >= candleDurationMs) {
        const newCandle = {
          time: now,
          open: lastCandle.close,
          high: Math.max(lastCandle.close, asset.currentPrice),
          low: Math.min(lastCandle.close, asset.currentPrice),
          close: asset.currentPrice,
          volume: 1
        };
        candleList.push(newCandle);
        if (candleList.length > 300) candleList.shift();
      } else {
        lastCandle.close = asset.currentPrice;
        if (asset.currentPrice > lastCandle.high) lastCandle.high = asset.currentPrice;
        if (asset.currentPrice < lastCandle.low) lastCandle.low = asset.currentPrice;
        lastCandle.volume += 1;
      }
    });

    this._notify({
      type: 'tick',
      assetId,
      price: asset.currentPrice,
      direction: asset.direction,
      asset,
      isWsFeed
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  _notify(data) {
    this.subscribers.forEach(cb => {
      try { cb(data); } catch (err) {}
    });
  }

  getAsset(assetId) {
    return this.assets.get(assetId);
  }

  getAllAssets() {
    return Array.from(this.assets.values());
  }

  getCandles(assetId, timeframeId) {
    const key = `${assetId}_${timeframeId}`;
    return this.candles.get(key) || [];
  }
}

export const marketEngine = new MarketEngine();
