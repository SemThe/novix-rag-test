import { createApp } from "./app.js";
import { SERVER_PORT } from "../config.js";

const app = createApp();
app.listen(SERVER_PORT, () => {
  console.log(`Novix RAG backoffice API luistert op http://localhost:${SERVER_PORT}`);
});
