import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { AProposPage } from "./AProposPage.jsx";
import { ServicesPage } from "./ServicesPage.jsx";
import { ContactPage } from "./ContactPage.jsx";
import "./styles.css";

const SITE = "https://behnjproductions.ca";

const ROUTES = {
  "/": {
    component: App,
    title: "Behn J. Productions | Photographie, Vidéo & Diffusion web — Sept-Îles",
    description:
      "Photographie, vidéo et diffusion web à Sept-Îles et sur la Côte-Nord. Corporatif, mariages, événements et écoles — des images qui se vivent.",
  },
  "/services": {
    component: ServicesPage,
    title: "Services | Photographie, vidéo, sites web et design — Sept-Îles",
    description:
      "Photographie, vidéo, diffusion web en direct, création de sites web, design graphique et portraits scolaires à Sept-Îles et sur la Côte-Nord.",
  },
  "/contact": {
    component: ContactPage,
    title: "Contact | Demandez une soumission — Behn J. Productions, Sept-Îles",
    description:
      "Parlons de votre projet photo, vidéo ou web. Studio au 416 Av. Iberville à Sept-Îles. Téléphone, courriel et formulaire de demande.",
  },
  "/a-propos": {
    component: AProposPage,
    title: "À propos | Behn J. Productions — Photographe à Sept-Îles",
    description:
      "De La Vega à Sept-Îles : l'histoire de Behn J. Productions et l'équipe derrière chaque projet photo, vidéo et web sur la Côte-Nord.",
  },
};

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const route = ROUTES[path] || ROUTES["/"];

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

document.title = route.title;
setMeta('meta[name="description"]', "content", route.description);
setMeta('meta[property="og:title"]', "content", route.title);
setMeta('meta[property="og:description"]', "content", route.description);
setMeta('meta[property="og:url"]', "content", SITE + (path === "/" ? "" : path));
setMeta('meta[name="twitter:title"]', "content", route.title);
setMeta('meta[name="twitter:description"]', "content", route.description);

let canonical = document.head.querySelector('link[rel="canonical"]');
if (!canonical) {
  canonical = document.createElement("link");
  canonical.rel = "canonical";
  document.head.appendChild(canonical);
}
canonical.href = SITE + (path === "/" ? "/" : path);

createRoot(document.getElementById("root")).render(<route.component />);
