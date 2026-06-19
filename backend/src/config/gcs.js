const { Storage } = require("@google-cloud/storage");

// In development: uses ADC (run `gcloud auth application-default login`)
// In GKE: uses Workload Identity automatically — no key file needed
const storage = new Storage({ projectId: process.env.GCS_PROJECT_ID });

module.exports = storage;
