import { createServer } from "node:http";
import { Readable } from "node:stream";

function toWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else if (value != null) {
      headers.set(key, value);
    }
  }

  const method = req.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD";

  return new Request(url, {
    method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

async function sendNodeResponse(webResponse, res) {
  res.statusCode = webResponse.status;
  res.statusMessage = webResponse.statusText;

  for (const [key, value] of webResponse.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") continue;
    res.setHeader(key, value);
  }

  if (typeof webResponse.headers.getSetCookie === "function") {
    const setCookies = webResponse.headers.getSetCookie();
    if (setCookies.length > 0) {
      res.setHeader("set-cookie", setCookies);
    }
  } else {
    const setCookie = webResponse.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("set-cookie", setCookie);
    }
  }

  if (!webResponse.body) {
    res.end();
    return;
  }

  const reader = webResponse.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

const appModule = await import("./dist/server/server.js");
const app = appModule.default;

if (!app || typeof app.fetch !== "function") {
  throw new Error("Invalid TanStack Start server output: expected a default export with fetch().");
}

const server = createServer(async (req, res) => {
  try {
    const request = toWebRequest(req);
    const response = await app.fetch(request);
    await sendNodeResponse(response, res);
  } catch (error) {
    console.error("[Hostinger Runtime] Failed to handle request", error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`[Hostinger Runtime] Listening on ${host}:${port}`);
});
