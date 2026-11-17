/**
 * PM2 — پرده آنتیک API
 * از پوشه backend اجرا شود:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "antic-api",
      cwd: __dirname,
      script: "npx",
      args: "tsx src/index.ts",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      max_restarts: 20,
      min_uptime: "10s",
      restart_delay: 3000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
      error_file: "/var/log/pm2/antic-api-error.log",
      out_file: "/var/log/pm2/antic-api-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
