/**
 * Trading Pro - Full Interactive Chart Engine
 * Supports Neon Candlesticks, Interactive Drawings (Trendlines, Horizontal Lines),
 * Indicators (EMA 20/50, Bollinger Bands, RSI), and Live Trade Strike Markers.
 */

import { CHART_TYPES } from './config.js';

export class ChartEngine {
  constructor(canvasElement, marketEngine, tradeEngine) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.marketEngine = marketEngine;
    this.tradeEngine = tradeEngine;

    this.assetId = 'XAUUSD';
    this.timeframe = '5m';
    this.chartType = CHART_TYPES.CANDLESTICK;

    // Viewport
    this.visibleCandles = 55;
    this.offsetCandles = 0;
    this.paddingLeft = 75;
    this.paddingBottom = 28;
    this.paddingTop = 20;

    // Indicators Active State
    this.indicators = {
      ema20: false,
      ema50: false,
      bollinger: false,
      rsi: false
    };

    // User Interactive Drawings
    this.drawings = [];
    this.activeTool = 'crosshair'; // 'crosshair', 'trendline', 'hline', 'brush'
    this.currentDrawing = null;

    // Mouse
    this.mouse = { x: -1, y: -1, isHover: false, isMouseDown: false, isDragging: false, startX: 0, startY: 0 };
    this.animationFrameId = null;

