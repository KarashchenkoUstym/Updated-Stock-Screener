#!/usr/bin/env python3
"""
Build data/stocks.json from real market data.

Source: Yahoo Finance's public v8 chart endpoint (no API key, no account).
For each ticker we pull one year of daily bars and derive the screening metrics
ourselves, so every number in the app traces back to real observed prices.

Sector/industry labels are a static map below - those are stable public facts,
not market data, so there's nothing to fetch.

Usage:  python3 scripts/fetch_data.py
"""

import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "stocks.json"
CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=1y&interval=1d"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 stock-screener/1.0"

# Ticker -> (company name, sector). Curated US large/mid caps across every sector
# so the screener has something interesting to filter on.
UNIVERSE = {
    "AAPL": ("Apple Inc.", "Technology"),
    "MSFT": ("Microsoft Corporation", "Technology"),
    "NVDA": ("NVIDIA Corporation", "Technology"),
    "AVGO": ("Broadcom Inc.", "Technology"),
    "ORCL": ("Oracle Corporation", "Technology"),
    "CRM": ("Salesforce, Inc.", "Technology"),
    "AMD": ("Advanced Micro Devices, Inc.", "Technology"),
    "ADBE": ("Adobe Inc.", "Technology"),
    "CSCO": ("Cisco Systems, Inc.", "Technology"),
    "ACN": ("Accenture plc", "Technology"),
    "INTC": ("Intel Corporation", "Technology"),
    "IBM": ("International Business Machines", "Technology"),
    "QCOM": ("QUALCOMM Incorporated", "Technology"),
    "TXN": ("Texas Instruments Incorporated", "Technology"),
    "MU": ("Micron Technology, Inc.", "Technology"),
    "AMAT": ("Applied Materials, Inc.", "Technology"),
    "PANW": ("Palo Alto Networks, Inc.", "Technology"),
    "SNOW": ("Snowflake Inc.", "Technology"),
    "SHOP": ("Shopify Inc.", "Technology"),
    "UBER": ("Uber Technologies, Inc.", "Technology"),

    "GOOGL": ("Alphabet Inc.", "Communication Services"),
    "META": ("Meta Platforms, Inc.", "Communication Services"),
    "NFLX": ("Netflix, Inc.", "Communication Services"),
    "DIS": ("The Walt Disney Company", "Communication Services"),
    "CMCSA": ("Comcast Corporation", "Communication Services"),
    "T": ("AT&T Inc.", "Communication Services"),
    "VZ": ("Verizon Communications Inc.", "Communication Services"),
    "TMUS": ("T-Mobile US, Inc.", "Communication Services"),
    "EA": ("Electronic Arts Inc.", "Communication Services"),
    "SPOT": ("Spotify Technology S.A.", "Communication Services"),

    "AMZN": ("Amazon.com, Inc.", "Consumer Discretionary"),
    "TSLA": ("Tesla, Inc.", "Consumer Discretionary"),
    "HD": ("The Home Depot, Inc.", "Consumer Discretionary"),
    "MCD": ("McDonald's Corporation", "Consumer Discretionary"),
    "NKE": ("NIKE, Inc.", "Consumer Discretionary"),
    "SBUX": ("Starbucks Corporation", "Consumer Discretionary"),
    "LOW": ("Lowe's Companies, Inc.", "Consumer Discretionary"),
    "BKNG": ("Booking Holdings Inc.", "Consumer Discretionary"),
    "TJX": ("The TJX Companies, Inc.", "Consumer Discretionary"),
    "GM": ("General Motors Company", "Consumer Discretionary"),
    "F": ("Ford Motor Company", "Consumer Discretionary"),
    "MAR": ("Marriott International, Inc.", "Consumer Discretionary"),

    "WMT": ("Walmart Inc.", "Consumer Staples"),
    "PG": ("The Procter & Gamble Company", "Consumer Staples"),
    "KO": ("The Coca-Cola Company", "Consumer Staples"),
    "PEP": ("PepsiCo, Inc.", "Consumer Staples"),
    "COST": ("Costco Wholesale Corporation", "Consumer Staples"),
    "PM": ("Philip Morris International Inc.", "Consumer Staples"),
    "MDLZ": ("Mondelez International, Inc.", "Consumer Staples"),
    "CL": ("Colgate-Palmolive Company", "Consumer Staples"),
    "KHC": ("The Kraft Heinz Company", "Consumer Staples"),
    "GIS": ("General Mills, Inc.", "Consumer Staples"),

    "BRK-B": ("Berkshire Hathaway Inc.", "Financials"),
    "JPM": ("JPMorgan Chase & Co.", "Financials"),
    "V": ("Visa Inc.", "Financials"),
    "MA": ("Mastercard Incorporated", "Financials"),
    "BAC": ("Bank of America Corporation", "Financials"),
    "WFC": ("Wells Fargo & Company", "Financials"),
    "GS": ("The Goldman Sachs Group, Inc.", "Financials"),
    "MS": ("Morgan Stanley", "Financials"),
    "AXP": ("American Express Company", "Financials"),
    "BLK": ("BlackRock, Inc.", "Financials"),
    "C": ("Citigroup Inc.", "Financials"),
    "SCHW": ("The Charles Schwab Corporation", "Financials"),

    "LLY": ("Eli Lilly and Company", "Health Care"),
    "UNH": ("UnitedHealth Group Incorporated", "Health Care"),
    "JNJ": ("Johnson & Johnson", "Health Care"),
    "ABBV": ("AbbVie Inc.", "Health Care"),
    "MRK": ("Merck & Co., Inc.", "Health Care"),
    "TMO": ("Thermo Fisher Scientific Inc.", "Health Care"),
    "ABT": ("Abbott Laboratories", "Health Care"),
    "PFE": ("Pfizer Inc.", "Health Care"),
    "AMGN": ("Amgen Inc.", "Health Care"),
    "GILD": ("Gilead Sciences, Inc.", "Health Care"),
    "CVS": ("CVS Health Corporation", "Health Care"),
    "ISRG": ("Intuitive Surgical, Inc.", "Health Care"),

    "CAT": ("Caterpillar Inc.", "Industrials"),
    "GE": ("General Electric Company", "Industrials"),
    "RTX": ("RTX Corporation", "Industrials"),
    "HON": ("Honeywell International Inc.", "Industrials"),
    "UNP": ("Union Pacific Corporation", "Industrials"),
    "BA": ("The Boeing Company", "Industrials"),
    "LMT": ("Lockheed Martin Corporation", "Industrials"),
    "DE": ("Deere & Company", "Industrials"),
    "UPS": ("United Parcel Service, Inc.", "Industrials"),
    "MMM": ("3M Company", "Industrials"),

    "XOM": ("Exxon Mobil Corporation", "Energy"),
    "CVX": ("Chevron Corporation", "Energy"),
    "COP": ("ConocoPhillips", "Energy"),
    "SLB": ("Schlumberger Limited", "Energy"),
    "EOG": ("EOG Resources, Inc.", "Energy"),
    "PSX": ("Phillips 66", "Energy"),

    "NEE": ("NextEra Energy, Inc.", "Utilities"),
    "DUK": ("Duke Energy Corporation", "Utilities"),
    "SO": ("The Southern Company", "Utilities"),
    "AEP": ("American Electric Power", "Utilities"),

    "LIN": ("Linde plc", "Materials"),
    "SHW": ("The Sherwin-Williams Company", "Materials"),
    "FCX": ("Freeport-McMoRan Inc.", "Materials"),
    "NEM": ("Newmont Corporation", "Materials"),

    "PLD": ("Prologis, Inc.", "Real Estate"),
    "AMT": ("American Tower Corporation", "Real Estate"),
    "SPG": ("Simon Property Group, Inc.", "Real Estate"),
    "O": ("Realty Income Corporation", "Real Estate"),
}


