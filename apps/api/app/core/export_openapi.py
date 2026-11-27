"""Export the additive FastAPI contract without credentials or database access."""

import json
from pathlib import Path

from app.main import create_app


def main():
    destination = Path(__file__).resolve().parents[4] / "packages/api-contracts/fastapi-openapi.json"
    destination.write_text(json.dumps(create_app().openapi(), indent=2, sort_keys=True) + "\n",
                           encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
