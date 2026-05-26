const connectDB = require('../config/db');

/**
 * Logs a compliance or security event to the audit log collection
 * @param {string} userId - ID of the user performing the action (e.g., patient, clinician, system)
 * @param {string} action - Description of the action taken
 * @param {string} [sessionId=null] - Optional intake session ID
 * @param {object} [metadata={}] - Additional details
 */
const logEvent = async (userId, action, sessionId = null, metadata = {}) => {
  try {
    const db = await connectDB();
    if (!db) {
      console.warn("Audit logger: Database not connected");
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      sessionId,
      metadata: metadata || {}
    };

    // Store in audit-logs collection using set() to be compatible with mockDb and Firestore
    const logId = 'LOG-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    await db.collection('audit-logs').doc(logId).set(logEntry);

    // If a session ID is provided, append a status message to the session's audit logs array
    if (sessionId) {
      const intakeRef = db.collection('intakes').doc(sessionId);
      const intakeDoc = await intakeRef.get();
      if (intakeDoc.exists) {
        const data = intakeDoc.data();
        const currentLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
        const newLogMsg = `${logEntry.timestamp}: ${action} by ${userId}`;
        await intakeRef.update({
          auditLogs: [...currentLogs, newLogMsg]
        });
      }
    }

    console.log(`[AUDIT LOG] ${JSON.stringify(logEntry)}`);
    return logEntry;
  } catch (error) {
    console.error("Audit logging error:", error);
  }
};

module.exports = { logEvent };
