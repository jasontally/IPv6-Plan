#!/usr/bin/env node

/**
 * Version Management Script for IPv6 Subnet Planner
 *
 * Uses VERSION file as single source of truth.
 * Updates all version references across the codebase.
 *
 * Usage:
 *   node scripts/version.js --increment-patch    # Increment patch version
 *   node scripts/version.js --increment-minor    # Increment minor version
 *   node scripts/version.js --increment-major    # Increment major version
 *   node scripts/version.js --get-version          # Get current version
 *   node scripts/version.js --set-version X.Y.Z  # Set specific version
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const VERSION_FILE = path.join(PROJECT_ROOT, "VERSION");

// Define all files that contain version references
const VERSION_LOCATIONS = [
  {
    file: "index.html",
    patterns: [
      {
        regex:
          /<meta name="generator" content="IPv6 Subnet Planner v(\d+\.\d+\.\d+)">/g,
        template:
          '<meta name="generator" content="IPv6 Subnet Planner v{{version}}">',
      },
      {
        regex: /<span id="version-display">[\d.]+<\/span>/g,
        template: '<span id="version-display">{{version}}</span>',
      },
      { regex: /Version ([\d.]+)/g, template: "Version {{version}}" },
      { regex: /app\.js\?v=[\d.]+/g, template: "app.js?v={{version}}" },
    ],
  },
  {
    file: "README.md",
    patterns: [
      {
        regex: /\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/g,
        template: "**Version**: {{version}}",
      },
    ],
  },
  {
    file: "package.json",
    patterns: [
      {
        regex: /"version":\s*"(\d+\.\d+\.\d+)"/g,
        template: '"version": "{{version}}"',
      },
    ],
  },
  {
    file: "package-lock.json",
    patterns: [
      {
        regex: /"version":\s*"(\d+\.\d+\.\d+)"/g,
        template: '"version": "{{version}}"',
      },
    ],
  },
  {
    file: "VERSION",
    patterns: [{ regex: /^(\d+\.\d+\.\d+)$/gm, template: "{{version}}" }],
  },
];

class VersionManager {
  constructor() {
    this.currentVersion = this.readVersionFile();
  }

  readVersionFile() {
    try {
      const content = fs.readFileSync(VERSION_FILE, "utf8").trim();
      if (this.validateVersion(content)) {
        return content;
      }
    } catch (error) {
      console.error(`Error reading VERSION file: ${error.message}`);
    }
    return "0.1.0";
  }

  validateVersion(version) {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  parseVersion(version) {
    const [major, minor, patch] = version.split(".").map(Number);
    return { major, minor, patch };
  }

  getCurrentVersion() {
    return this.currentVersion;
  }

  incrementPatch() {
    const { major, minor, patch } = this.parseVersion(this.currentVersion);
    const newVersion = `${major}.${minor}.${patch + 1}`;
    this.updateVersion(newVersion);
    return newVersion;
  }

  incrementMinor() {
    const { major, minor } = this.parseVersion(this.currentVersion);
    const newVersion = `${major}.${minor + 1}.0`;
    this.updateVersion(newVersion);
    return newVersion;
  }

  incrementMajor() {
    const { major } = this.parseVersion(this.currentVersion);
    const newVersion = `${major + 1}.0.0`;
    this.updateVersion(newVersion);
    return newVersion;
  }

  setVersion(newVersion) {
    if (!this.validateVersion(newVersion)) {
      throw new Error(
        `Invalid version format: ${newVersion}. Expected format: X.Y.Z`,
      );
    }
    this.updateVersion(newVersion);
    return newVersion;
  }

  updateVersion(newVersion) {
    this.currentVersion = newVersion;

    let updatedFiles = [];

    for (const location of VERSION_LOCATIONS) {
      const filePath = path.join(PROJECT_ROOT, location.file);

      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${location.file} not found, skipping...`);
        continue;
      }

      let content = fs.readFileSync(filePath, "utf8");
      let fileUpdated = false;

      for (const pattern of location.patterns) {
        const newContent = content.replace(
          pattern.regex,
          pattern.template.replace("{{version}}", newVersion),
        );
        if (newContent !== content) {
          content = newContent;
          fileUpdated = true;
        }
      }

      if (fileUpdated) {
        fs.writeFileSync(filePath, content, "utf8");
        updatedFiles.push(location.file);
      }
    }

    if (updatedFiles.length > 0) {
      console.log(
        `Updated version to ${newVersion} in: ${updatedFiles.join(", ")}`,
      );
    } else {
      console.log(`Version already up to date: ${newVersion}`);
    }

    return newVersion;
  }

  syncVersions() {
    console.log(`Syncing all files to version ${this.currentVersion}...`);
    return this.updateVersion(this.currentVersion);
  }
}

// Command line interface
function main() {
  const manager = new VersionManager();
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Version Manager for IPv6 Subnet Planner");
    console.log("");
    console.log("Usage:");
    console.log(
      "  node scripts/version.js --increment-patch   # Increment patch version (X.Y.Z → X.Y.Z+1)",
    );
    console.log(
      "  node scripts/version.js --increment-minor   # Increment minor version (X.Y.Z → X.Y+1.0)",
    );
    console.log(
      "  node scripts/version.js --increment-major   # Increment major version (X.Y.Z → X+1.0.0)",
    );
    console.log(
      "  node scripts/version.js --get-version       # Get current version",
    );
    console.log(
      "  node scripts/version.js --set-version X.Y.Z # Set specific version",
    );
    console.log(
      "  node scripts/version.js --sync              # Sync all files to VERSION file",
    );
    console.log("");
    console.log("Current version:", manager.getCurrentVersion());
    return;
  }

  try {
    if (args.includes("--increment-patch")) {
      const newVersion = manager.incrementPatch();
      console.log(`Incremented patch version to ${newVersion}`);
    } else if (args.includes("--increment-minor")) {
      const newVersion = manager.incrementMinor();
      console.log(`Incremented minor version to ${newVersion}`);
    } else if (args.includes("--increment-major")) {
      const newVersion = manager.incrementMajor();
      console.log(`Incremented major version to ${newVersion}`);
    } else if (args.includes("--get-version")) {
      console.log(manager.getCurrentVersion());
    } else if (args.includes("--set-version")) {
      const versionIndex = args.indexOf("--set-version") + 1;
      const newVersion = args[versionIndex];
      if (newVersion) {
        manager.setVersion(newVersion);
        console.log(`Set version to ${newVersion}`);
      } else {
        console.error("Error: Version required. Use --set-version X.Y.Z");
        process.exit(1);
      }
    } else if (args.includes("--sync")) {
      manager.syncVersions();
    } else {
      console.log("Version Manager for IPv6 Subnet Planner");
      console.log("");
      console.log("Usage:");
      console.log(
        "  node scripts/version.js --increment-patch   # Increment patch version",
      );
      console.log(
        "  node scripts/version.js --increment-minor   # Increment minor version",
      );
      console.log(
        "  node scripts/version.js --increment-major   # Increment major version",
      );
      console.log(
        "  node scripts/version.js --get-version       # Get current version",
      );
      console.log(
        "  node scripts/version.js --set-version X.Y.Z # Set specific version",
      );
      console.log(
        "  node scripts/version.js --sync              # Sync all files to VERSION file",
      );
      console.log(
        "  node scripts/version.js --help              # Show this help",
      );
      console.log("");
      console.log("Current version:", manager.getCurrentVersion());
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { VersionManager };
