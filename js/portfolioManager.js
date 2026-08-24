/**
 * Olymp Trade - Portfolio & Currency Manager
 */

export class PortfolioManager {
  constructor() {
    this.currency = 'PKR'; // PKR or USD
    this.isDemoAccount = true;
    this.demoBalance = 50000.00;
    this.liveBalance = 0.00;
    this.depositHistory = [];
    this.listeners = new Set();

    this._loadState();
  }

  _loadState() {
    try {
      const saved = localStorage.getItem('olymp_trading_portfolio_v2');
      if (saved) {
        const data = JSON.parse(saved);
        this.currency = data.currency ?? 'PKR';
        this.isDemoAccount = data.isDemoAccount ?? true;
        this.demoBalance = data.demoBalance ?? 50000.00;
        this.liveBalance = data.liveBalance ?? 0.00;
        this.depositHistory = data.depositHistory ?? [];
      }
    } catch (e) {}
  }

  _saveState() {
    try {
      localStorage.setItem('olymp_trading_portfolio_v2', JSON.stringify({
        currency: this.currency,
        isDemoAccount: this.isDemoAccount,
        demoBalance: this.demoBalance,
        liveBalance: this.liveBalance,
        depositHistory: this.depositHistory
      }));
    } catch (e) {}
  }

  getBalance() {
    return this.isDemoAccount ? this.demoBalance : this.liveBalance;
  }

  switchAccountType(type) {
    this.isDemoAccount = (type === 'demo');
    this._saveState();
    this._notify('account_switched', { isDemo: this.isDemoAccount, balance: this.getBalance() });
  }

  setCurrency(curr) {
    this.currency = curr;
    this._saveState();
    this._notify('currency_changed', { currency: this.currency });
  }

  deductBalance(amount) {
    if (this.isDemoAccount) {
      if (this.demoBalance < amount) return false;
      this.demoBalance -= amount;
    } else {
      if (this.liveBalance < amount) return false;
      this.liveBalance -= amount;
    }
    this._saveState();
    this._notify('balance_updated', { isDemo: this.isDemoAccount, balance: this.getBalance() });
    return true;
  }

  addBalance(amount) {
    if (this.isDemoAccount) {
      this.demoBalance += amount;
    } else {
      this.liveBalance += amount;
    }
    this._saveState();
    this._notify('balance_updated', { isDemo: this.isDemoAccount, balance: this.getBalance() });
  }

  refillDemo() {
    this.demoBalance = 50000.00;
    this._saveState();
    this._notify('balance_updated', { isDemo: true, balance: this.demoBalance });
  }

  depositLive(amount) {
    this.liveBalance += amount;
    this._saveState();
    this._notify('balance_updated', { isDemo: this.isDemoAccount, balance: this.getBalance() });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(type, data) {
    this.listeners.forEach(cb => {
      try { cb({ type, data }); } catch(e) {}
    });
  }
}