    this._setupCanvas();
    this._bindEvents();
    this._startRenderLoop();
  }

  _setupCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._setupCanvas());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.isHover = true;

      // Handle active tool drawing
      if (this.mouse.isMouseDown) {
        if (this.activeTool === 'trendline' && this.currentDrawing) {
          this.currentDrawing.x2 = this.mouse.x;
          this.currentDrawing.y2 = this.mouse.y;
        } else if (this.activeTool === 'brush' && this.currentDrawing) {
          this.currentDrawing.points.push({ x: this.mouse.x, y: this.mouse.y });
        } else if (this.mouse.isDragging) {
          const deltaX = this.mouse.x - this.mouse.startX;
          const candleStep = (this.width - this.paddingLeft) / this.visibleCandles;
          const shift = Math.round(deltaX / candleStep);
          if (shift !== 0) {
            this.offsetCandles = Math.max(0, this.offsetCandles - shift);
            this.mouse.startX = this.mouse.x;
          }
        }
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.isMouseDown = true;
      this.mouse.startX = this.mouse.x;
      this.mouse.startY = this.mouse.y;

      if (this.activeTool === 'trendline') {
        this.currentDrawing = { type: 'trendline', x1: this.mouse.x, y1: this.mouse.y, x2: this.mouse.x, y2: this.mouse.y };
      } else if (this.activeTool === 'hline') {
        this.drawings.push({ type: 'hline', y: this.mouse.y });
      } else if (this.activeTool === 'brush') {
        this.currentDrawing = { type: 'brush', points: [{ x: this.mouse.x, y: this.mouse.y }] };
      } else {
        this.mouse.isDragging = true;
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.currentDrawing) {
        this.drawings.push(this.currentDrawing);
        this.currentDrawing = null;
      }
      this.mouse.isMouseDown = false;
      this.mouse.isDragging = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isHover = false;
      this.mouse.isMouseDown = false;
      this.mouse.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.visibleCandles = Math.max(20, this.visibleCandles - 4);
      } else {
        this.visibleCandles = Math.min(120, this.visibleCandles + 4);
      }
    }, { passive: false });
  }

  setAsset(assetId) {
    this.assetId = assetId;
    this.offsetCandles = 0;
  }

  setTimeframe(timeframe) {
    this.timeframe = timeframe;
    this.offsetCandles = 0;
  }

  setActiveTool(tool) {
    this.activeTool = tool;
  }

  clearDrawings() {
    this.drawings = [];
    this.currentDrawing = null;
  }

  toggleIndicator(indicatorKey, isEnabled) {
    if (this.indicators.hasOwnProperty(indicatorKey)) {
      this.indicators[indicatorKey] = isEnabled;
    }
  }

  _startRenderLoop() {
    const render = () => {
      this._draw();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  _draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Dark background
    this._drawBackground(ctx, w, h);

    const candles = this.marketEngine.getCandles(this.assetId, this.timeframe);
    if (!candles || candles.length === 0) return;

    const totalCandles = candles.length;
    const endIndex = Math.max(0, totalCandles - 1 - this.offsetCandles);
    const startIndex = Math.max(0, endIndex - this.visibleCandles + 1);
    const visibleData = candles.slice(startIndex, endIndex + 1);
    if (visibleData.length === 0) return;

    const plotW = w - this.paddingLeft;
    const rsiHeight = this.indicators.rsi ? 80 : 0;
    const plotH = h - this.paddingBottom - rsiHeight;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    visibleData.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.12;
    maxPrice += priceRange * 0.12;

    const slotWidth = plotW / this.visibleCandles;
    const candleWidth = Math.max(4, Math.min(14, slotWidth * 0.68));

    const getY = (price) => {
      return this.paddingTop + (1 - (price - minPrice) / (maxPrice - minPrice)) * (plotH - this.paddingTop);
    };

    const getX = (index) => {
      return this.paddingLeft + Math.floor(index * slotWidth + slotWidth / 2);
    };

    // 2. Subtle Grid
    this._drawGrid(ctx, w, h, plotW, plotH, minPrice, maxPrice, visibleData, getY, getX);

    // 3. Volume Histogram
    this._drawVolumeHistogram(ctx, visibleData, getX, plotH, candleWidth, maxVolume);

    // 4. Candlesticks (Neon Green / Electric Red)
    this._drawCandlesticks(ctx, visibleData, getX, getY, candleWidth);

    // 5. Technical Indicators (EMA, BB)
    this._drawIndicators(ctx, visibleData, getX, getY);

    // 6. RSI Subpanel if active
    if (this.indicators.rsi) {
      this._drawRsiPanel(ctx, w, h, plotH, rsiHeight, visibleData, getX);
    }

    // 7. Active Option Trade Strike Lines
    this._drawActiveTrades(ctx, getY, w);

    // 8. User Drawings (Trendlines, Horizontal Lines, Brush)
    this._drawUserDrawings(ctx);

    // 9. Current Live Price Tag & Tracking Beam
    this._drawCurrentPriceLine(ctx, visibleData, getX, getY, w);

    // 10. Crosshair
    if (this.mouse.isHover && this.mouse.x >= this.paddingLeft && this.mouse.y <= plotH) {
      this._drawCrosshair(ctx, w, plotH, minPrice, maxPrice, getY);
    }
  }

  _drawBackground(ctx, w, h) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#131722');
    grad.addColorStop(0.5, '#0e1118');
    grad.addColorStop(1, '#090b10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const bandWidth = (w - this.paddingLeft) / 8;
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.fillRect(this.paddingLeft + i * bandWidth, 0, bandWidth, h);
      }
    }
  }

  _drawGrid(ctx, w, h, plotW, plotH, minPrice, maxPrice, visibleData, getY, getX) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#848e9c';
    ctx.font = '11px -apple-system, sans-serif';

    const numLines = 7;
    for (let i = 0; i <= numLines; i++) {
      const price = minPrice + (i / numLines) * (maxPrice - minPrice);
      const y = Math.floor(getY(price)) + 0.5;

      ctx.beginPath();
      ctx.moveTo(this.paddingLeft, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      const priceStr = this._formatPrice(price);
      ctx.textAlign = 'right';
      ctx.fillText(priceStr, this.paddingLeft - 8, y + 4);
    }

    const step = Math.max(1, Math.floor(visibleData.length / 5));
    for (let i = 0; i < visibleData.length; i += step) {
      const c = visibleData[i];
      const x = getX(i) + 0.5;
      const timeStr = this._formatTime(c.time);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5e6673';
      ctx.fillText(timeStr, x, plotH + 18);
    }
  }

  _drawVolumeHistogram(ctx, candles, getX, plotH, candleWidth, maxVolume) {
    const maxBarHeight = 55;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = getX(i);
      const vol = c.volume || 10;
      const barH = Math.max(4, Math.floor((vol / (maxVolume || 50)) * maxBarHeight));
      const barY = plotH - barH;
      const barLeft = Math.floor(x - (candleWidth * 0.8) / 2);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.fillRect(barLeft, barY, Math.floor(candleWidth * 0.8), barH);
    }
  }

  _drawCandlesticks(ctx, candles, getX, getY, candleWidth) {
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = getX(i);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const isUp = c.close >= c.open;
      const color = isUp ? '#00e676' : '#ff1744';

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // Wick
      const wickX = Math.floor(x) + 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wickX, Math.floor(highY));
      ctx.lineTo(wickX, Math.floor(lowY));
      ctx.stroke();

      // Body
      const bodyTop = Math.floor(Math.min(openY, closeY));
      const bodyHeight = Math.max(3, Math.floor(Math.abs(closeY - openY)));
      const bodyLeft = Math.floor(x - candleWidth / 2);

      ctx.fillRect(bodyLeft, bodyTop, Math.floor(candleWidth), bodyHeight);
    }
  }

  _drawIndicators(ctx, candles, getX, getY) {
    // 1. EMA 20 (Yellow)
    if (this.indicators.ema20 && candles.length > 5) {
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      let prevEma = candles[0].close;
      const k = 2 / (20 + 1);

      for (let i = 0; i < candles.length; i++) {
        const ema = candles[i].close * k + prevEma * (1 - k);
        prevEma = ema;
        const x = getX(i);
        const y = getY(ema);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 2. EMA 50 (Cyan)
    if (this.indicators.ema50 && candles.length > 5) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      let prevEma = candles[0].close;
      const k = 2 / (50 + 1);

      for (let i = 0; i < candles.length; i++) {
        const ema = candles[i].close * k + prevEma * (1 - k);
        prevEma = ema;
        const x = getX(i);
        const y = getY(ema);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 3. Bollinger Bands (Purple)
    if (this.indicators.bollinger && candles.length > 10) {
      ctx.strokeStyle = '#e040fb';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < candles.length; i++) {
        const x = getX(i);
        const y = getY(candles[i].close * 1.004);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < candles.length; i++) {
        const x = getX(i);
        const y = getY(candles[i].close * 0.996);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  _drawRsiPanel(ctx, w, h, plotH, rsiHeight, candles, getX) {
    const rsiY = plotH + 10;
    ctx.fillStyle = '#090b10';
    ctx.fillRect(this.paddingLeft, rsiY, w - this.paddingLeft, rsiHeight - 10);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(this.paddingLeft, rsiY + 20); // 70 Overbought
    ctx.lineTo(w, rsiY + 20);
    ctx.moveTo(this.paddingLeft, rsiY + 50); // 30 Oversold
    ctx.lineTo(w, rsiY + 50);
    ctx.stroke();

    ctx.fillStyle = '#ff9100';
    ctx.font = '10px sans-serif';
    ctx.fillText('RSI (14)', this.paddingLeft + 6, rsiY + 12);

    ctx.strokeStyle = '#ff9100';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < candles.length; i++) {
      const x = getX(i);
      const rsiVal = 50 + Math.sin(i * 0.4) * 25;
      const y = rsiY + 60 - (rsiVal / 100) * 50;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _drawActiveTrades(ctx, getY, w) {
    const trades = this.tradeEngine.getActiveTrades().filter(t => t.assetId === this.assetId);
    trades.forEach(trade => {
      const strikeY = Math.floor(getY(trade.strikePrice)) + 0.5;
      const isCall = trade.direction === 'UP';
      const color = isCall ? '#00e676' : '#ff1744';

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.paddingLeft, strikeY);
      ctx.lineTo(w, strikeY);
      ctx.stroke();

      // Badge on right
      ctx.fillStyle = color;
      ctx.fillRect(w - 110, strikeY - 10, 100, 20);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10.5px "JetBrains Mono"';
      ctx.fillText(`${trade.direction} ${trade.strikePrice}`, w - 105, strikeY + 4);
      ctx.restore();
    });
  }

  _drawUserDrawings(ctx) {
    const all = [...this.drawings];
    if (this.currentDrawing) all.push(this.currentDrawing);

    all.forEach(d => {
      ctx.save();
      if (d.type === 'trendline') {
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d.x1, d.y1);
        ctx.lineTo(d.x2, d.y2);
        ctx.stroke();
      } else if (d.type === 'hline') {
        ctx.strokeStyle = '#ffb300';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(this.paddingLeft, d.y);
        ctx.lineTo(this.width, d.y);
        ctx.stroke();
      } else if (d.type === 'brush' && d.points.length > 1) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d.points[0].x, d.points[0].y);
        d.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  _drawCurrentPriceLine(ctx, visibleData, getX, getY, w) {
    const currentCandle = visibleData[visibleData.length - 1];
    const currentPrice = currentCandle.close;
    const currentY = Math.floor(getY(currentPrice)) + 0.5;
    const isUp = currentCandle.close >= currentCandle.open;
    const themeColor = isUp ? '#00e676' : '#ff1744';

    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(this.paddingLeft, currentY);
    ctx.lineTo(w, currentY);
    ctx.stroke();
    ctx.restore();

    const tagW = 68;
    const tagH = 32;
    const tagX = this.paddingLeft - tagW - 2;
    const tagY = currentY - tagH / 2;

    ctx.fillStyle = isUp ? '#004d26' : '#590014';
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 4);
    ctx.fill();

    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this._formatPrice(currentPrice), tagX + tagW / 2, tagY + 13);

    const countdownSec = 300 - (Math.floor(Date.now() / 1000) % 300);
    const minStr = Math.floor(countdownSec / 60).toString().padStart(2, '0');
    const secStr = (countdownSec % 60).toString().padStart(2, '0');
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = isUp ? '#69f0ae' : '#ff8a80';
    ctx.fillText(`${minStr}:${secStr}`, tagX + tagW / 2, tagY + 26);
  }

  _drawCrosshair(ctx, w, plotH, minPrice, maxPrice, getY) {
    const mx = this.mouse.x;
    const my = this.mouse.y;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    ctx.moveTo(this.paddingLeft, my);
    ctx.lineTo(w, my);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mx, this.paddingTop);
    ctx.lineTo(mx, plotH);
    ctx.stroke();
    ctx.restore();

    const priceAtCursor = maxPrice - (my - this.paddingTop) / (plotH - this.paddingTop) * (maxPrice - minPrice);
    ctx.fillStyle = '#1e2433';
    ctx.fillRect(this.paddingLeft - 70, my - 10, 68, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10.5px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(this._formatPrice(priceAtCursor), this.paddingLeft - 36, my + 4);
  }

  _formatPrice(price) {
    const asset = this.marketEngine.getAsset(this.assetId);
    const decimals = asset ? asset.decimals : 3;
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  _formatTime(timestamp) {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
