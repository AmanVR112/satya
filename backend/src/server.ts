import "dotenv/config";
import app from "./app";

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Satya API running on http://localhost:${PORT}`);
  console.log(
    "Tavily API key loaded:",
    Boolean(process.env.TAVILY_API_KEY)
  );
});