def fetch(symbol):
    req = urllib.request.Request(CHART.format(sym=symbol), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.load(resp)


def pct(a, b):
    """Percent change from b to a."""
    if not a or not b:
        return None
    return round((a - b) / b * 100, 2)


def derive(symbol, payload):
    """Turn a year of daily bars into the metrics the screener filters on."""
    result = payload["chart"]["result"][0]
    meta = result["meta"]
    quote = result["indicators"]["quote"][0]

    closes = [c for c in quote.get("close") or [] if c is not None]
    volumes = [v for v in quote.get("volume") or [] if v is not None]
    if len(closes) < 60:
        raise ValueError(f"only {len(closes)} usable closes")

    price = meta.get("regularMarketPrice") or closes[-1]
    hi52 = meta.get("fiftyTwoWeekHigh")
    lo52 = meta.get("fiftyTwoWeekLow")

    # Trailing returns. ~21 trading days per month.
    def back(n):
        return closes[-n] if len(closes) > n else closes[0]

    # Annualised volatility from daily log-ish returns.
    rets = [(closes[i] - closes[i - 1]) / closes[i - 1]
            for i in range(1, len(closes)) if closes[i - 1]]
    vol = round(statistics.pstdev(rets) * (252 ** 0.5) * 100, 2) if len(rets) > 30 else None

    # 50/200-day simple moving averages - classic screening signals.
    sma50 = round(sum(closes[-50:]) / len(closes[-50:]), 2) if len(closes) >= 50 else None
    sma200 = round(sum(closes[-200:]) / len(closes[-200:]), 2) if len(closes) >= 200 else None

    name, sector = UNIVERSE[symbol]
    return {
        "symbol": symbol,
        "name": name,
        "sector": sector,
        "price": round(price, 2),
        "change_1m": pct(price, back(21)),
        "change_3m": pct(price, back(63)),
        "change_1y": pct(price, closes[0]),
        "high_52w": round(hi52, 2) if hi52 else None,
        "low_52w": round(lo52, 2) if lo52 else None,
        "pct_off_high": pct(price, hi52) if hi52 else None,
        "volatility": vol,
        "avg_volume": int(sum(volumes[-30:]) / len(volumes[-30:])) if volumes else None,
        "sma50": sma50,
        "sma200": sma200,
    }


def main():
    rows, failed = [], []
    total = len(UNIVERSE)
    for i, symbol in enumerate(UNIVERSE, 1):
        try:
            rows.append(derive(symbol, fetch(symbol)))
            print(f"[{i}/{total}] {symbol}", flush=True)
        except (urllib.error.URLError, KeyError, IndexError, ValueError, TypeError) as e:
            failed.append(symbol)
            print(f"[{i}/{total}] {symbol} FAILED: {e}", file=sys.stderr, flush=True)
        time.sleep(0.25)   # be polite to a free endpoint

    if not rows:
        sys.exit("No data fetched - aborting rather than writing an empty dataset.")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "Yahoo Finance v8 chart API",
        "count": len(rows),
        "stocks": sorted(rows, key=lambda r: r["symbol"]),
    }, indent=1))
    print(f"\nWrote {len(rows)} stocks to {OUT}")
    if failed:
        print(f"Failed ({len(failed)}): {', '.join(failed)}")


if __name__ == "__main__":
    main()
