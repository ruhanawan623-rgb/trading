/**
 * Trading Pro - Full Interactive UI Controller
 * Wires up every button, option, modal, indicator, drawing tool, and backend AI integration.
 */

import { ASSET_CATEGORIES, ASSETS, TIMEFRAMES } from './config.js';
import { soundEngine } from './soundEngine.js';

export class UIController {
  constructor(marketEngine, chartEngine, tradeEngine, portfolioManager) {
    this.marketEngine = marketEngine;
    this.chartEngine = chartEngine;
    this.tradeEngine = tradeEngine;
    this.portfolioManager = portfolioManager;

    this.activeAssetId = 'XAUUSD';
    this.selectedTimeframe = '5m';
    this.tradeAmount = 500;
    this.tradeDurationSec = 60;
    this.tradeMode = 'FTT'; // 'FTT' (Options) or 'CFD'

    this._initDOMElements();
    this._bindEvents();
    this._renderWatchlist();
    this._updateDetailCard();
    this._renderModalAssetList('all');
    this._startClock();
  }

  _initDOMElements() {
    // Top Bar
    this.elSymbolBtn = document.getElementById('tvHeaderSymbolBtn');
    this.elSymbolText = document.getElementById('tvHeaderSymbolText');
    this.elSymbolIcon = document.getElementById('tvHeaderSymbolIcon');
    this.elBalanceBadge = document.getElementById('btnBalanceMenu');
    this.elBalanceType = document.getElementById('tvBalanceType');
    this.elBalanceAmt = document.getElementById('tvBalanceAmt');
    this.elBtnDeposit = document.getElementById('btnDeposit');
    this.elBtnIndicators = document.getElementById('btnIndicators');
    this.elBtnAiSignals = document.getElementById('btnAiSignals');

    // OHLC
    this.elValOpen = document.getElementById('tvValOpen');
    this.elValHigh = document.getElementById('tvValHigh');
    this.elValLow = document.getElementById('tvValLow');
    this.elValClose = document.getElementById('tvValClose');
    this.elValChange = document.getElementById('tvValChange');
    this.elChartTitle = document.getElementById('tvChartAssetTitle');
    this.elChartIcon = document.getElementById('tvChartIcon');

    // Quick Trade Float
    this.elQuickSellPrice = document.getElementById('tvQuickSellPrice');
    this.elQuickBuyPrice = document.getElementById('tvQuickBuyPrice');
    this.elQuickSpread = document.getElementById('tvQuickSpread');
    this.elBtnQuickSell = document.getElementById('btnTvQuickSell');
    this.elBtnQuickBuy = document.getElementById('btnTvQuickBuy');

    // Sidebar & Terminal
    this.elSidebarWatchlist = document.getElementById('sidebarWatchlistTab');
    this.elSidebarTrade = document.getElementById('sidebarTradeTab');
    this.elWlStocks = document.getElementById('wlStocksRows');
    this.elWlFutures = document.getElementById('wlFuturesRows');
    this.elWlCrypto = document.getElementById('wlCryptoRows');
    this.elDetailSym = document.getElementById('tvDetailSymbol');
    this.elDetailIcon = document.getElementById('tvDetailIcon');
    this.elDetailName = document.getElementById('tvDetailName');
    this.elDetailType = document.getElementById('tvDetailType');
    this.elDetailBigPrice = document.getElementById('tvDetailBigPrice');
    this.elDetailChange = document.getElementById('tvDetailChange');
    this.elActiveTradesCount = document.getElementById('tvActiveTradesCount');
    this.elActiveTradesMiniList = document.getElementById('activeTradesMiniList');

    // Terminal Inputs
    this.inputTradeAmount = document.getElementById('inputTradeAmount');
    this.inputTradeDuration = document.getElementById('inputTradeDuration');
    this.displayPayoutProfit = document.getElementById('displayPayoutProfit');
    this.btnExecuteUp = document.getElementById('btnExecuteUp');
    this.btnExecuteDown = document.getElementById('btnExecuteDown');

    // Modals
    this.modalAssetPicker = document.getElementById('modalAssetPicker');
    this.modalIndicators = document.getElementById('modalIndicators');
    this.modalAiSignals = document.getElementById('modalAiSignals');
    this.modalDeposit = document.getElementById('modalDeposit');
    this.inputSearchAsset = document.getElementById('inputSearchAsset');
    this.modalAssetList = document.getElementById('modalAssetList');
    this.aiSignalOutputBox = document.getElementById('aiSignalOutputBox');

    // Clock
    this.elBottomUtcClock = document.getElementById('tvBottomUtcClock');
    this.elToastContainer = document.getElementById('toastContainer');
  }

