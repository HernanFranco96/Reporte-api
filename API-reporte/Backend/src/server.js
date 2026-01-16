import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./db/db.js";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0"; 

await connectDB();

app.listen(PORT, HOST, () => {
  console.log(`🚀 API corriendo en http://${HOST}:${PORT}`);
});
