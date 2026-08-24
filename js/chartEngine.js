/**
 * TradingView Supercharts Pro - 60 FPS Canvas Engine
 * Exact TradingView Candlestick Styling, OHLC readouts, Dotted Tracking lines, and Countdown Pills.
 */

import { CHART_TYPES } from './config.js';

export class ChartEngine {
  constructor(canvasElement, marketEngine, tradeEngine) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.marketEngine = marketEngine;
    this.tradeEngine = tradeEngine;

    this.assetId = 'XAUUSD'; // Default to GOLD as in reference image!
    this.timeframe = '5m';   // 5m as in reference image!
    this.chartType = CHART_TYPES.CANDLESTICK;

    // Viewport configuration
    this.visibleCandles = 65;
    this.offsetCandles = 0;
    this.paddingLeft = 75;  // Left price axis as in screenshot!
    this.paddingBottom = 28; // Bottom time axis
    this.paddingTop = 25;

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
        this.visibleCandles = Math.min(150, this.visibleCandles + 4);
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

    // Clean white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

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

    visibleData.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.08;
    maxPrice += priceRange * 0.08;

    const slotWidth = plotW / this.visibleCandles;
    const candleWidth = Math.max(3, Math.min(12, slotWidth * 0.72));

    const getY = (price) => {
      return this.paddingTop + (1 - (price - minPrice) / (maxPrice - minPrice)) * (plotH - this.paddingTop);
    };

    const getX = (index) => {
      return this.paddingLeft + Math.floor(index * slotWidth + slotWidth / 2);
    };

    // 1. Draw TradingView Subtle Grid & Left Axis
    this._drawGrid(ctx, w, h, plotW, plotH, minPrice, maxPrice, visibleData, getY, getX);

    // 2. Draw Candlesticks (Teal / Red)
    this._drawCandlesticks(ctx, visibleData, getX, getY, candleWidth);

    // 3. Draw Watermark & Event Icons
    this._drawWatermarkAndEvents(ctx, w, plotH);

    // 4. Draw Current Price Dotted Line & Left Deep Teal Badge [ 4,649.237 \n 01:28 ]
    this._drawCurrentPriceLine(ctx, visibleData, getX, getY, w);

    // 5. Draw Crosshair
    if (this.mouse.isHover && this.mouse.x >= this.paddingLeft && this.mouse.y <= plotH) {
      this._drawCrosshair(ctx, w, plotH, minPrice, maxPrice, visibleData, slotWidth, getX, getY);
    }
  }

  _drawGrid(ctx, w, h, plotW, plotH, minPrice, maxPrice, visibleData, getY, getX) {
    ctx.strokeStyle = '#f0f3fa';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#131722';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';

    // Horizontal Grid Lines & Left Price Labels (as in reference image)
    const numLines = 8;
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

    // Vertical Time Grid Lines & Bottom Labels
    const step = Math.max(1, Math.floor(visibleData.length / 5));
    for (let i = 0; i < visibleData.length; i += step) {
      const c = visibleData[i];
      const x = getX(i) + 0.5;

      ctx.beginPath();
      ctx.moveTo(x, this.paddingTop);
      ctx.lineTo(x, plotH);
      ctx.stroke();

      const timeStr = this._formatTime(c.time);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#787b86';
      ctx.fillText(timeStr, x, plotH + 18);
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
      const color = isUp ? '#089981' : '#f23645';

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
      const bodyHeight = Math.max(2, Math.floor(Math.abs(closeY - openY)));
      const bodyLeft = Math.floor(x - candleWidth / 2);

      ctx.fillRect(bodyLeft, bodyTop, Math.floor(candleWidth), bodyHeight);
    }
  }

  _drawWatermarkAndEvents(ctx, w, plotH) {
    // TradingView Watermark at Bottom Left
    ctx.fillStyle = 'rgba(19, 23, 34, 0.85)';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('17 TradingView', this.paddingLeft + 20, plotH - 24);

    // Event lightning icon at bottom right
    const iconX = w - 45;
    const iconY = plotH - 24;
    ctx.fillStyle = '#9c27b0';
    ctx.beginPath();
    ctx.arc(iconX, iconY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', iconX, iconY + 3.5);
  }

  _drawCurrentPriceLine(ctx, visibleData, getX, getY, w) {
    const currentCandle = visibleData[visibleData.length - 1];
    const currentPrice = currentCandle.close;
    const currentY = Math.floor(getY(currentPrice)) + 0.5;

    // Dotted teal horizontal line across the entire screen
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#089981';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(this.paddingLeft, currentY);
    ctx.lineTo(w, currentY);
    ctx.stroke();
    ctx.restore();

    // Deep Teal Rounded Price Tag on the LEFT AXIS (Exact TradingView reference)
    const tagW = 68;
    const tagH = 32;
    const tagX = this.paddingLeft - tagW - 2;
    const tagY = currentY - tagH / 2;

    ctx.fillStyle = '#087361';
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 3);
    ctx.fill();

    // Price Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this._formatPrice(currentPrice), tagX + tagW / 2, tagY + 13);

    // Countdown Timer (e.g. 01:28)
    const countdownSec = 300 - (Math.floor(Date.now() / 1000) % 300);
    const minStr = Math.floor(countdownSec / 60).toString().padStart(2, '0');
    const secStr = (countdownSec % 60).toString().padStart(2, '0');
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#d0f0eb';
    ctx.fillText(`${minStr}:${secStr}`, tagX + tagW / 2, tagY + 26);
  }

  _drawCrosshair(ctx, w, plotH, minPrice, maxPrice, visibleData, slotWidth, getX, getY) {
    const mx = this.mouse.x;
    const my = this.mouse.y;

    ctx.save();
    ctx.strokeStyle = '#9598a1';
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
    ctx.fillStyle = '#1e222d';
    ctx.fillRect(this.paddingLeft - 70, my - 10, 68, 20);
    ctx.fillStyle = '#fff';
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
