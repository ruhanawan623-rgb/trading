# 📈 Olymp Trade Pro - Live Multi-Asset Web Trading Platform

An Olymp Trade / TradingView inspired web trading application engineered with real-time multi-market data tracking across **Cryptocurrency**, **Precious Metals & Commodities (Gold, Silver, Oil)**, **Major Indices (S&P 500, Nasdaq, Dow Jones)**, **Tech Stocks (Apple, Tesla, Nvidia)**, and **Forex Currencies (EUR/USD, GBP/USD, USD/JPY)**.

---

## 🌟 Key Features

### 1. 📊 60 FPS HTML5 Canvas High-Performance Charting
- **4 Chart Types**:
  - 📊 **Japanese Candlesticks** (glowing wicks and bodies)
  - 📈 **Mountain / Area Chart** (glowing cyan gradient with live price pulse)
  - 〰️ **Line Chart**
  - 🕯️ **Heikin-Ashi** (smooth trend recognition)
- **Timeframe Switching**: `5s`, `15s`, `1m`, `5m`, `15m`, `1h`
- **Technical Indicators**:
  - **SMA (20)**: Simple Moving Average
  - **EMA (50)**: Exponential Moving Average
  - **Bollinger Bands (20, 2)**: Dynamic volatility envelopes
  - **RSI (14)**: Relative Strength Index with 70/30 overbought/oversold levels
- **Live Overlays**: Strike price dashed line, remaining expiration countdown badge, and real-time In-The-Money (ITM) aura.

### 2. ⚡ Multi-Asset Real-Time Market Feeds
- **Cryptocurrencies**: Bitcoin (`BTC/USD`), Ethereum (`ETH/USD`), Solana (`SOL/USD`), Ripple (`XRP/USD`).
- **Metals & Commodities**: Gold Spot (`XAU/USD`), Silver Spot (`XAG/USD`), Brent Crude Oil (`BRENT/USD`), Platinum (`XPT/USD`).
- **Indices**: S&P 500 (`US500`), Nasdaq 100 (`NAS100`), Dow Jones (`DJI30`).
- **Tech Stocks**: Nvidia (`NVDA`), Apple (`AAPL`), Tesla (`TSLA`).
- **Forex**: `EUR/USD`, `GBP/USD`, `USD/JPY`.
- **Hybrid Streaming Engine**: Real-time Binance WebSocket for crypto + high-frequency stochastic Brownian motion engine for Gold, Indices, and Forex.

### 3. 🎯 Two Trading Modes
1. **Fixed Time Trades (FTT / Binary Options)**:
   - Expiration presets: `5s`, `15s`, `30s`, `1m`, `2m`, `5m`, `15m`, `1h`.
   - Up to **85% - 92% profit payout**.
   - **Early Cashout / Sell Early**: Settle trades before expiry to secure profits or cut losses.
2. **Forex / CFD Multiplier Mode**:
   - Multipliers: `x10`, `x50`, `x100`, `x200`, `x500`.
   - Dynamic **Take Profit (TP)** and **Stop Loss (SL)** triggers.
   - Real-time floating P&L calculation.

### 4. 💼 Account Management & VIP Tiers
- **Demo Account**: $10,000 refillable virtual funds with 1-click reset.
- **Live Account Simulation**: Instant deposit via USDT (TRC20/ERC20), Bitcoin, Credit Card, and Bank Wire.
- **Tier Ranks**: Starter, Advanced, and **Expert VIP** with +2% bonus payout on every trade.

### 5. 🔊 Procedural Web Audio API Sound Synthesizer
- Built-in crystal clear audio effects without external MP3 files:
  - 🔔 Order Placed chime
  - 🎉 Trade Won fanfare
  - 📉 Trade Lost subtle descending chord
  - 🚨 Real-time Price Alert gong

### 6. ⌨️ Keyboard Hotkeys
- <kbd>▲ Up</kbd> / <kbd>W</kbd>: Place UP / Buy trade
- <kbd>▼ Down</kbd> / <kbd>S</kbd>: Place DOWN / Sell trade
- <kbd>+</kbd> / <kbd>-</kbd>: Increase / Decrease investment amount
- <kbd>M</kbd>: Mute / Unmute sound effects

---

## 🚀 How to Run Locally

1. Start the local server:
   ```bash
   python server.py
   ```
2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:3000
   ```
