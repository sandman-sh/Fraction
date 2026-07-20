let app: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      const module = await import("../server.js");
      app = module.default;
    }
    return app(req, res);
  } catch (err: any) {
    res.status(500).json({
      error: "Vercel Serverless Function Crash",
      message: err?.message || String(err),
      stack: err?.stack || "No stack trace",
    });
  }
}
