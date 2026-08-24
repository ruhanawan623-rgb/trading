/**
 * TradingView Supercharts Pro - UI Controller
 */

import { ASSET_CATEGORIES, ASSETS } from './config.js';
import { soundEngine } from './soundEngine.js';

export class UIController {
  constructor(marketEngine, chartEngine, tradeEngine, portfolioManager) {
    this.marketEngine = marketEngine;
    this.chartEngine = chartEngine;
    this.tradeEngine = tradeEngine;
    this.portfolioManager = portfolioManager;

    this.activeAssetId = 'XAUUSD'; // Default to GOLD
    this.selectedTimeframe = '5m';

    this._initDOMElements();
    this._bindEvents();
    this._renderWatchlist();
    this._updateDetailCard();
    this._startClock();
  }

  _initDOMElements() {
    // Header
    this.elSymbolBtn = document.getElementById('tvHeaderSymbolBtn');
    this.elOhlcReadout = document.getElementById('tvOhlcReadout');
    this.elChartTitle = document.getElementById('tvChartAssetTitle');

    // Quick Trade Float
    this.elQuickSellPrice = document.getElementById('tvQuickSellPrice');
    this.elQuickBuyPrice = document.getElementById('tvQuickBuyPrice');
    this.elQuickSpread = document.getElementById('tvQuickSpread');
    this.elBtnQuickSell = document.getElementById('btnTvQuickSell');
    this.elBtnQuickBuy = document.getElementById('btnTvQuickBuy');

    // Right Sidebar
    this.elWlStocks = document.getElementById('wlStocksRows');
    this.elWlFutures = document.getElementById('wlFuturesRows');
    this.elDetailSym = document.getElementById('tvDetailSymbol');
    this.elDetailName = document.getElementById('tvDetailName');
    this.elDetailType = document.getElementById('tvDetailType');
    this.elDetailBigPrice = document.getElementById('tvDetailBigPrice');
    this.elDetailChange = document.getElementById('tvDetailChange');

    // Clock
    this.elBottomUtcClock = document.getElementById('tvBottomUtcClock');
    this.elToastContainer = document.getElementById('toastContainer');
  }

