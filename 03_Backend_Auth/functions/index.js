const admin = require("firebase-admin");

admin.initializeApp();

// Export all Cloud Functions from their respective modules
exports.verifyImage = require("./verifyImage").verifyImage;
exports.notifyNearbyUsers = require("./notifyNearbyUsers").notifyNearbyUsers;
exports.estimateResources = require("./estimateResources").estimateResources;

// NGO Form Validations
exports.validateFormSchemaAPI = require("./validateNGOForm").validateFormSchemaAPI;
exports.validateApplicationAPI = require("./validateNGOForm").validateApplicationAPI;
