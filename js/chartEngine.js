/**
 * Trading Pro - 60 FPS Candlestick & Wave Engine
 * Exact Reference Match: Dark Luxury Theme, Neon Green/Red Candlesticks, Volume Histogram, and Smooth Oscillating Price Action.
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

    // Viewport configuration
    this.visibleCandles = 55;
    this.offsetCandles = 0;
    this.paddingLeft = 75;
    this.paddingBottom = 28;
    this.paddingTop = 20;

    // Crosshair & Dragging
    this.mouse = { x: -1, y: -1, isHover: false, isDragging: false, dragStartX: 0 };
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

      if (this.mouse.isDragging) {
        const deltaX = this.mouse.x - this.mouse.dragStartX;
        const candleStep = (this.width - this.paddingLeft) / this.visibleCandles;
        const shift = Math.round(deltaX / candleStep);
        if (shift !== 0) {
          this.offsetCandles = Math.max(0, this.offsetCandles - shift);
          this.mouse.dragStartX = this.mouse.x;
        }
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isHover = false;
      this.mouse.isDragging = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.isDragging = true;
      this.mouse.dragStartX = this.mouse.x;
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.visibleCandles = Math.max(25, this.visibleCandles - 4);
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

  setChartType(type) {
    this.chartType = type;
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

    // 1. Dark Pro Chart Background with subtle vertical period panels
    this._drawBackground(ctx, w, h);

    const candles = this.marketEngine.getCandles(this.assetId, this.timeframe);
    if (!candles || candles.length === 0) return;

    // Visible window
    const totalCandles = candles.length;
    const endIndex = Math.max(0, totalCandles - 1 - this.offsetCandles);
    const startIndex = Math.max(0, endIndex - this.visibleCandles + 1);
    const visibleData = candles.slice(startIndex, endIndex + 1);
    if (visibleData.length === 0) return;

    const plotW = w - this.paddingLeft;
    const plotH = h - this.paddingBottom;

    // Price Extremes
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
    // Perfect candle width and spacing matching reference image
    const candleWidth = Math.max(4, Math.min(14, slotWidth * 0.68));

    const getY = (price) => {
      return this.paddingTop + (1 - (price - minPrice) / (maxPrice - minPrice)) * (plotH - this.paddingTop);
    };

    const getX = (index) => {
      return this.paddingLeft + Math.floor(index * slotWidth + slotWidth / 2);
    };

    // 2. Draw Subtle Horizontal Price Grid
    this._drawGrid(ctx, w, h, plotW, plotH, minPrice, maxPrice, visibleData, getY, getX);

    // 3. Draw Bottom Volume Histogram (Reference Match)
    this._drawVolumeHistogram(ctx, visibleData, getX, plotH, candleWidth, maxVolume);

    // 4. Draw Neon Green & Red Candlesticks (Exact Reference Match)
    this._drawCandlesticks(ctx, visibleData, getX, getY, candleWidth);

    // 5. Draw Live Price Beam & Left Badge
    this._drawCurrentPriceLine(ctx, visibleData, getX, getY, w);

    // 6. Draw Crosshair
    if (this.mouse.isHover && this.mouse.x >= this.paddingLeft && this.mouse.y <= plotH) {
      this._drawCrosshair(ctx, w, plotH, minPrice, maxPrice, visibleData, slotWidth, getX, getY);
    }
  }

  _drawBackground(ctx, w, h) {
    // Base dark gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#131722');
    grad.addColorStop(0.5, '#0e1118');
    grad.addColorStop(1, '#090b10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle alternating vertical bands matching reference screenshot
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
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';

    // Horizontal Price Lines & Left Labels
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
      ctx.fillStyle = '#848e9c';
      ctx.fillText(priceStr, this.paddingLeft - 8, y + 4);
    }

    // Time Axis Labels along bottom
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
    const maxBarHeight = 65; // Volume section height
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = getX(i);
      const vol = c.volume || 10;
      const barH = Math.max(4, Math.floor((vol / (maxVolume || 50)) * maxBarHeight));
      const barY = plotH - barH;
      const barLeft = Math.floor(x - (candleWidth * 0.8) / 2);

      // Semi-transparent grey volume bars as in reference image
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
      // Vibrant Neon Lime Green (#00E676) & Electric Red (#FF1744)
      const color = isUp ? '#00e676' : '#ff1744';

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // 1. Center Wick (crisp centered 1.5px line)
      const wickX = Math.floor(x) + 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wickX, Math.floor(highY));
      ctx.lineTo(wickX, Math.floor(lowY));
      ctx.stroke();

      // 2. Solid Rectangular Candle Body
      const bodyTop = Math.floor(Math.min(openY, closeY));
      const bodyHeight = Math.max(3, Math.floor(Math.abs(closeY - openY)));
      const bodyLeft = Math.floor(x - candleWidth / 2);

      ctx.fillRect(bodyLeft, bodyTop, Math.floor(candleWidth), bodyHeight);
    }
  }

  _drawCurrentPriceLine(ctx, visibleData, getX, getY, w) {
    const currentCandle = visibleData[visibleData.length - 1];
    const currentPrice = currentCandle.close;
    const currentY = Math.floor(getY(currentPrice)) + 0.5;
    const isUp = currentCandle.close >= currentCandle.open;
    const themeColor = isUp ? '#00e676' : '#ff1744';

    // Dotted horizontal tracking line
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(this.paddingLeft, currentY);
    ctx.lineTo(w, currentY);
    ctx.stroke();
    ctx.restore();

    // Dark Pill Tag on Left Axis
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

    // Price Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this._formatPrice(currentPrice), tagX + tagW / 2, tagY + 13);

    // Countdown Timer
    const countdownSec = 300 - (Math.floor(Date.now() / 1000) % 300);
    const minStr = Math.floor(countdownSec / 60).toString().padStart(2, '0');
    const secStr = (countdownSec % 60).toString().padStart(2, '0');
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = isUp ? '#69f0ae' : '#ff8a80';
    ctx.fillText(`${minStr}:${secStr}`, tagX + tagW / 2, tagY + 26);
  }

  _drawCrosshair(ctx, w, plotH, minPrice, maxPrice, visibleData, slotWidth, getX, getY) {
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

    // Price Tag on Left Axis
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
