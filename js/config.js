/**
 * TradingView Supercharts Pro - Multi-Asset Catalog
 */

export const ASSET_CATEGORIES = {
  ALL: 'all',
  FUTURES: 'futures',
  STOCKS: 'stocks',
  CRYPTO: 'crypto',
  FOREX: 'forex'
};

export const ASSETS = [
  // Primary Reference: GOLD
  {
    id: 'XAUUSD',
    symbol: 'GOLD',
    name: 'CFDs on Gold (US$ / OZ)',
    exchange: 'TVC',
    type: 'Commodity · Cfd',
    category: ASSET_CATEGORIES.FUTURES,
    icon: '🟡',
    basePrice: 4649.237,
    decimals: 3,
    payout: 90,
    volatility: 0.0007,
    isLiveFeed: false
  },

  // STOCKS
  {
    id: 'AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc',
    exchange: 'NASDAQ',
    type: 'Stock',
    category: ASSET_CATEGORIES.STOCKS,
    icon: '🍎',
    basePrice: 309.35,
    decimals: 2,
    payout: 88,
    volatility: 0.0006,
    isLiveFeed: false
  },
  {
    id: 'TSLA',
    symbol: 'TSLA',
    name: 'Tesla Inc',
    exchange: 'NASDAQ',
    type: 'Stock',
    category: ASSET_CATEGORIES.STOCKS,
    icon: '🔴',
    basePrice: 362.86,
    decimals: 2,
    payout: 87,
    volatility: 0.0012,
    isLiveFeed: false
  },
  {
    id: 'NFLX',
    symbol: 'NFLX',
    name: 'Netflix Inc',
    exchange: 'NASDAQ',
    type: 'Stock',
    category: ASSET_CATEGORIES.STOCKS,
    icon: '🔴',
    basePrice: 79.59,
    decimals: 2,
    payout: 86,
    volatility: 0.0008,
    isLiveFeed: false
  },
  {
    id: 'NVDA',
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    exchange: 'NASDAQ',
    type: 'Stock',
    category: ASSET_CATEGORIES.STOCKS,
    icon: '🟢',
    basePrice: 142.50,
    decimals: 2,
    payout: 90,
    volatility: 0.0010,
    isLiveFeed: false
  },

  // CRYPTO
  {
    id: 'BTCUSDT',
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    exchange: 'BINANCE',
    type: 'Crypto',
    category: ASSET_CATEGORIES.CRYPTO,
    icon: '₿',
    basePrice: 94850.00,
    decimals: 2,
    payout: 92,
    volatility: 0.0008,
    isLiveFeed: true,
    streamSymbol: 'btcusdt@trade'
  },
  {
    id: 'ETHUSDT',
    symbol: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    exchange: 'BINANCE',
    type: 'Crypto',
    category: ASSET_CATEGORIES.CRYPTO,
    icon: 'Ξ',
    basePrice: 2840.50,
    decimals: 2,
    payout: 90,
    volatility: 0.0011,
    isLiveFeed: true,
    streamSymbol: 'ethusdt@trade'
  },

  // FOREX
  {
    id: 'EURUSD',
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    exchange: 'FXCM',
    type: 'Forex',
    category: ASSET_CATEGORIES.FOREX,
    icon: '💶',
    basePrice: 1.0524,
    decimals: 5,
    payout: 85,
    volatility: 0.0003,
    isLiveFeed: false
  }
];

export const TIMEFRAMES = [
  { id: '1m', label: '1m', seconds: 60, candleSeconds: 5 },
  { id: '5m', label: '5m', seconds: 300, candleSeconds: 15 },
  { id: '15m', label: '15m', seconds: 900, candleSeconds: 60 },
  { id: '1h', label: '1h', seconds: 3600, candleSeconds: 300 },
  { id: '1D', label: '1D', seconds: 86400, candleSeconds: 1800 }
];

export const CHART_TYPES = {
  CANDLESTICK: 'candlestick',
  AREA: 'area',
  LINE: 'line'
};
