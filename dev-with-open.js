const { spawn } = require("child_process");

// Start the Next.js dev server
const dev = spawn("next", ["dev"], {
  stdio: "inherit",
  shell: true,
});

// Open browser after a short delay to ensure server is ready
setTimeout(async () => {
  const open = await import("open");
  open.default("http://localhost:3000");
}, 2000);

// Handle process termination
process.on("SIGINT", () => {
  dev.kill();
  process.exit();
});
