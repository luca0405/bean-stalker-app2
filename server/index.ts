import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Generate a session secret if not provided
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = "bean-stalker-secret-key";
  }

  // Import storage here to avoid circular dependencies
  const { storage } = await import("./storage");
  
  // Initialize the PostgreSQL database
  try {
    await storage.initializeDatabase();
    
    // Import auth functions
    const { hashPassword } = await import("./auth");
    
    // Create admin user if not exists
    const existingAdmin = await storage.getUserByUsername("bs_admin");
    if (!existingAdmin) {
      await storage.createUser({
        username: "bs_admin",
        password: await hashPassword("BS2025@@"),
        email: "admin@beanstalker.com",
        fullName: "Admin User",
        phoneNumber: "123-456-7890",
        credits: 1000, // Admin gets more credits
        isAdmin: true
      });
      log("Admin user created successfully");
    }
    
    log("Database initialized successfully");
  } catch (error) {
    // Don't exit on database error - this allows the app to start
    // even if the database isn't fully initialized
    log(`Database initialization warning: ${error}`);
    log("Continuing application startup - some features may be limited");
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  
  // Debug: Log Square environment variables on startup to verify production config
  console.log(`🔧 Square Config on Startup:`);
  console.log(`   Location ID: ${process.env.SQUARE_LOCATION_ID || 'NOT_SET'}`);
  console.log(`   App ID: ${process.env.SQUARE_APPLICATION_ID || 'NOT_SET'}`);
  console.log(`   Access Token: ${process.env.SQUARE_ACCESS_TOKEN ? 'SET' : 'NOT_SET'}`);
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
