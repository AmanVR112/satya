import express from "express";
import verificationRoutes from "./routes/verification_routes";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Satya API is running",
  });
});

app.use("/verification", verificationRoutes);

export default app;