"use strict";

const path = require("node:path");
const { app, BrowserWindow, Menu } = require("electron");

if (require("electron-squirrel-startup")) app.quit();

const isSmokeTest = process.argv.includes("--smoke-test");
let mainWindow = null;
let smokeTestTimer = null;

function finishSmokeTest(code, details) {
  if (smokeTestTimer) clearTimeout(smokeTestTimer);
  if (details) console.log(JSON.stringify(details));
  app.exit(code);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1050,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#1c281e",
    icon: path.join(__dirname, "assets", "stonewatch-keep.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", event => event.preventDefault());
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const toggleFullscreen = input.type === "keyDown" &&
      (input.key === "F11" || (input.alt && input.key === "Enter"));
    if (!toggleFullscreen) return;
    event.preventDefault();
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  if (isSmokeTest) {
    smokeTestTimer = setTimeout(() => finishSmokeTest(1, { ok: false, error: "Game load timed out." }), 15000);
    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      finishSmokeTest(1, { ok: false, errorCode, errorDescription });
    });
    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      finishSmokeTest(1, { ok: false, error: "Renderer stopped unexpectedly.", details });
    });
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const result = await mainWindow.webContents.executeJavaScript(`({
          title: document.title,
          hasCanvas: document.querySelector("#gameCanvas") instanceof HTMLCanvasElement,
          hasThree: typeof window.THREE === "object",
          hasGraphics: typeof window.ThreeGraphics === "function",
          hasWheelZoom: typeof window.ThreeGraphics?.prototype?.zoomBy === "function",
          hasCameraReset: Boolean(document.querySelector("#cameraResetButton")),
          towerCards: document.querySelectorAll(".tower-card").length
        })`);
        const ok = result.title === "Stonewatch Keep" && result.hasCanvas && result.hasThree &&
          result.hasGraphics && result.hasWheelZoom && result.hasCameraReset && result.towerCards >= 6;
        finishSmokeTest(ok ? 0 : 1, { ok, ...result });
      } catch (error) {
        finishSmokeTest(1, { ok: false, error: error.message });
      }
    });
  } else {
    mainWindow.once("ready-to-show", () => mainWindow.show());
  }

  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
