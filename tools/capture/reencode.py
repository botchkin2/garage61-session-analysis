"""Rewrite a capture's chunks that DuckDB cannot read (thread 30, #1028).

Chunks written by #95 turned on byte-stream-split for integer columns, which
DuckDB 1.4 refuses to read. This rewrites every chunk of one capture folder
with the fixed writer, losslessly:

    cd tools\capture
    uv run --frozen python reencode.py "%LOCALAPPDATA%\lap-capture\<capture folder>"

Per chunk: read with pyarrow, write a .tmp beside it, check the .tmp (the same
table back from pyarrow, and every column read by the DuckDB CLI with the same
row count), then replace the original atomically. A chunk that already reads
in DuckDB is left alone. Any mismatch stops the run before that chunk is
replaced; nothing is deleted.
"""

import os
import sys
from pathlib import Path

import pyarrow.parquet as pq

import duckdb_cli
from capture import _write_table


def readable(path):
    try:
        duckdb_cli.read_every_column(path)
        return True
    except RuntimeError:
        return False


def reencode(path):
    """Rewrite one chunk. Returns 'skipped' or 'rewritten'; raises on a mismatch."""
    if readable(path):
        return "skipped"
    table = pq.read_table(path)
    tmp = Path(f"{path}.fixed")
    _write_table(tmp, {name: table[name] for name in table.column_names})
    # _write_table writes to <tmp>.tmp then renames to tmp; verify the result.
    again = pq.read_table(tmp)
    if not again.equals(table):
        tmp.unlink()
        raise RuntimeError(f"{path.name}: the rewritten chunk differs from the original")
    rows = duckdb_cli.read_every_column(tmp)
    if rows != table.num_rows:
        tmp.unlink()
        raise RuntimeError(f"{path.name}: DuckDB reads {rows} rows, the chunk has {table.num_rows}")
    os.replace(tmp, path)
    return "rewritten"


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    folder = Path(argv[1])
    chunks = sorted(folder.glob("*.parquet"))
    if not chunks:
        print(f"no .parquet chunks in {folder}")
        return 1
    if duckdb_cli.find() is None:
        print("no DuckDB CLI found: set DUCKDB or put duckdb on PATH")
        return 1
    counts = {"skipped": 0, "rewritten": 0}
    for chunk in chunks:
        counts[reencode(chunk)] += 1
    print(f"{len(chunks)} chunks: {counts['rewritten']} rewritten, {counts['skipped']} already readable")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
