import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { AProposPage } from "./AProposPage.jsx";
import "./styles.css";

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const RootComponent = path === "/a-propos" ? AProposPage : App;

createRoot(document.getElementById("root")).render(<RootComponent />);
