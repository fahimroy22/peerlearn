const cron = require("node-cron");
const Session = require("../models/Session");

const remindedSessions = new Map();

const runReminderJob = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const next30Min = new Date(now.getTime() + 30 * 60 * 1000);

      const sessions = await Session.find({
        startTime: { $gte: now, $lte: next30Min },
        status: "scheduled",
      }).populate("tutor learner", "name email");

      for (const session of sessions) {
        const key = `${session._id}_${session.startTime.toISOString()}`;

        if (remindedSessions.has(key)) {
          continue;
        }

        remindedSessions.set(key, true);

        console.log(
          `[Reminder] Session "${session._id}" starts soon for tutor ${session.tutor?.name} and learner ${session.learner?.name}`
        );

        // Future upgrade ideas:
        // 1. Send email here
        // 2. Emit socket event here
        // 3. Save notification document here
      }

      // Keep memory small by removing old reminder keys
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (const key of remindedSessions.keys()) {
        const parts = key.split("_");
        const iso = parts[1];

        if (iso && new Date(iso) < oneDayAgo) {
          remindedSessions.delete(key);
        }
      }
    } catch (error) {
      console.error("Session reminder job failed:", error.message);
    }
  });
};

module.exports = runReminderJob;