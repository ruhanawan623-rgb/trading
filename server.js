// server.js - TradingView Webhook & AI Trading Signals Server
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Store trading signals in memory
let tradingSignals = [
  {
    id: 'SIG_01',
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    symbol: 'GOLD',
    price: 4649.237,
    changePercent: 1.01,
    indicator: 'EMA (50) Breakout',
    prompt: `📊 TRADING ALERT - GOLD\n\nPrice: $4,649.237\nSignal: Bullish EMA Breakout\nSupport: $4,635.00 | Target: $4,680.00\nRisk/Reward: 1:2.8\nSuggested Position: Long / Buy (Stop Loss: $4,625)`
  },
  {
    id: 'SIG_02',
    timestamp: new Date(Date.now() - 1000 * 60 * 35),
    symbol: 'NVDA',
    price: 142.50,
    changePercent: 3.25,
    indicator: 'RSI Momentum Spike',
    prompt: `📊 TRADING ALERT - NVDA\n\nPrice: $142.50\nSignal: Bullish Momentum Acceleration\nResistance Level: $145.00\nSuggested Action: Ride momentum with trailing stop at $139.50`
  }
];

// TradingView Webhook Endpoint
app.post('/webhook/tradingview', async (req, res) => {
    try {
        const alertData = req.body || {};
        
        // Generate AI trading prompt based on incoming webhook data
        const prompt = await generateTradingPrompt(alertData);
        
        const signalObj = {
            id: 'SIG_' + Math.random().toString(36).substr(2, 7).toUpperCase(),
            timestamp: new Date(),
            symbol: alertData.symbol || 'GOLD',
            price: alertData.price || alertData.close || 0,
            changePercent: alertData.changePercent || alertData.change || 0,
            indicator: alertData.indicator || alertData.message || 'TradingView Alert',
            prompt: prompt,
            rawData: alertData
        };

        // Store signal (keep latest 50)
        tradingSignals.unshift(signalObj);
        if (tradingSignals.length > 50) tradingSignals.pop();
        
        // Send notification
        await sendNotification(prompt, alertData);
        
        res.status(200).json({ status: 'success', message: 'Webhook received & processed', signal: signalObj });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Generate comprehensive trading prompt based on market data
async function generateTradingPrompt(data) {
    const symbol = data.symbol || 'ASSET';
    const price = data.price || data.close || 'N/A';
    const change = data.change || '0.00';
    const changePercent = parseFloat(data.changePercent || data.dp || 0);
    const volume = data.volume || 'Normal';
    const indicator = data.indicator || data.strategy || 'Custom Trigger';
    
    let prompt = `📊 TRADING ALERT - ${symbol}\n\n`;
    prompt += `Current Price: $${price}\n`;
    prompt += `Change: ${change} (${changePercent}%)\n`;
    prompt += `Volume: ${volume}\n`;
    prompt += `Indicator Trigger: ${indicator}\n\n`;
    
    // Conditional rule-based AI technical suggestions
    if (changePercent < -3) {
        prompt += `⚠️ SIGNIFICANT DROP / OVERSOLD ZONE\n`;
        prompt += `Analysis:\n`;
        prompt += `- Price is testing major support zone.\n`;
        prompt += `- Check for bullish divergence or reversal candlestick pattern (Hammer/Engulfing).\n`;
        prompt += `- Suggested Strategy: Staggered buy limit orders with tight Stop Loss.\n`;
    } else if (changePercent > 3) {
        prompt += `🚀 STRONG BULLISH BREAKOUT\n`;
        prompt += `Analysis:\n`;
        prompt += `- Strong momentum push above resistance.\n`;
        prompt += `- Confirm with high volume before adding to position.\n`;
        prompt += `- Suggested Strategy: Trailing stop loss to lock in profits.\n`;
    } else {
        prompt += `⚡ CONSOLIDATION / RANGE-BOUND\n`;
        prompt += `Analysis:\n`;
        prompt += `- Asset trading in equilibrium channel.\n`;
        prompt += `- Suggested Strategy: Mean reversion scalping between support and resistance.\n`;
    }
    
    prompt += `\n🔍 ACTIONABLE TRADING PLAN:\n`;
    prompt += `1. Trend Bias: ${changePercent >= 0 ? 'BULLISH 🟢' : 'BEARISH 🔴'}\n`;
    prompt += `2. Risk/Reward Ratio: 1:2.5 minimum\n`;
    prompt += `3. Recommended Risk: Max 1-2% account balance\n`;
    
    return prompt;
}

// API: Get latest trading signals
app.get('/api/signals/latest', (req, res) => {
    res.json(tradingSignals.slice(0, 15));
});

// API: Generate prompt for specific symbol on demand
app.get('/api/prompt/:symbol', async (req, res) => {
    const { symbol } = req.params;
    try {
        const marketData = await fetchMarketData(symbol);
        const prompt = await generateTradingPrompt(marketData);
        res.json({ symbol, marketData, prompt, timestamp: new Date() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function fetchMarketData(symbol) {
    try {
        const cleanSym = symbol.toUpperCase().replace('/', '');
        // Fetch real-time crypto price from Binance or default
        if (cleanSym.includes('BTC') || cleanSym.includes('ETH') || cleanSym.includes('SOL')) {
            const resp = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${cleanSym}USDT`);
            return {
                symbol: symbol,
                price: parseFloat(resp.data.lastPrice),
                change: parseFloat(resp.data.priceChange),
                changePercent: parseFloat(resp.data.priceChangePercent),
                volume: resp.data.volume
            };
        }
    } catch (e) {
        // Fallback for commodities / stocks
    }

    return {
        symbol: symbol,
        price: symbol.toUpperCase() === 'GOLD' ? 4649.237 : 142.50,
        change: '+46.60',
        changePercent: 1.01,
        volume: '1.24M'
    };
}

async function sendNotification(prompt, data) {
    console.log('\n========================================');
    console.log('🚨 NEW TRADINGVIEW WEBHOOK ALERT RECEIVED:');
    console.log(prompt);
    console.log('========================================\n');
}

app.listen(PORT, () => {
    console.log(`🚀 Trading backend & web platform running on http://localhost:${PORT}`);
});
