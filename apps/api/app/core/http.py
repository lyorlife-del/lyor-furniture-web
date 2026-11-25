from time import monotonic

from starlette.responses import JSONResponse


class LegacyHttpLimits:
    def __init__(self, app):
        self.app = app
        self.windows = {}

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        client = scope.get("client")
        host = client[0] if client else ""
        now = monotonic()
        if len(self.windows) > 1000:
            self.windows = {ip: window for ip, window in self.windows.items() if window[1] > now}
        count, reset = self.windows.get(host, (0, now))
        if reset <= now:
            count, reset = 0, now + 60
        self.windows[host] = (count + 1, reset)
        if count >= 180:
            await JSONResponse({"message": "Too many requests. Please wait a minute."}, 429)(
                scope, receive, send
            )
            return
        if scope["method"] in {"POST", "PUT", "PATCH"}:
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                chunk = message.get("body", b"")
                if len(body) + len(chunk) > 128 * 1024:
                    await JSONResponse({"statusCode": 413, "message": "Request body is too large"}, 413)(
                        scope, receive, send
                    )
                    return
                body.extend(chunk)
                if not message.get("more_body", False):
                    break
            pending = bytes(body)
            content_type = dict(scope["headers"]).get(b"content-type", b"")
            if not pending and content_type.partition(b";")[0].strip().lower() == b"application/json":
                await JSONResponse({
                    "statusCode": 400,
                    "message": "Body cannot be empty when content-type is set to 'application/json'",
                }, 400)(scope, receive, send)
                return
            original_receive = receive

            async def replay():
                nonlocal pending
                if pending is None:
                    return await original_receive()
                chunk, pending = pending, None
                return {"type": "http.request", "body": chunk, "more_body": False}

            receive = replay
        await self.app(scope, receive, send)
