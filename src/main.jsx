import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { AProposPage } from "./AProposPage.jsx";
import { ServicesPage } from "./ServicesPage.jsx";
import "./styles.css";

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const ROUTES = { "/a-propos": AProposPage, "/services": ServicesPage };
const RootComponent = ROUTES[path] || App;

createRoot(document.getElementById("root")).render(<RootComponent />);
