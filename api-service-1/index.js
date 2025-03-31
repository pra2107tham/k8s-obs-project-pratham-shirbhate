const express = require("express");
const axios = require("axios");
const client = require("prom-client");

const app = express();
const PORT = process.env.PORT || 3001;

// Prometheus Metrics
const register = new client.Registry();
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.2, 0.5, 1, 3] // Buckets for timing
});
register.registerMetric(httpRequestDuration);
client.collectDefaultMetrics({ register });

// Add middleware for logging all requests
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = req.get('X-Request-ID') || Math.random().toString(36).substring(2);
  
  console.log(JSON.stringify({
    level: "info",
    message: `Request started: ${req.method} ${req.url}`,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: requestId,
    service: 'api-service-1',
    timestamp: new Date().toISOString()
  }));

  // Override end method to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      level: "info",
      message: `Request completed: ${req.method} ${req.url}`,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      requestId: requestId,
      service: 'api-service-1',
      timestamp: new Date().toISOString()
    }));
    return originalEnd.call(this, chunk, encoding);
  };
  next();
});

// Simulated heavy task with random delays/errors
app.get("/heavy-task", async (req, res) => {
  const delays = [100, 200, 500, 1000, 3000];
  const delay = delays[Math.floor(Math.random() * delays.length)];
  const requestId = Date.now();
  
  console.log(JSON.stringify({
    level: "info",
    message: `Starting heavy task with delay: ${delay}ms`,
    delay,
    requestId,
    route: "/heavy-task",
    service: 'api-service-1',
    timestamp: new Date().toISOString()
  }));

  setTimeout(() => {
    if (Math.random() < 0.2) {
      console.log(JSON.stringify({
        level: "error",
        message: "Heavy task failed with internal server error",
        requestId,
        endpoint: "/heavy-task",
        status: 500,
        service: 'api-service-1',
        timestamp: new Date().toISOString()
      }));
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      console.log(JSON.stringify({
        level: "info",
        message: `Heavy task completed successfully in ${delay}ms`,
        requestId,
        endpoint: "/heavy-task",
        status: 200,
        duration: delay,
        service: 'api-service-1',
        timestamp: new Date().toISOString()
      }));
      res.json({ message: `Completed in ${delay}ms` });
    }
  }, delay);
});

// Call API Service 2
app.get("/test-service-2", async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    level: "info",
    message: "Initiating call to API Service 2",
    timestamp,
    service: 'api-service-1'
  }));
  
  try {
    const start = Date.now();
    console.log(JSON.stringify({
      level: "debug",
      message: "Sending request to API Service 2",
      target: "api-service-2",
      url: "http://api-service-2/",
      service: 'api-service-1',
      timestamp: new Date().toISOString()
    }));
    
    const response = await axios.get("http://api-service-2/");
    const duration = (Date.now() - start) / 1000;
    const responseSize = JSON.stringify(response.data).length;
    
    console.log(JSON.stringify({
      level: "info",
      message: "Successfully received response from API Service 2",
      duration,
      status: response.status,
      size: responseSize,
      service: 'api-service-1',
      timestamp: new Date().toISOString()
    }));
    
    httpRequestDuration.labels("GET", "/test-service-2", "200").observe(duration);
    res.json({ message: "Called API Service 2", data: response.data });
  } catch (error) {
    console.log(JSON.stringify({
      level: "error",
      message: "Failed to call API Service 2",
      error: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
      service: 'api-service-1',
      timestamp: new Date().toISOString()
    }));
    res.status(500).json({ error: "Failed to call API Service 2" });
  }
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  console.log(JSON.stringify({
    level: "debug",
    message: "Metrics endpoint called",
    service: 'api-service-1',
    timestamp: new Date().toISOString()
  }));
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Info endpoint
app.get("/info", (req, res) => {
  console.log(JSON.stringify({
    level: "info",
    message: "Info endpoint called",
    service: "API Service 1",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  }));
  res.json({ service: "API Service 1", version: "1.0.0" });
});

// Health check
app.get("/", (req, res) => {
  console.log(JSON.stringify({
    level: "info",
    message: "Health check endpoint called",
    status: "healthy",
    service: 'api-service-1',
    timestamp: new Date().toISOString()
  }));
  res.send("API Service 1 is running 🚀");
});

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: "info",
    message: "API Service 1 started successfully",
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    service: 'api-service-1',
    timestamp: new Date().toISOString()
  }));
  console.log(`API Service 1 running on port ${PORT}`);
});

// Log unhandled errors
process.on('uncaughtException', (error) => {
  console.log(JSON.stringify({
    level: "error",
    message: "Uncaught exception",
    error: error.message,
    stack: error.stack,
    service: 'api-service-1',
    timestamp: new Date().toISOString()
  }));
});

process.on('unhandledRejection', (reason, promise) => {
  console.log(JSON.stringify({
    level: "error",
    message: "Unhandled rejection",
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : 'No stack trace',
    service: 'api-service-1',
    timestamp: new Date().toISOString()
  }));
});
