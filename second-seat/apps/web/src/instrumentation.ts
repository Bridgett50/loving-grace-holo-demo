export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.AUTO_JOIN_SCHEDULER !== "false") {
    const { startScheduler } = await import("./lib/server/scheduler");
    startScheduler();
  }
}
