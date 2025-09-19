import csv, sqlite3, datetime
from pathlib import Path

# ---- EDIT THESE FILENAMES ----
TRIPS_CSV = Path("./data/trip_data.csv")
USERS_CSV = Path("./data/customer_demographics.csv")          # has: User ID (and maybe Age you don't need)
MAP_CSV   = Path("./data/checked_in.csv")     # has: Trip ID,User ID
DB_PATH   = "rides.sqlite"
# --------------------------------

def qident(name: str) -> str:
    # Quote an identifier for SQLite (keep spaces/punctuation exactly)
    return '"' + name.replace('"', '""') + '"'

def create_raw_table(conn, table_name: str, headers: list[str]):
    cols = ", ".join(f"{qident(h)} TEXT" for h in headers)  # TEXT = exact-as-CSV
    conn.execute(f"DROP TABLE IF EXISTS {qident(table_name)};")
    conn.execute(f"CREATE TABLE {qident(table_name)} ({cols});")

def load_csv(conn, table_name: str, csv_path: Path):
    with csv_path.open(newline="") as f:
        r = csv.DictReader(f)
        headers = r.fieldnames or []
        create_raw_table(conn, table_name, headers)
        placeholders = ", ".join(["?"] * len(headers))
        cols = ", ".join(qident(h) for h in headers)
        rows = []
        for row in r:
            rows.append([row.get(h, None) for h in headers])
        if rows:
            conn.executemany(
                f"INSERT INTO {qident(table_name)} ({cols}) VALUES ({placeholders})",
                rows,
            )

def main():
    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON;")

    # 1) Load RAW tables exactly as CSV (names + strings preserved)
    load_csv(con, "raw_trips", TRIPS_CSV)
    load_csv(con, "raw_users", USERS_CSV)
    load_csv(con, "raw_trip_users", MAP_CSV)

    # 2) Optional: lightweight normalized views (read-only) built FROM the raw tables.
    # These don’t modify raw tables and won’t rename your CSV columns.
    con.executescript("""
    DROP VIEW IF EXISTS users;
    DROP VIEW IF EXISTS trips;
    DROP VIEW IF EXISTS trip_users;

    -- users: distinct user ids with age data from raw_users
    CREATE VIEW users AS
    WITH all_ids AS (
      SELECT DISTINCT "User ID" AS user_id FROM raw_users
      UNION
      SELECT DISTINCT "Booking User ID" FROM raw_trips
      UNION
      SELECT DISTINCT "User ID" FROM raw_trip_users
    )
    SELECT 
      ai.user_id,
      ru."Age" AS age
    FROM all_ids ai
    LEFT JOIN raw_users ru ON ai.user_id = ru."User ID"
    WHERE ai.user_id IS NOT NULL AND ai.user_id <> '';

    -- trips: thin projection with clearer aliases (read-only)
    CREATE VIEW trips AS
    SELECT
      "Trip ID"               AS trip_id,
      "Booking User ID"       AS booking_user_id,
      "Trip Date and Time"    AS started_at,
      "Pick Up Latitude"      AS pickup_lat,
      "Pick Up Longitude"     AS pickup_lng,
      "Drop Off Latitude"     AS dropoff_lat,
      "Drop Off Longitude"    AS dropoff_lng,
      "Pick Up Address"       AS pickup_address,
      "Drop Off Address"      AS dropoff_address,
      "Total Passengers"      AS total_passengers
    FROM raw_trips;

    -- trip_users: include booker as participant (union)
    CREATE VIEW trip_users AS
    SELECT DISTINCT
      rt."Trip ID" AS trip_id,
      rt."Booking User ID" AS user_id,
      'booker' AS role
    FROM raw_trips rt
    UNION
    SELECT DISTINCT
      rtu."Trip ID" AS trip_id,
      rtu."User ID" AS user_id,
      NULL AS role
    FROM raw_trip_users rtu;
    """)

    con.commit()
    # Quick counts
    cur = con.cursor()
    raw_t = cur.execute('SELECT COUNT(*) FROM "raw_trips"').fetchone()[0]
    raw_u = cur.execute('SELECT COUNT(*) FROM "raw_users"').fetchone()[0]
    raw_m = cur.execute('SELECT COUNT(*) FROM "raw_trip_users"').fetchone()[0]
    print(f"Loaded RAW: trips={raw_t}, users_rows={raw_u}, trip_users_rows={raw_m}")
    # Views exist now for querying
    con.close()
    print(f"SQLite DB created at: {DB_PATH}\n"
          f"- Raw tables: raw_trips, raw_users, raw_trip_users (exact CSV columns)\n"
          f"- Views: trips, users, trip_users (read-only, normalized-ish)")

if __name__ == "__main__":
    main()