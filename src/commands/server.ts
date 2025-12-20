/**
 * Server Command Group - Webhook server for Tana integration
 *
 * Consolidates all tana-webhook functionality into main tana CLI
 * Supports multiple workspaces simultaneously
 */

import { Command } from "commander";
import { TanaWebhookServer } from "../server/tana-webhook-server";
import { existsSync, writeFileSync, readFileSync, unlinkSync, openSync } from "fs";
import { resolveWorkspace, getEnabledWorkspaces, PID_FILE, SERVER_CONFIG_FILE, ensureAllDirs, getWorkspaceDatabasePath } from "../config/paths";
import { ConfigManager } from "../config/manager";

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "localhost";
const CONFIG_FILE = SERVER_CONFIG_FILE;

export function registerServerCommands(program: Command): void {
  // Ensure data directory exists for PID and config files
  ensureAllDirs();
  const server = program
    .command("server")
    .description("Webhook server for Tana integration");

  server
    .command("start")
    .description("Start webhook server (serves all enabled workspaces)")
    .option("--port <n>", "Port to listen on", DEFAULT_PORT.toString())
    .option("--host <host>", "Host to bind to", DEFAULT_HOST)
    .option("--daemon", "Run in background", false)
    .action(async (options) => {
      const port = parseInt(options.port);
      const host = options.host;

      // Load all enabled workspaces
      const configManager = ConfigManager.getInstance();
      const config = configManager.getConfig();
      const enabledWorkspaces = getEnabledWorkspaces(config);

      // Build workspaces map
      const workspacesMap = new Map<string, string>();
      const missingDbs: string[] = [];

      // If no workspaces configured, use default/legacy mode
      if (enabledWorkspaces.length === 0) {
        const defaultWs = resolveWorkspace(undefined, config);
        if (existsSync(defaultWs.dbPath)) {
          workspacesMap.set(defaultWs.alias, defaultWs.dbPath);
        } else {
          console.error(`❌ No database found: ${defaultWs.dbPath}`);
          console.error(`   Run 'supertag sync index' first`);
          process.exit(1);
        }
      } else {
        // Add all enabled workspaces with existing databases
        for (const ws of enabledWorkspaces) {
          if (existsSync(ws.dbPath)) {
            workspacesMap.set(ws.alias, ws.dbPath);
          } else {
            missingDbs.push(ws.alias);
          }
        }
      }

      if (workspacesMap.size === 0) {
        console.error(`❌ No databases found for any workspace`);
        console.error(`   Missing: ${missingDbs.join(", ")}`);
        console.error(`   Run 'supertag sync index --all' first`);
        process.exit(1);
      }

      if (missingDbs.length > 0) {
        console.warn(`⚠️  Skipping workspaces with missing databases: ${missingDbs.join(", ")}`);
      }

      if (existsSync(PID_FILE)) {
        const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim());
        // Skip check if PID is our own process (child of daemon mode inherits PID file)
        if (pid !== process.pid) {
          try {
            process.kill(pid, 0);
            console.error(`❌ Server already running (PID: ${pid})`);
            console.error(`   Run 'supertag server stop' first`);
            process.exit(1);
          } catch (e) {
            unlinkSync(PID_FILE);
          }
        }
      }

      // Get default workspace
      const defaultWorkspace = config.defaultWorkspace || workspacesMap.keys().next().value;

      if (options.daemon) {
        // Save config for status command
        const workspacesConfig = Object.fromEntries(workspacesMap);
        writeFileSync(
          CONFIG_FILE,
          JSON.stringify({ port, host, workspaces: workspacesConfig, defaultWorkspace }, null, 2)
        );

        const { spawn } = await import("child_process");

        // Use file descriptor to /dev/null for proper daemon detachment
        const devNull = openSync("/dev/null", "w");

        // Build args
        const args = ["server", "start", "--port", port.toString(), "--host", host];

        const child = spawn(
          process.execPath,
          args,
          {
            detached: true,
            stdio: ["ignore", devNull, devNull],
          }
        );
        child.unref();

        // Write child PID to file (child will verify/update when it starts)
        writeFileSync(PID_FILE, child.pid!.toString());

        const workspaceList = Array.from(workspacesMap.keys()).join(", ");
        console.log(`✅ Webhook server started in background`);
        console.log(`   Workspaces: ${workspaceList}`);
        console.log(`   Default: ${defaultWorkspace}`);
        console.log(`   PID: ${child.pid}`);
        console.log(`   Address: http://${host}:${port}`);
        console.log(`   Run 'supertag server stop' to stop`);
        process.exit(0);
      }

      const workspaceList = Array.from(workspacesMap.keys()).join(", ");
      console.log(`🚀 Starting Tana webhook server...`);
      console.log(`   Workspaces: ${workspaceList}`);
      console.log(`   Default: ${defaultWorkspace}`);
      console.log(`   Host: ${host}`);
      console.log(`   Port: ${port}`);

      const webhookServer = new TanaWebhookServer({
        port,
        host,
        workspaces: workspacesMap,
        defaultWorkspace,
      });

      try {
        await webhookServer.start();
        console.log(`✅ Server running at ${webhookServer.getAddress()}`);
        console.log(`\n📡 Available endpoints (all accept ?workspace= or "workspace": "..." param):`);
        console.log(`   GET  /help                   - API documentation`);
        console.log(`   GET  /health                 - Health check`);
        console.log(`   GET  /workspaces             - List available workspaces`);
        console.log(`   POST /search                 - Full-text search`);
        console.log(`   GET  /stats                  - Database statistics`);
        console.log(`   POST /tags                   - Top supertags`);
        console.log(`   POST /nodes                  - Find nodes`);
        console.log(`   POST /refs                   - Reference graph`);
        console.log(`   POST /semantic-search        - Semantic/vector search`);
        console.log(`   GET  /embed-stats            - Embedding statistics`);
        console.log(`\n   Press Ctrl+C to stop`);

        writeFileSync(PID_FILE, process.pid.toString());

        // Save config for status command
        const workspacesConfig = Object.fromEntries(workspacesMap);
        writeFileSync(
          CONFIG_FILE,
          JSON.stringify({ port, host, workspaces: workspacesConfig, defaultWorkspace }, null, 2)
        );

        const shutdown = async () => {
          console.log(`\n🛑 Shutting down...`);
          await webhookServer.stop();
          if (existsSync(PID_FILE)) {
            unlinkSync(PID_FILE);
          }
          if (existsSync(CONFIG_FILE)) {
            unlinkSync(CONFIG_FILE);
          }
          process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

        await new Promise(() => {});
      } catch (error) {
        console.error(`❌ Failed to start server:`, error);
        process.exit(1);
      }
    });

  server
    .command("stop")
    .description("Stop daemon webhook server")
    .action(async () => {
      if (!existsSync(PID_FILE)) {
        console.error(`❌ Server is not running (no PID file found)`);
        process.exit(1);
      }

      const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim());

      try {
        process.kill(pid, "SIGTERM");
        console.log(`✅ Server stopped (PID: ${pid})`);

        unlinkSync(PID_FILE);
        if (existsSync(CONFIG_FILE)) {
          unlinkSync(CONFIG_FILE);
        }
      } catch (error) {
        console.error(`❌ Failed to stop server (PID: ${pid}):`, error);
        unlinkSync(PID_FILE);
        if (existsSync(CONFIG_FILE)) {
          unlinkSync(CONFIG_FILE);
        }
        process.exit(1);
      }
    });

  server
    .command("status")
    .description("Check server status")
    .action(async () => {
      if (!existsSync(PID_FILE)) {
        console.log(`❌ Server is not running`);
        process.exit(1);
      }

      const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim());

      try {
        process.kill(pid, 0);

        let config: { port?: number; host?: string; workspaces?: Record<string, string>; defaultWorkspace?: string } | null = null;
        if (existsSync(CONFIG_FILE)) {
          config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
        }

        console.log(`✅ Server is running`);
        console.log(`   PID: ${pid}`);
        if (config) {
          console.log(`   Address: http://${config.host}:${config.port}`);
          if (config.workspaces) {
            const workspaceList = Object.keys(config.workspaces).join(", ");
            console.log(`   Workspaces: ${workspaceList}`);
            console.log(`   Default: ${config.defaultWorkspace}`);
          }
        }

        if (config) {
          try {
            const response = await fetch(`http://${config.host}:${config.port}/health`);
            if (response.ok) {
              const data = await response.json() as { status: string; workspaces?: string[] };
              console.log(`   Health: ${data.status}`);
              if (data.workspaces) {
                console.log(`   Active workspaces: ${data.workspaces.join(", ")}`);
              }
            }
          } catch (e) {
            console.log(`   Health: unreachable`);
          }
        }
      } catch (error) {
        console.log(`❌ Server is not running (stale PID file)`);
        unlinkSync(PID_FILE);
        if (existsSync(CONFIG_FILE)) {
          unlinkSync(CONFIG_FILE);
        }
        process.exit(1);
      }
    });
}
