const express = require("express");
const axios = require("axios");
const client = require("prom-client");

const app = express();
const PORT = process.env.PORT || 3002;

// Prometheus Metrics
const register = new client.Registry();
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.2, 0.5, 1, 3] 
});
register.registerMetric(httpRequestDuration);
client.collectDefaultMetrics({ register });

// Logging middleware for all requests
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
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      level: "info",
      message: `Request completed: ${req.method} ${req.url}`,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      service: 'api-service-2',
      timestamp: new Date().toISOString()
    }));
  });

  next();
});

// Compute-heavy task simulation
app.get("/compute", (req, res) => {
  console.log(JSON.stringify({
    level: "info",
    message: "Starting compute-heavy task",
    route: "/compute",
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));
  
  const startTime = Date.now();
  
  let sum = 0;
  for (let i = 0; i < 1e7; i++) sum += Math.sqrt(i); // Simulated CPU-intensive task
  
  const duration = Date.now() - startTime;
  console.log(JSON.stringify({
    level: "info",
    message: "Compute-heavy task completed",
    route: "/compute",
    duration,
    result: sum,
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));
  
  res.json({ message: "Computation completed", result: sum });
});

// Simulated failure endpoint
app.get("/random-fail", (req, res) => {
  console.log(JSON.stringify({
    level: "info",
    message: "Random fail endpoint called",
    route: "/random-fail",
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));
  
  if (Math.random() < 0.3) {
    console.log(JSON.stringify({
      level: "error",
      message: "Random failure occurred",
      route: "/random-fail",
      statusCode: 500,
      service: 'api-service-2',
      timestamp: new Date().toISOString()
    }));
    res.status(500).json({ error: "Random failure occurred" });
  } else {
    console.log(JSON.stringify({
      level: "info",
      message: "Random fail endpoint succeeded",
      route: "/random-fail",
      statusCode: 200,
      service: 'api-service-2',
      timestamp: new Date().toISOString()
    }));
    res.json({ message: "Success" });
  }
});

// Call API Service 1
app.get("/test-service-1", async (req, res) => {
  console.log(JSON.stringify({
    level: "info",
    message: "Attempting to call API Service 1",
    route: "/test-service-1",
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));
  
  try {
    const start = Date.now();
    console.log(JSON.stringify({
      level: "debug",
      message: "Sending request to API Service 1",
      targetUrl: "http://api-service-1/",
      service: 'api-service-2',
      timestamp: new Date().toISOString()
    }));
    
    const response = await axios.get("http://api-service-1/");
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration.labels("GET", "/test-service-1", "200").observe(duration);
    
    console.log(JSON.stringify({
      level: "info",
      message: "Successfully called API Service 1",
      route: "/test-service-1",
      duration,
      responseData: JSON.stringify(response.data),
      service: 'api-service-2',
      timestamp: new Date().toISOString()
    }));
    
    res.json({ message: "Called API Service 1", data: response.data });
  } catch (error) {
    console.log(JSON.stringify({
      level: "error",
      message: "Failed to call API Service 1",
      route: "/test-service-1",
      error: error.message,
      stack: error.stack,
      service: 'api-service-2',
      timestamp: new Date().toISOString()
    }));
    
    res.status(500).json({ error: "Failed to call API Service 1" });
  }
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  console.log(JSON.stringify({
    level: "info",
    message: "Metrics endpoint called",
    route: "/metrics",
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Health check
app.get("/", (req, res) => {
  console.log(JSON.stringify({
    level: "info",
    message: "Health check performed",
    route: "/",
    status: "healthy",
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));
  res.send("API Service 2 is running 🚀");
});

app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: "info",
    message: `API Service 2 started`,
    port: PORT,
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));
  console.log(`API Service 2 running on port ${PORT}`);
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log(JSON.stringify({
    level: "error",
    message: 'Uncaught exception',
    error: error.message,
    stack: error.stack,
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log(JSON.stringify({
    level: "error",
    message: 'Unhandled Rejection',
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : 'No stack trace',
    service: 'api-service-2',
    timestamp: new Date().toISOString()
  }));
});