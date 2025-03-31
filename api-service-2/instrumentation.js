const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");  // Use gRPC version
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "tempo.meta.cluster.local:4317",  // Keep gRPC port
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();