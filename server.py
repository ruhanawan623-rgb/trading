import http.server
import mimetypes
import json
import sys
import os
from datetime import datetime, timezone

mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/html', '.html')
mimetypes.add_type('image/svg+xml', '.svg')

trading_signals = [
    {
        "id": "SIG_01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "symbol": "GOLD",
        "price": 4649.237,
        "changePercent": 1.01,
        "indicator": "EMA (50) Breakout",
        "prompt": "TRADING ALERT - GOLD\n\nCurrent Price: $4,649.237\nSignal: Bullish EMA Breakout\nKey Levels: Support $4,635.00 | Target $4,680.00\nStrategy: Buy / Long (Risk/Reward 1:2.8)"
    },
    {
        "id": "SIG_02",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "symbol": "NVDA",
        "price": 142.50,
        "changePercent": 3.25,
        "indicator": "RSI Momentum Spike",
        "prompt": "TRADING ALERT - NVDA\n\nCurrent Price: $142.50\nSignal: Bullish Acceleration\nSuggested Action: Trailing stop loss at $139.50"
    }
]

def generate_trading_prompt(data):
    symbol = str(data.get('symbol', 'GOLD'))
    price = str(data.get('price', data.get('close', 'N/A')))
    change = str(data.get('change', '0.00'))
    try:
        change_pct = float(data.get('changePercent', data.get('dp', 0)))
    except Exception:
        change_pct = 0.0
    volume = str(data.get('volume', 'Normal'))
    indicator = str(data.get('indicator', data.get('strategy', 'TradingView Alert')))

    prompt = f"[TRADING ALERT - {symbol}]\n\n"
    prompt += f"Current Price: ${price}\n"
    prompt += f"Change: {change} ({change_pct}%)\n"
    prompt += f"Volume: {volume}\n"
    prompt += f"Trigger: {indicator}\n\n"

    if change_pct < -3:
        prompt += "SIGNIFICANT DROP / OVERSOLD ZONE\n"
        prompt += "Analysis: Price testing key support area. Watch for reversal.\n"
    elif change_pct > 3:
        prompt += "STRONG BULLISH MOMENTUM\n"
        prompt += "Analysis: Clean breakout above resistance. Ride trend.\n"
    else:
        prompt += "CHANNEL EQUILIBRIUM\n"
        prompt += "Analysis: Asset trading in consolidation band.\n"

    return prompt

class HTTPHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_POST(self):
        if self.path == '/webhook/tradingview':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length) if length > 0 else b'{}'
                alert_data = json.loads(body.decode('utf-8'))
            except Exception:
                alert_data = {}

            prompt = generate_trading_prompt(alert_data)
            signal_obj = {
                "id": "SIG_" + os.urandom(3).hex().upper(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "symbol": alert_data.get('symbol', 'GOLD'),
                "price": alert_data.get('price', alert_data.get('close', 4649.237)),
                "changePercent": alert_data.get('changePercent', 1.01),
                "indicator": alert_data.get('indicator', 'TradingView Webhook'),
                "prompt": prompt,
                "rawData": alert_data
            }

            trading_signals.insert(0, signal_obj)
            if len(trading_signals) > 50:
                trading_signals.pop()

            sys.stdout.write(f"[WEBHOOK RECEIVED] Symbol: {signal_obj['symbol']}\n")
            sys.stdout.flush()

            res_bytes = json.dumps({"status": "success", "signal": signal_obj}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
            return

        self.send_error(404)

    def do_GET(self):
        if self.path == '/api/signals/latest':
            res_bytes = json.dumps(trading_signals[:15]).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
            return

        if self.path.startswith('/api/prompt/'):
            sym = self.path.replace('/api/prompt/', '').upper()
            prompt = generate_trading_prompt({"symbol": sym, "price": 4649.237, "changePercent": 1.01})
            res_bytes = json.dumps({
                "symbol": sym,
                "prompt": prompt,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
            return

        super().do_GET()

    def log_message(self, format, *args):
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stdout.flush()

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    port = 3000

    http.server.ThreadingHTTPServer.allow_reuse_address = True
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), HTTPHandler)
    sys.stdout.write(f"Server ready at http://127.0.0.1:{port}\n")
    sys.stdout.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
