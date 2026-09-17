import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { AProposPage } from "./AProposPage.jsx";
import { ServicesPage } from "./ServicesPage.jsx";
import { ContactPage } from "./ContactPage.jsx";
import { RealisationsPage } from "./RealisationsPage.jsx";
import { GaleriePage } from "./GaleriePage.jsx";
import { AdminPage } from "./AdminPage.jsx";
import { BoutiquePage } from "./BoutiquePage.jsx";
import "./styles.css";
import "./cinema-fonts.css";
import "./boutique.css";

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
  "/realisations": {
    component: RealisationsPage,
    title: "Réalisations | Mariages, corporatif, scolaire et culture — Sept-Îles",
    description:
      "Portfolio de Behn J. Productions : mariages, portraits corporatifs, photographie scolaire et vie culturelle de la Côte-Nord, à Sept-Îles.",
  },
  "/boutique": {
    component: BoutiquePage,
    title: "Boutique | Tirages encadrés et objets souvenirs — Behn J. Productions",
    description:
      "Cadres fabriqués au Québec, toiles grand format et objets souvenirs imprimés à partir de vos photos. Voyez chaque format à l'échelle réelle avant de commander.",
  },
  "/galerie": {
    component: GaleriePage,
    title: "Votre galerie | Behn J. Productions",
    description: "Galerie privée — choisissez vos photos préférées.",
    noindex: true,
  },
  "/admin": {
    component: AdminPage,
    title: "Collections | Behn J. Productions",
    description: "Panneau d'administration des galeries client.",
    noindex: true,
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
// Les galeries client vivent sous /galerie/<client> : une adresse par collection.
const routeKey = path.startsWith("/galerie/") ? "/galerie" : path;
const route = ROUTES[routeKey] || ROUTES["/"];

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

if (route.noindex) {
  const robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex, nofollow";
  document.head.appendChild(robots);
}

let canonical = document.head.querySelector('link[rel="canonical"]');
if (!canonical) {
  canonical = document.createElement("link");
  canonical.rel = "canonical";
  document.head.appendChild(canonical);
}
canonical.href = SITE + (path === "/" ? "/" : path);

createRoot(document.getElementById("root")).render(<route.component />);
