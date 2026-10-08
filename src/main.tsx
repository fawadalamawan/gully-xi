import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "./game/GameApp";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root");

createRoot(root).render(
  <StrictMode>
    <GameApp />
  </StrictMode>,
);
