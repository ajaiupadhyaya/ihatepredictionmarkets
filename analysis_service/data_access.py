import os
import sqlite3
from contextlib import contextmanager

import pandas as pd

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(ROOT_DIR, "db", "markets.sqlite")


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()


def load_markets(resolved_only: bool | None = None) -> pd.DataFrame:
    """Load markets from the SQLite DB into a DataFrame."""
    with get_conn() as conn:
        where = []
        if resolved_only is True:
            where.append("m.resolved_outcome IS NOT NULL")
        elif resolved_only is False:
            where.append("m.resolved_outcome IS NULL")

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""

        query = f"""
            SELECT
                m.*,
                e.name AS exchange
            FROM markets m
            JOIN exchanges e ON m.exchange_id = e.id
            {where_sql}
        """
        df = pd.read_sql_query(query, conn)

    return df


def load_prices_for_markets(market_ids: list[int]) -> pd.DataFrame:
    if not market_ids:
        return pd.DataFrame()

    with get_conn() as conn:
        placeholders = ",".join(["?"] * len(market_ids))
        query = f"""
            SELECT
                p.*,
                m.exchange_id,
                m.external_id,
                m.category
            FROM prices p
            JOIN markets m ON p.market_id = m.id
            WHERE p.market_id IN ({placeholders})
            ORDER BY p.market_id, p.timestamp
        """
        df = pd.read_sql_query(query, conn, params=market_ids)

    return df

