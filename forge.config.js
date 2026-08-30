"use strict";

const path = require("node:path");

const iconPath = path.join(__dirname, "assets", "stonewatch-keep.ico");

module.exports = {
  packagerConfig: {
    asar: true,
    icon: iconPath,
    executableName: "Stonewatch Keep",
    ignore: [
      /^\/\.git(?:\/|$)/,
      /^\/out(?:\/|$)/,
      /^\/node_modules\.pnpm-backup(?:\/|$)/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "stonewatch_keep",
        setupExe: "Stonewatch-Keep-Setup.exe",
        setupIcon: iconPath
      }
    }
  ]
};
