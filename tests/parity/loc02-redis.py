"""Verify the paid-call governor with an isolated Redis container and no provider traffic."""
import asyncio
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/api"))
from redis.asyncio import Redis
from redis.exceptions import ConnectionError
from app.services.geocoding import ADMIT, PREFIX


async def verify(port):
    async with Redis(host="127.0.0.1", port=port, socket_timeout=1) as redis:
        for attempt in range(20):
            try:
                await redis.ping()
                break
            except ConnectionError:
                if attempt == 19:
                    raise
                await asyncio.sleep(0.25)

        async def admit(peer, minute_limit, daily_limit):
            return await redis.eval(ADMIT, 1, PREFIX, peer, minute_limit, daily_limit)

        results = await asyncio.gather(*(admit("peer", 2, 5) for _ in range(10)))
        assert results.count(1) == 2 and results.count(0) == 8
        results = await asyncio.gather(*(admit(str(i), 2, 5) for i in range(10)))
        assert results.count(1) == 3 and results.count(0) == 7
        await redis.set(PREFIX + ":cooldown", "1", ex=60)
        assert await admit("probe", 5, 100) == -1
        await redis.set(PREFIX + ":recovering", "1", ex=600)
        await redis.delete(PREFIX + ":cooldown")
        results = await asyncio.gather(*(admit("probe", 5, 100) for _ in range(10)))
        assert results.count(1) == 1 and results.count(-1) == 9


if __name__ == "__main__":
    container = subprocess.check_output([
        "docker", "run", "--rm", "--detach", "--pull=never", "-p", "127.0.0.1::6379",
        "redis:7-alpine", "redis-server", "--save", "", "--appendonly", "no",
    ], text=True).strip()
    try:
        binding = subprocess.check_output(["docker", "port", container, "6379/tcp"], text=True).strip()
        host, port = binding.rsplit(":", 1)
        assert host == "127.0.0.1"
        asyncio.run(verify(int(port)))
        print("Redis passed concurrent peer, project, cooldown and recovery checks.")
    finally:
        subprocess.run(["docker", "stop", container], check=True)
