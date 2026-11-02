# Question tester protocol v1

An attached `.exe` must be a standalone Windows console executable. The client starts it without arguments in a temporary directory and sends one UTF-8 JSON document to stdin, then closes stdin:

```json
{
  "protocol": "edunexus.tester.v1",
  "language": "python",
  "entry": "main.py",
  "source_dir": "C:\\...\\source",
  "files": [{"path": "main.py", "content": "print(sum(map(int,input().split())))"}]
}
```

The desktop client writes all source files under `source_dir`, preserving relative paths. `entry` is relative to that folder. The tester compiles/interprets the solution, provides its own cases and compares output. Bundle any required runtime or document its installation requirements. The example `examples/sum_tester.py`, when built with PyInstaller, includes its Python runtime and tests Python solutions without a separate Python installation.

Write exactly one JSON document to stdout and exit with code zero:

```json
{
  "passed": 1,
  "total": 2,
  "cases": [
    {"name": "Basic sum", "status": "passed", "message": ""},
    {"name": "Negative values", "status": "failed", "message": "Output does not match"}
  ]
}
```

`passed` and `total` must be integers with `0 <= passed <= total <= 10000` and `total >= 1`. `cases` is optional, with at most 200 entries and no more than `total`; statuses are `passed`, `failed`, `error`, or `timeout`. Names are limited to 120 characters and messages to 1,000 characters when displayed.

Send diagnostic logs to stderr. A nonzero exit is a tester error. Missing/invalid JSON is reported as a protocol error. The entire tester/solution job is limited to 60 seconds, 512 MB and 16 processes, with up to 128 KB each of stdout and stderr. Clean up compiler/solution children and avoid interactive input or a GUI.

The client adds `duration_ms`. The browser displays local feedback for that code snapshot; final grades remain separate. Hidden grading cases should stay on a server.
