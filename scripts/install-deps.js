#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Parse command line arguments
const args = process.argv.slice(2);
const removePackageLock = args.includes("--remove-lock") || args.includes("-r");
const ignorePlatformErrors =
  args.includes("--ignore-platform") || args.includes("-i");
const skipBinaryTmp = args.includes("--skip-binary-tmp") || args.includes("-s");

// Root directory to start the search
const rootDir = path.resolve(__dirname, "..");

// Function to find all directories with package.json
function findPackageJsonDirs(startDir) {
  const packageDirs = [];

  function scanDir(dir) {
    try {
      // Skip binary/tmp directories if the flag is set
      if (skipBinaryTmp && dir.includes("binary/tmp")) {
        return;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      // Check if current directory has package.json
      if (
        entries.some((entry) => entry.isFile() && entry.name === "package.json")
      ) {
        packageDirs.push(dir);
      }

      // Recursively scan subdirectories, but skip node_modules
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== "node_modules") {
          scanDir(path.join(dir, entry.name));
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }

  scanDir(startDir);
  return packageDirs;
}

// Print usage information
function printUsage() {
  console.log(`
Usage: node install-deps.js [options]

Options:
  -r, --remove-lock     Remove package-lock.json files before installation
  -i, --ignore-platform Ignore platform-specific errors during installation
  -s, --skip-binary-tmp Skip binary/tmp directories
  -h, --help            Display this help message
  `);
}

// Check for help flag
if (args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(0);
}

// Find all directories with package.json
console.log("Finding directories with package.json files...");
const packageDirs = findPackageJsonDirs(rootDir);

if (packageDirs.length === 0) {
  console.log("No package.json files found.");
  process.exit(0);
}

// Install dependencies in each directory
console.log(`Found ${packageDirs.length} directories with package.json files.`);
if (removePackageLock) {
  console.log("Will remove package-lock.json files before installation.");
}
if (ignorePlatformErrors) {
  console.log("Will ignore platform-specific errors during installation.");
}
if (skipBinaryTmp) {
  console.log("Skipping binary/tmp directories.");
}

packageDirs.forEach((dir) => {
  const relativePath = path.relative(rootDir, dir);
  console.log(`\nProcessing: ${relativePath}`);

  try {
    // Remove package-lock.json if flag is set
    if (removePackageLock) {
      const packageLockPath = path.join(dir, "package-lock.json");
      if (fs.existsSync(packageLockPath)) {
        console.log("Removing package-lock.json...");
        fs.unlinkSync(packageLockPath);
        console.log("Package-lock.json removed.");
      }
    }

    console.log("Running npm install...");
    const npmCommand = ignorePlatformErrors
      ? "npm install --no-optional --no-fund --ignore-scripts --force"
      : "npm install";
    execSync(npmCommand, { cwd: dir, stdio: "inherit" });
    console.log(`Successfully installed dependencies in ${relativePath}`);
  } catch (error) {
    console.error(
      `Failed to install dependencies in ${relativePath}:`,
      error.message,
    );
  }
});

console.log("\nAll installations completed!");