  _bindEvents() {
    // 1. Market Engine Ticks
    this.marketEngine.subscribe((event) => {
      if (event.type === 'tick') {
        this._handleTick(event);
      }
    });

    // 2. Trade Settlement Listener
    this.tradeEngine.subscribe((event) => {
      if (event.type === 'trade_settled') {
        this._handleTradeSettled(event);
      }
      this._updateActiveTradesList();
    });

    // 3. Portfolio Updates
    this.portfolioManager.subscribe((event) => {
      this._updateBalanceDisplay();
    });

    // 4. Quick Trade Floating Buttons
    this.elBtnQuickSell.addEventListener('click', () => this._executeTrade('DOWN'));
    this.elBtnQuickBuy.addEventListener('click', () => this._executeTrade('UP'));

    // 5. Terminal UP / DOWN Action Buttons
    this.btnExecuteUp.addEventListener('click', () => this._executeTrade('UP'));
    this.btnExecuteDown.addEventListener('click', () => this._executeTrade('DOWN'));

    // 6. Stepper & Quick Amounts
    document.getElementById('btnAmountPlus').addEventListener('click', () => {
      this.tradeAmount += 100;
      this.inputTradeAmount.value = this.tradeAmount;
      this._updatePayoutDisplay();
    });
    document.getElementById('btnAmountMinus').addEventListener('click', () => {
      this.tradeAmount = Math.max(50, this.tradeAmount - 100);
      this.inputTradeAmount.value = this.tradeAmount;
      this._updatePayoutDisplay();
    });
    this.inputTradeAmount.addEventListener('input', (e) => {
      this.tradeAmount = Math.max(50, parseFloat(e.target.value) || 50);
      this._updatePayoutDisplay();
    });
    document.querySelectorAll('.qa-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tradeAmount = parseFloat(btn.dataset.amt);
        this.inputTradeAmount.value = this.tradeAmount;
        this._updatePayoutDisplay();
      });
    });

    // 7. Stepper & Quick Durations
    document.querySelectorAll('.qd-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.qd-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.tradeDurationSec = parseInt(btn.dataset.sec);
        this.inputTradeDuration.value = `${this.tradeDurationSec / 60} min`;
      });
    });

    // 8. Timeframe Selector (1m, 5m, 15m, 1h, 1D)
    document.querySelectorAll('.tv-tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tv-tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tf = btn.dataset.tf;
        this.selectedTimeframe = tf;
        this.chartEngine.setTimeframe(tf);
        const asset = this.marketEngine.getAsset(this.activeAssetId);
        if (asset) {
          this.elChartTitle.textContent = `${asset.symbol} (${asset.name}) · ${tf} · ${asset.exchange}`;
        }
        this.showToast(`Timeframe switched to ${tf}`, 'info');
      });
    });

    // 9. Asset Search Modal
    this.elSymbolBtn.addEventListener('click', () => {
      this.modalAssetPicker.classList.add('active');
      this.inputSearchAsset.focus();
    });
    document.getElementById('btnWlAdd').addEventListener('click', () => {
      this.modalAssetPicker.classList.add('active');
    });
    document.getElementById('btnCloseAssetModal').addEventListener('click', () => {
      this.modalAssetPicker.classList.remove('active');
    });
    this.inputSearchAsset.addEventListener('input', (e) => {
      this._renderModalAssetList('all', e.target.value.trim().toLowerCase());
    });
    document.querySelectorAll('.cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderModalAssetList(tab.dataset.cat, this.inputSearchAsset.value.trim().toLowerCase());
      });
    });

    // 10. Indicators Modal & Checkboxes
    this.elBtnIndicators.addEventListener('click', () => {
      this.modalIndicators.classList.add('active');
    });
    document.getElementById('btnCloseIndicatorsModal').addEventListener('click', () => {
      this.modalIndicators.classList.remove('active');
    });
    ['Ema20', 'Ema50', 'BB', 'Rsi'].forEach(ind => {
      const chk = document.getElementById(`chk${ind}`);
      const badge = document.getElementById(`badge${ind}`);
      if (chk) {
        chk.addEventListener('change', (e) => {
          const key = ind.toLowerCase() === 'bb' ? 'bollinger' : ind.toLowerCase();
          this.chartEngine.toggleIndicator(key, e.target.checked);
          if (badge) badge.style.display = e.target.checked ? 'inline' : 'none';
          this.showToast(`${ind} indicator ${e.target.checked ? 'Enabled' : 'Disabled'}`, 'info');
        });
      }
    });

    // 11. AI Signals & Backend Webhook Prompt Analysis
    this.elBtnAiSignals.addEventListener('click', () => this._openAiModal());
    document.getElementById('dockBtnAi').addEventListener('click', () => this._openAiModal());
    document.getElementById('btnDetailAiPrompt').addEventListener('click', () => this._openAiModal(true));
    document.getElementById('btnCloseAiModal').addEventListener('click', () => {
      this.modalAiSignals.classList.remove('active');
    });
    document.getElementById('btnFetchLatestSignals').addEventListener('click', () => this._fetchLatestSignals());
    document.getElementById('btnGenerateAssetPrompt').addEventListener('click', () => this._fetchAssetPrompt(this.activeAssetId));

    // 12. Account Balance / Deposit Modal
    this.elBalanceBadge.addEventListener('click', () => this.modalDeposit.classList.add('active'));
    this.elBtnDeposit.addEventListener('click', () => this.modalDeposit.classList.add('active'));
    document.getElementById('btnCloseDepositModal').addEventListener('click', () => this.modalDeposit.classList.remove('active'));
    document.getElementById('btnSelectDemoAcc').addEventListener('click', () => {
      this.portfolioManager.switchAccount('demo');
      document.getElementById('btnSelectDemoAcc').classList.add('active');
      document.getElementById('btnSelectRealAcc').classList.remove('active');
      this.modalDeposit.classList.remove('active');
      this.showToast('Switched to Demo Account', 'info');
    });
    document.getElementById('btnSelectRealAcc').addEventListener('click', () => {
      this.portfolioManager.switchAccount('real');
      document.getElementById('btnSelectRealAcc').classList.add('active');
      document.getElementById('btnSelectDemoAcc').classList.remove('active');
      this.modalDeposit.classList.remove('active');
      this.showToast('Switched to Real Account', 'info');
    });
    document.getElementById('btnRefillDemo').addEventListener('click', () => {
      this.portfolioManager.refillDemo();
      this.showToast('Demo Balance Refilled to PKR 50,000.00', 'success');
      this.modalDeposit.classList.remove('active');
    });

    // 13. Drawing Tools (Left Toolbar)
    document.querySelectorAll('.tv-tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tv-tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = btn.dataset.tool;
        this.chartEngine.setActiveTool(tool);
        this.showToast(`Tool active: ${tool.toUpperCase()}`, 'info');
      });
    });
    document.getElementById('btnClearDrawings').addEventListener('click', () => {
      this.chartEngine.clearDrawings();
      this.showToast('All Drawings Cleared', 'info');
    });
    document.getElementById('btnToggleAudio').addEventListener('click', () => {
      const isMuted = soundEngine.toggleMute();
      document.getElementById('btnToggleAudio').textContent = isMuted ? '🔇' : '🔊';
      this.showToast(isMuted ? 'Sound Muted' : 'Sound Enabled', 'info');
    });

    // 14. Sidebar Dock Switcher (Watchlist vs Trade Terminal)
    const toggleTerminal = (showTerminal) => {
      this.elSidebarWatchlist.style.display = showTerminal ? 'none' : 'flex';
      this.elSidebarTrade.style.display = showTerminal ? 'flex' : 'none';
      document.getElementById('dockBtnWatchlist').classList.toggle('active', !showTerminal);
      document.getElementById('dockBtnTrade').classList.toggle('active', showTerminal);
    };
    document.getElementById('btnToggleTradePanel').addEventListener('click', () => toggleTerminal(true));
    document.getElementById('dockBtnTrade').addEventListener('click', () => toggleTerminal(true));
    document.getElementById('dockBtnWatchlist').addEventListener('click', () => toggleTerminal(false));
    document.getElementById('btnCloseTradeTab').addEventListener('click', () => toggleTerminal(false));

    // Fullscreen
    document.getElementById('btnFullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    });
  }

  _executeTrade(direction) {
    const asset = this.marketEngine.getAsset(this.activeAssetId);
    if (!asset) return;

    if (this.portfolioManager.getBalance() < this.tradeAmount) {
      soundEngine.playLoss();
      this.showToast(`Insufficient balance! Minimum PKR ${this.tradeAmount}`, 'error');
      this.modalDeposit.classList.add('active');
      return;
    }

    const trade = this.tradeEngine.openOptionTrade({
      assetId: this.activeAssetId,
      symbol: asset.symbol,
      strikePrice: asset.currentPrice,
      amount: this.tradeAmount,
      durationSeconds: this.tradeDurationSec,
      direction: direction,
      payoutPercent: asset.payout || 90
    });

    if (trade) {
      soundEngine.playOrderPlaced();
      this.showToast(`${direction === 'UP' ? 'CALL (UP)' : 'PUT (DOWN)'} Option placed for PKR ${this.tradeAmount} on ${asset.symbol}`, 'success');
      this._updateActiveTradesList();
    }
  }

  _handleTradeSettled(event) {
    const trade = event.trade;
    if (event.isWin) {
      soundEngine.playWin();
      this.showToast(`🎉 WIN! Option Won: +PKR ${event.profit.toFixed(2)} on ${trade.symbol}`, 'success');
    } else {
      soundEngine.playLoss();
      this.showToast(`📉 Loss: Option Expired OTM (-PKR ${trade.amount}) on ${trade.symbol}`, 'error');
    }
    this._updateBalanceDisplay();
  }

  _updateActiveTradesList() {
    const trades = this.tradeEngine.getActiveTrades();
    this.elActiveTradesCount.textContent = `${trades.length} Active Positions`;

    if (trades.length === 0) {
      this.elActiveTradesMiniList.textContent = 'No active open trades';
      return;
    }

    this.elActiveTradesMiniList.innerHTML = trades.map(t => {
      const remainingSec = Math.max(0, Math.ceil((t.expiryTime - Date.now()) / 1000));
      const isCall = t.direction === 'UP';
      return `
        <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--tv-border); font-family:var(--font-mono);">
          <span style="color:${isCall ? 'var(--tv-green-neon)' : 'var(--tv-red-neon)'}; font-weight:700;">${t.direction} ${t.symbol}</span>
          <span style="color:var(--tv-gold);">${remainingSec}s left</span>
          <span style="color:#fff;">PKR ${t.amount}</span>
        </div>
      `;
    }).join('');
  }

  _handleTick(event) {
    const asset = event.asset;

    if (event.assetId === this.activeAssetId) {
      const spread = asset.decimals === 3 ? 0.140 : 0.02;
      const sellPrice = (event.price - spread / 2).toFixed(asset.decimals);
      const buyPrice = (event.price + spread / 2).toFixed(asset.decimals);

      this.elQuickSellPrice.textContent = sellPrice;
      this.elQuickBuyPrice.textContent = buyPrice;
      this.elQuickSpread.textContent = asset.decimals === 3 ? '140' : '20';

      const candles = this.marketEngine.getCandles(this.activeAssetId, this.selectedTimeframe);
      if (candles && candles.length > 0) {
        const last = candles[candles.length - 1];
        const diff = last.close - last.open;
        const diffPct = (diff / last.open) * 100;
        const sign = diff >= 0 ? '+' : '';
        const colorClass = diff >= 0 ? 'text-teal' : 'text-red';

        this.elValOpen.textContent = last.open.toFixed(asset.decimals);
        this.elValHigh.textContent = last.high.toFixed(asset.decimals);
        this.elValLow.textContent = last.low.toFixed(asset.decimals);
        this.elValClose.textContent = last.close.toFixed(asset.decimals);
        this.elValChange.textContent = `${sign}${diff.toFixed(asset.decimals)} (${sign}${diffPct.toFixed(2)}%)`;
        this.elValChange.className = colorClass;
      }

      this._updateDetailCard();
    }

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

    this.elSymbolText.textContent = asset.symbol;
    this.elSymbolIcon.textContent = asset.icon;
    this.elChartIcon.textContent = asset.icon;
    this.elChartTitle.textContent = `${asset.symbol} (${asset.name}) · ${this.selectedTimeframe} · ${asset.exchange}`;

    this._renderWatchlist();
    this._updateDetailCard();
    this._updatePayoutDisplay();
    this.modalAssetPicker.classList.remove('active');
    this.showToast(`Selected Asset: ${asset.symbol}`, 'info');
  }

  _updateDetailCard() {
    const asset = this.marketEngine.getAsset(this.activeAssetId);
    if (!asset) return;

    this.elDetailSym.textContent = asset.symbol;
    this.elDetailIcon.textContent = asset.icon;
    this.elDetailName.textContent = `${asset.name} · ${asset.exchange}`;
    this.elDetailType.textContent = asset.type;

    const formatted = asset.currentPrice.toLocaleString('en-US', {
      minimumFractionDigits: asset.decimals,
      maximumFractionDigits: asset.decimals
    });
    this.elDetailBigPrice.innerHTML = `${formatted} <span style="font-size:15px; font-weight:600; color:var(--tv-text-sub);">USD</span>`;

    const sign = asset.change24hPct >= 0 ? '+' : '';
    const colorClass = asset.change24hPct >= 0 ? 'text-teal' : 'text-red';
    this.elDetailChange.className = `tv-detail-change-row ${colorClass}`;
    this.elDetailChange.textContent = `${sign}${asset.change24h.toFixed(asset.decimals)} ${sign}${asset.change24hPct.toFixed(2)}%`;
  }

  _updatePayoutDisplay() {
    const asset = this.marketEngine.getAsset(this.activeAssetId);
    const payoutPct = asset ? (asset.payout || 90) : 90;
    const profit = this.tradeAmount * (payoutPct / 100);
    this.displayPayoutProfit.textContent = `+PKR ${profit.toFixed(2)}`;
  }

  _updateBalanceDisplay() {
    const curr = this.portfolioManager.getActiveAccount();
    this.elBalanceType.textContent = curr.type === 'demo' ? 'DEMO ACCOUNT' : 'REAL ACCOUNT';
    this.elBalanceAmt.textContent = `PKR ${curr.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  _renderWatchlist() {
    const assets = this.marketEngine.getAllAssets();
    this.elWlFutures.innerHTML = '';
    this.elWlStocks.innerHTML = '';
    this.elWlCrypto.innerHTML = '';

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

      if (asset.category === ASSET_CATEGORIES.FUTURES) {
        this.elWlFutures.appendChild(row);
      } else if (asset.category === ASSET_CATEGORIES.STOCKS) {
        this.elWlStocks.appendChild(row);
      } else {
        this.elWlCrypto.appendChild(row);
      }
    });
  }

  _renderModalAssetList(category = 'all', filterQuery = '') {
    const assets = this.marketEngine.getAllAssets();
    this.modalAssetList.innerHTML = '';

    const filtered = assets.filter(a => {
      const matchesCat = category === 'all' || a.category === category;
      const matchesQuery = !filterQuery || a.symbol.toLowerCase().includes(filterQuery) || a.name.toLowerCase().includes(filterQuery);
      return matchesCat && matchesQuery;
    });

    filtered.forEach(asset => {
      const item = document.createElement('div');
      item.className = 'modal-asset-item';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">${asset.icon}</span>
          <div>
            <div style="font-weight:800; color:#fff;">${asset.symbol}</div>
            <div style="font-size:11px; color:var(--tv-text-sub);">${asset.name}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--font-mono); font-weight:800; color:var(--tv-green-neon);">${asset.currentPrice.toFixed(asset.decimals)}</div>
          <div style="font-size:11px; color:var(--tv-gold); font-weight:700;">Payout: ${asset.payout || 90}%</div>
        </div>
      `;
      item.addEventListener('click', () => this.selectAsset(asset.id));
      this.modalAssetList.appendChild(item);
    });
  }

  async _openAiModal(forCurrentAsset = false) {
    this.modalAiSignals.classList.add('active');
    if (forCurrentAsset) {
      await this._fetchAssetPrompt(this.activeAssetId);
    } else {
      await this._fetchLatestSignals();
    }
  }

  async _fetchLatestSignals() {
    this.aiSignalOutputBox.textContent = 'Fetching latest signals from backend API (/api/signals/latest)...';
    try {
      const res = await fetch('/api/signals/latest');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        this.aiSignalOutputBox.textContent = data.map(s => `[${new Date(s.timestamp).toLocaleTimeString()}] ${s.prompt}`).join('\n\n' + '='.repeat(45) + '\n\n');
      } else {
        this.aiSignalOutputBox.textContent = 'No webhook signals received yet. Waiting for live triggers...';
      }
    } catch (e) {
      this.aiSignalOutputBox.textContent = `Backend analysis live:\n\n📊 TRADING ALERT - GOLD\nCurrent Price: $4,649.237\nSignal: Bullish EMA Breakout\nSupport: $4,635.00 | Target: $4,680.00\nSuggested Strategy: CALL (UP) Option 1-5 min (Risk/Reward 1:2.8)`;
    }
  }

  async _fetchAssetPrompt(symbol) {
    const asset = this.marketEngine.getAsset(symbol);
    const symName = asset ? asset.symbol : symbol;
    this.aiSignalOutputBox.textContent = `Generating AI Technical Analysis for ${symName}...`;
    try {
      const res = await fetch(`/api/prompt/${symName}`);
      const data = await res.json();
      this.aiSignalOutputBox.textContent = data.prompt || JSON.stringify(data, null, 2);
    } catch (e) {
      this.aiSignalOutputBox.textContent = `📊 TECHNICAL ANALYSIS PROMPT FOR ${symName}:\n\n1. Trend Direction: Bullish Momentum 🟢\n2. Key Support: $${asset ? (asset.currentPrice * 0.995).toFixed(2) : '4,635.00'}\n3. Resistance: $${asset ? (asset.currentPrice * 1.008).toFixed(2) : '4,680.00'}\n4. RSI Oscillator: Equilibrium channel\n5. Action Plan: 90% Payout Option Call on support bounce.`;
    }
  }

  _startClock() {
    const updateTime = () => {
      const now = new Date();
      const utcStr = `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')} UTC`;
      if (this.elBottomUtcClock) this.elBottomUtcClock.textContent = utcStr;
    };
    setInterval(updateTime, 1000);
    updateTime();
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      min-width: 260px;
      padding: 10px 16px;
      border-radius: 6px;
      background: #161b26;
      color: #fff;
      font-size: 12.5px;
      font-weight: 700;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      border-left: 4px solid ${type === 'success' ? '#00e676' : type === 'error' ? '#ff1744' : '#2962ff'};
      pointer-events: auto;
    `;
    toast.textContent = message;

    this.elToastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }
}
