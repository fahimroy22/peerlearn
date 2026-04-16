const mongoose = require("mongoose");
require("dotenv").config();

async function wipe() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to DB");

    await mongoose.connection.db.dropDatabase();

    console.log("🔥 Database wiped successfully");

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

wipe();