/**
 * PM2 — پرده آنتیک وب (Next.js)
 * از پوشه روت اجرا شود:
 *   npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "antic-web",
      cwd: __dirname,
      script: "npm",
      args: "start",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "700M",
      max_restarts: 20,
      min_uptime: "10s",
      restart_delay: 3000,
      kill_timeout: 10000,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
      },
      error_file: "/var/log/pm2/antic-web-error.log",
      out_file: "/var/log/pm2/antic-web-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
