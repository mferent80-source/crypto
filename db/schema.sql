PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS monitor_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant TEXT NOT NULL DEFAULT 'monitor',
  ts INTEGER NOT NULL,
  market TEXT NOT NULL,
  provider TEXT NOT NULL,
  mode TEXT,
  universe_n INTEGER DEFAULT 0,
  processed_n INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  top_symbol TEXT,
  top_score REAL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_monitor_runs_ts ON monitor_runs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_monitor_runs_market_ts ON monitor_runs(market, ts DESC);

CREATE TABLE IF NOT EXISTS monitor_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  market TEXT NOT NULL,
  symbol TEXT NOT NULL,
  source TEXT,
  bias TEXT,
  score REAL,
  confidence REAL,
  adx REAL,
  rsi REAL,
  regime TEXT,
  price REAL,
  change_pct REAL,
  turnover REAL,
  payload_json TEXT,
  FOREIGN KEY(run_id) REFERENCES monitor_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monitor_items_run_rank ON monitor_items(run_id, rank);
CREATE INDEX IF NOT EXISTS idx_monitor_items_symbol ON monitor_items(market, symbol);

CREATE TABLE IF NOT EXISTS research_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant TEXT NOT NULL DEFAULT 'legacy',
  ts INTEGER NOT NULL,
  market TEXT NOT NULL,
  symbol TEXT NOT NULL,
  source TEXT NOT NULL,
  tf TEXT,
  mode TEXT,
  score REAL,
  opportunity REAL,
  regime TEXT,
  direction TEXT,
  confidence REAL,
  price REAL,
  payload_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_symbol_ts ON research_snapshots(market, symbol, ts DESC);

CREATE TABLE IF NOT EXISTS signal_snapshots (
  id TEXT PRIMARY KEY,
  tenant TEXT NOT NULL DEFAULT 'legacy',
  ts INTEGER NOT NULL,
  updated_ts INTEGER NOT NULL,
  market TEXT NOT NULL,
  symbol TEXT NOT NULL,
  source TEXT NOT NULL,
  tf TEXT,
  mode TEXT,
  direction TEXT,
  confidence REAL,
  status TEXT,
  net_r REAL,
  payload_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_signal_ts ON signal_snapshots(updated_ts DESC);
CREATE INDEX IF NOT EXISTS idx_signal_symbol ON signal_snapshots(market, symbol, updated_ts DESC);

CREATE TABLE IF NOT EXISTS app_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant TEXT NOT NULL DEFAULT 'monitor',
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  market TEXT,
  symbol TEXT,
  source TEXT,
  severity TEXT,
  title TEXT,
  message TEXT,
  payload_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_ts ON app_events(ts DESC);

CREATE TABLE IF NOT EXISTS monitor_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_monitor_runs_tenant_ts ON monitor_runs(tenant, ts DESC);

CREATE INDEX IF NOT EXISTS idx_research_tenant_ts ON research_snapshots(tenant, ts DESC);

CREATE INDEX IF NOT EXISTS idx_signal_tenant_ts ON signal_snapshots(tenant, updated_ts DESC);

CREATE INDEX IF NOT EXISTS idx_events_tenant_ts ON app_events(tenant, ts DESC);
