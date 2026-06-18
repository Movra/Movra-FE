const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { createVisualMockServer } = require("./visual-mock-api.cjs");

const repoRoot = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const mockPort = 18080;
const vitePort = 5175;
const timeoutMs = 45_000;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requestOk(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.on("error", () => resolve(false));
    request.setTimeout(2_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === "object" && address) {
          resolve(address.port);
          return;
        }

        reject(new Error("Could not allocate a local debugging port."));
      });
    });
  });
}

function readDevToolsJson(port, pathValue, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host,
        method,
        path: pathValue,
        port,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (!response.statusCode || response.statusCode >= 400) {
            reject(new Error(`DevTools HTTP ${response.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on("error", reject);
    request.setTimeout(2_000, () => {
      request.destroy(new Error("DevTools request timed out."));
    });
    request.end();
  });
}

async function waitForDevTools(port) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await readDevToolsJson(port, "/json/version");
      return;
    } catch {
      await delay(250);
    }
  }

  throw new Error("Chrome DevTools endpoint did not become ready.");
}

async function createDevToolsPage(port, url) {
  const target = await readDevToolsJson(
    port,
    `/json/new?${encodeURIComponent(url)}`,
    "PUT",
  );

  if (!target.webSocketDebuggerUrl) {
    throw new Error("Chrome did not create a debuggable page target.");
  }

  return target.webSocketDebuggerUrl;
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));

    if (message.id && pending.has(message.id)) {
      const { reject, resolve } = pending.get(message.id);
      pending.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
        return;
      }

      resolve(message.result);
      return;
    }

    const methodListeners = listeners.get(message.method) ?? [];
    methodListeners.forEach((listener) => listener(message.params));
  });

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => {
      resolve({
        close: () => socket.close(),
        on: (method, listener) => {
          const methodListeners = listeners.get(method) ?? [];
          methodListeners.push(listener);
          listeners.set(method, methodListeners);
        },
        send: (method, params = {}) =>
          new Promise((sendResolve, sendReject) => {
            const id = nextId;
            nextId += 1;
            pending.set(id, { reject: sendReject, resolve: sendResolve });
            socket.send(JSON.stringify({ id, method, params }));
          }),
      });
    });
    socket.addEventListener("error", () => {
      reject(new Error("Chrome DevTools WebSocket failed."));
    });
  });
}

function waitForCdpEvent(client, method, waitMs) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), waitMs);
    client.on(method, (params) => {
      clearTimeout(timeout);
      resolve(params);
    });
  });
}

async function waitFor(url, label) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await requestOk(url)) {
      return;
    }

    await delay(500);
  }

  throw new Error(`${label} did not become ready: ${url}`);
}

function startVite() {
  const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");

  return spawn(
    process.execPath,
    [
      viteBin,
      "--host",
      host,
      "--port",
      String(vitePort),
      "--mode",
      "visual",
      "--strictPort",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, BROWSER: "none" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
}

function stopExistingRepoViteProcesses() {
  if (process.platform !== "win32") {
    return;
  }

  const command = [
    `$repo = ${JSON.stringify(repoRoot)};`,
    "$processes = Get-CimInstance Win32_Process | Where-Object {",
    "$_.Name -in @('node.exe', 'node') -and",
    "$_.CommandLine -and",
    "$_.CommandLine.Contains($repo) -and",
    "$_.CommandLine.Contains('vite')",
    "};",
    "$processes | ForEach-Object {",
    "Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue",
    "}",
  ].join(" ");

  spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    stdio: "ignore",
    windowsHide: true,
  });
}

function stopProcessTree(child) {
  if (!child?.pid || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

function closeServer(server) {
  if (!server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function findBrowser() {
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/usr/bin/microsoft-edge",
        ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function readPngMetadata(buffer) {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error("not a PNG file");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === "IHDR") {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
    }

    if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    }

    offset = dataEnd + 4;
  }

  return { bitDepth, colorType, height, idatChunks, width };
}

function unfilterPngRow(filter, row, previousRow, bytesPerPixel) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
    const up = previousRow[index] ?? 0;
    const upperLeft = index >= bytesPerPixel ? previousRow[index - bytesPerPixel] : 0;

    if (filter === 1) {
      row[index] = (row[index] + left) & 0xff;
    } else if (filter === 2) {
      row[index] = (row[index] + up) & 0xff;
    } else if (filter === 3) {
      row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff;
    } else if (filter === 4) {
      const predictor = left + up - upperLeft;
      const distanceLeft = Math.abs(predictor - left);
      const distanceUp = Math.abs(predictor - up);
      const distanceUpperLeft = Math.abs(predictor - upperLeft);
      const paeth =
        distanceLeft <= distanceUp && distanceLeft <= distanceUpperLeft
          ? left
          : distanceUp <= distanceUpperLeft
            ? up
            : upperLeft;
      row[index] = (row[index] + paeth) & 0xff;
    }
  }

  return row;
}

function isMostlyBlankPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const { bitDepth, colorType, height, idatChunks, width } =
    readPngMetadata(buffer);

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    return false;
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const rowLength = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  let offset = 0;
  let previousRow = Buffer.alloc(rowLength);
  let nonWhitePixels = 0;

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filter = inflated[offset];
    offset += 1;
    const row = Buffer.from(inflated.subarray(offset, offset + rowLength));
    offset += rowLength;
    unfilterPngRow(filter, row, previousRow, bytesPerPixel);

    for (let column = 0; column < rowLength; column += bytesPerPixel) {
      const red = row[column];
      const green = row[column + 1];
      const blue = row[column + 2];

      if (red < 245 || green < 245 || blue < 245) {
        nonWhitePixels += 1;
      }
    }

    previousRow = row;
  }

  return nonWhitePixels < Math.max(100, width * height * 0.002);
}

async function waitForRenderedApp(client, name) {
  const startedAt = Date.now();
  let lastState = { href: "", readyState: "", text: "" };

  while (Date.now() - startedAt < timeoutMs) {
    let value = null;
    try {
      const evaluation = await client.send("Runtime.evaluate", {
        expression: `(() => {
          const root = document.getElementById("root");
          const text = document.body?.innerText || "";
          return {
            href: window.location.href,
            readyState: document.readyState,
            rootChildren: root?.children.length || 0,
            text,
          };
        })()`,
        returnByValue: true,
      });
      value = evaluation.result?.value;
    } catch {
      // The execution context can briefly disappear while Vite replaces modules.
      await delay(500);
      continue;
    }

    lastState = {
      href: value?.href ?? lastState.href,
      readyState: value?.readyState ?? lastState.readyState,
      text: value?.text ?? lastState.text,
    };

    if (
      value?.text.includes("불러오지 못했습니다") ||
      value?.text.includes("요청 처리에 실패")
    ) {
      throw new Error(`${name} rendered an error state: ${value.text.slice(0, 160)}`);
    }

    if (
      value?.rootChildren > 0 &&
      value.text.trim().length > 0 &&
      !value.text.includes("불러오는 중")
    ) {
      return;
    }

    await delay(500);
  }

  throw new Error(
    `${name} did not finish rendering. href=${lastState.href} readyState=${
      lastState.readyState
    } text=${lastState.text.slice(0, 160)}`,
  );
}

async function captureScreenshot(browserPath, profileRoot, screenshotRoot, route, name, size) {
  const profileDir = fs.mkdtempSync(path.join(profileRoot, `${name}-`));
  const debugPort = await getFreePort();
  const screenshotPath = path.join(screenshotRoot, `${name}.png`);
  const url = `http://${host}:${vitePort}${route}`;
  const [width, height] = size.split(",").map(Number);
  const browserProcess = spawn(
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      `--window-size=${size}`,
      "about:blank",
    ],
    {
      cwd: repoRoot,
      stdio: "ignore",
      windowsHide: true,
    },
  );
  let client = null;
  const browserErrors = [];

  try {
    await waitForDevTools(debugPort);
    const webSocketUrl = await createDevToolsPage(debugPort, url);
    client = await createCdpClient(webSocketUrl);
    client.on("Runtime.exceptionThrown", (params) => {
      browserErrors.push(params.exceptionDetails?.text ?? "Runtime exception");
    });
    client.on("Log.entryAdded", (params) => {
      const entry = params.entry;
      if (
        entry?.level === "error" &&
        entry.source !== "network" &&
        !entry.text?.includes("favicon")
      ) {
        browserErrors.push(entry.text);
      }
    });

    await client.send("Runtime.enable");
    await client.send("Log.enable");
    await client.send("Page.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height,
      mobile: width <= 480,
      width,
    });

    const loadEvent = waitForCdpEvent(client, "Page.loadEventFired", 15_000);
    await client.send("Page.reload", { ignoreCache: true });
    await loadEvent;
    await waitForRenderedApp(client, name);
    await delay(500);

    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    });
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

    const screenshotSize = fs.existsSync(screenshotPath)
      ? fs.statSync(screenshotPath).size
      : 0;
    if (screenshotSize === 0) {
      throw new Error(`Chrome screenshot failed for ${name}`);
    }

    if (isMostlyBlankPng(screenshotPath)) {
      throw new Error(`Chrome screenshot was blank for ${name}`);
    }

    if (browserErrors.length > 0) {
      throw new Error(
        `${name} emitted browser errors: ${browserErrors.slice(0, 3).join(" | ")}`,
      );
    }

    return screenshotPath;
  } finally {
    client?.close();
    stopProcessTree(browserProcess);
  }
}