  _bindEvents() {
    // Market Engine Subscriptions
    this.marketEngine.subscribe((event) => {
      if (event.type === 'tick') {
        this._handleTick(event);
      }
    });

    // Quick Trade Sell / Buy
    this.elBtnQuickSell.addEventListener('click', () => {
      soundEngine.playOrderPlaced();
      this.showToast(`SELL 1 Lot on ${this.activeAssetId} Executed`, 'error');
    });

    this.elBtnQuickBuy.addEventListener('click', () => {
      soundEngine.playOrderPlaced();
      this.showToast(`BUY 1 Lot on ${this.activeAssetId} Executed`, 'success');
    });

    // Timeframe switcher
    document.querySelectorAll('.tv-tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tv-tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tf = btn.dataset.tf;
        this.selectedTimeframe = tf;
        this.chartEngine.setTimeframe(tf);
        document.getElementById('tvCurrentTfLabel').textContent = tf;
      });
    });

    // Drawing Tools
    document.querySelectorAll('.tv-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tv-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = btn.dataset.tool;
        if (tool === 'trash') {
          this.showToast('Drawings Cleared', 'info');
        } else {
          this.showToast(`Tool Selected: ${tool || 'Cursor'}`, 'info');
        }
      });
    });

    // Bottom Range buttons (1D, 5D, 1M, 1Y, ALL)
    document.querySelectorAll('.tv-range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tv-range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  _handleTick(event) {
    const asset = event.asset;

    // Update Quick Trade floating box
    if (event.assetId === this.activeAssetId) {
      const spread = asset.decimals === 3 ? 0.140 : 0.02;
      const sellPrice = (event.price - spread / 2).toFixed(asset.decimals);
      const buyPrice = (event.price + spread / 2).toFixed(asset.decimals);

      this.elQuickSellPrice.textContent = sellPrice;
      this.elQuickBuyPrice.textContent = buyPrice;
      this.elQuickSpread.textContent = asset.decimals === 3 ? '140' : '20';

      // Update OHLC readout
      const candles = this.marketEngine.getCandles(this.activeAssetId, this.selectedTimeframe);
      if (candles && candles.length > 0) {
        const last = candles[candles.length - 1];
        const diff = last.close - last.open;
        const diffPct = (diff / last.open) * 100;
        const sign = diff >= 0 ? '+' : '';
        const colorClass = diff >= 0 ? 'text-teal' : 'text-red';

        this.elOhlcReadout.innerHTML = `
          <span class="ohlc-label">O</span><span class="${colorClass}">${last.open.toFixed(asset.decimals)}</span>
          <span class="ohlc-label">H</span><span class="${colorClass}">${last.high.toFixed(asset.decimals)}</span>
          <span class="ohlc-label">L</span><span class="${colorClass}">${last.low.toFixed(asset.decimals)}</span>
          <span class="ohlc-label">C</span><span class="${colorClass}">${last.close.toFixed(asset.decimals)}</span>
          <span class="${colorClass}" style="font-weight:700;">${sign}${diff.toFixed(asset.decimals)} (${sign}${diffPct.toFixed(2)}%)</span>
        `;
      }

      this._updateDetailCard();
    }

    // Update Watchlist Row Price
    const rowEl = document.getElementById(`wl_row_${event.assetId}`);
    if (rowEl) {
      const priceEl = rowEl.querySelector('.tv-val-price');
      const chgEl = rowEl.querySelector('.tv-val-chg');
      const chgPctEl = rowEl.querySelector('.tv-val-chgpct');
      const sign = asset.change24h >= 0 ? '+' : '';
      const colorClass = asset.change24h >= 0 ? 'text-teal' : 'text-red';

      if (priceEl) priceEl.textContent = asset.currentPrice.toFixed(asset.decimals);
      if (chgEl) {
        chgEl.textContent = `${sign}${asset.change24h.toFixed(2)}`;
        chgEl.className = `tv-val-chg ${colorClass}`;
      }
      if (chgPctEl) {
        chgPctEl.textContent = `${sign}${asset.change24hPct.toFixed(2)}%`;
        chgPctEl.className = `tv-val-chgpct ${colorClass}`;
      }
    }
  }

  selectAsset(assetId) {
    this.activeAssetId = assetId;
    this.chartEngine.setAsset(assetId);
    const asset = this.marketEngine.getAsset(assetId);
    if (!asset) return;

    document.getElementById('tvHeaderSymbolText').textContent = asset.symbol;
    this.elChartTitle.textContent = `${asset.name} · ${this.selectedTimeframe} · ${asset.exchange}`;

    this._renderWatchlist();
    this._updateDetailCard();
  }

  _updateDetailCard() {
    const asset = this.marketEngine.getAsset(this.activeAssetId);
    if (!asset) return;

    this.elDetailSym.textContent = asset.symbol;
    this.elDetailName.textContent = `${asset.name} · ${asset.exchange}`;
    this.elDetailType.textContent = asset.type;

    const formatted = asset.currentPrice.toLocaleString('en-US', {
      minimumFractionDigits: asset.decimals,
      maximumFractionDigits: asset.decimals
    });
    this.elDetailBigPrice.innerHTML = `${formatted} <span style="font-size:16px; font-weight:600; color:var(--tv-text-sub);">USD</span>`;

    const sign = asset.change24hPct >= 0 ? '+' : '';
    const colorClass = asset.change24hPct >= 0 ? 'text-teal' : 'text-red';
    this.elDetailChange.className = `tv-detail-change-row ${colorClass}`;
    this.elDetailChange.textContent = `${sign}${asset.change24h.toFixed(asset.decimals)} ${sign}${asset.change24hPct.toFixed(2)}%`;
  }

  _renderWatchlist() {
    const assets = this.marketEngine.getAllAssets();
    this.elWlStocks.innerHTML = '';
    this.elWlFutures.innerHTML = '';

    assets.forEach(asset => {
      const isActive = asset.id === this.activeAssetId;
      const sign = asset.change24hPct >= 0 ? '+' : '';
      const colorClass = asset.change24hPct >= 0 ? 'text-teal' : 'text-red';

      const row = document.createElement('div');
      row.id = `wl_row_${asset.id}`;
      row.className = `tv-wl-row ${isActive ? 'active' : ''}`;
      row.innerHTML = `
        <div class="tv-sym-box">
          <span>${asset.icon}</span>
          <span>${asset.symbol}</span>
        </div>
        <div class="tv-val-price">${asset.currentPrice.toFixed(asset.decimals)}</div>
        <div class="tv-val-chg ${colorClass}">${sign}${asset.change24h.toFixed(2)}</div>
        <div class="tv-val-chgpct ${colorClass}">${sign}${asset.change24hPct.toFixed(2)}%</div>
      `;

      row.addEventListener('click', () => this.selectAsset(asset.id));

      if (asset.category === ASSET_CATEGORIES.STOCKS) {
        this.elWlStocks.appendChild(row);
      } else {
        this.elWlFutures.appendChild(row);
      }
    });
  }

  _startClock() {
    const updateTime = () => {
      const now = new Date();
      const utcStr = `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')} UTC`;
      if (this.elBottomUtcClock) this.elBottomUtcClock.textContent = `${utcStr} (ETH)`;
    };
    setInterval(updateTime, 1000);
    updateTime();
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      min-width: 240px;
      padding: 10px 14px;
      border-radius: 6px;
      background: #1e222d;
      color: #fff;
      font-size: 12.5px;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      border-left: 4px solid ${type === 'success' ? '#089981' : type === 'error' ? '#f23645' : '#2962ff'};
      animation: slideDown 0.15s ease;
    `;
    toast.textContent = message;

    this.elToastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }
}