async function captureScreenshotWithRetry(
  browserPath,
  profileRoot,
  screenshotRoot,
  route,
  name,
  size,
) {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await captureScreenshot(
        browserPath,
        profileRoot,
        screenshotRoot,
        route,
        name,
        size,
      );
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        console.log(`[visual-smoke] retrying ${name}: ${error.message}`);
        await delay(1_000);
      }
    }
  }

  throw lastError ?? new Error(`Chrome screenshot failed for ${name}`);
}

async function main() {
  const { server } = createVisualMockServer({ host, port: mockPort });
  const profileRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "movra-visual-smoke-"),
  );
  const screenshotRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "movra-visual-screenshots-"),
  );
  let viteProcess = null;

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(mockPort, host, resolve);
    });

    stopExistingRepoViteProcesses();
    viteProcess = startVite();
    const viteOutput = [];
    viteProcess.stdout.on("data", (chunk) => {
      viteOutput.push(chunk.toString());
    });
    viteProcess.stderr.on("data", (chunk) => {
      viteOutput.push(chunk.toString());
    });

    await waitFor(`http://${host}:${mockPort}/home/today`, "visual mock API");
    await waitFor(`http://${host}:${vitePort}/future-vision`, "Vite visual app");

    const browserPath = findBrowser();
    if (!browserPath) {
      throw new Error("Chrome or Edge was not found for visual smoke screenshots.");
    }

    const screenshots = [
      await captureScreenshotWithRetry(
        browserPath,
        profileRoot,
        screenshotRoot,
        "/",
        "home-desktop",
        "1440,900",
      ),
      await captureScreenshotWithRetry(
        browserPath,
        profileRoot,
        screenshotRoot,
        "/",
        "home-mobile",
        "390,844",
      ),
      await captureScreenshotWithRetry(
        browserPath,
        profileRoot,
        screenshotRoot,
        "/future-vision",
        "future-desktop",
        "1440,900",
      ),
      await captureScreenshotWithRetry(
        browserPath,
        profileRoot,
        screenshotRoot,
        "/future-vision",
        "future-mobile",
        "390,844",
      ),
      await captureScreenshotWithRetry(
        browserPath,
        profileRoot,
        screenshotRoot,
        "/exam-schedules",
        "exams-desktop",
        "1440,900",
      ),
      await captureScreenshotWithRetry(
        browserPath,
        profileRoot,
        screenshotRoot,
        "/exam-schedules",
        "exams-mobile",
        "390,844",
      ),
    ];

    console.log("[visual-smoke] screenshots:");
    screenshots.forEach((screenshotPath) => {
      console.log(`- ${screenshotPath}`);
    });
  } finally {
    stopProcessTree(viteProcess);
    await closeServer(server);
    try {
      fs.rmSync(profileRoot, { force: true, recursive: true });
    } catch {
      console.warn(`[visual-smoke] temp profile cleanup skipped: ${profileRoot}`);
    }
  }
}

main().catch((error) => {
  console.error(`[visual-smoke] ${error.message}`);
  process.exitCode = 1;
});
