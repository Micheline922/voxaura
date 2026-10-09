const ADMIN_PASSWORD = "micheline1008";
const DATABASE_NAME = "voxaura-admin";
const DATABASE_VERSION = 1;
const WHATSAPP_NUMBER = "243992056878";

const publicSite = document.querySelector("#public-site");
const creationGrid = document.querySelector("#creation-grid");
const filterButtons = document.querySelectorAll(".filter-button");
const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#main-navigation");
const adminDialog = document.querySelector("#admin-dialog");
const adminDashboard = document.querySelector("#admin-dashboard");
let creations = [];
let activeFilter = "all";
let databasePromise;

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("products")) {
        database.createObjectStore("products", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("messages")) {
        database.createObjectStore("messages", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("hiddenProducts")) {
        database.createObjectStore("hiddenProducts", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function storeRequest(storeName, mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

const getAll = (storeName) => storeRequest(storeName, "readonly", (store) => store.getAll());
const saveItem = (storeName, item) => storeRequest(storeName, "readwrite", (store) => store.put(item));
const removeItem = (storeName, id) => storeRequest(storeName, "readwrite", (store) => store.delete(id));

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function renderCreations() {
  const visibleCreations = activeFilter === "all"
    ? creations
    : creations.filter((creation) => creation.category === activeFilter);

  creationGrid.replaceChildren();
  if (visibleCreations.length === 0) {
    const emptyMessage = createElement(
      "p",
      "empty-message",
      "Aucune création disponible pour le moment. Revenez bientôt !"
    );
    creationGrid.append(emptyMessage);
    creationGrid.setAttribute("aria-busy", "false");
    return;
  }

  visibleCreations.forEach((creation, index) => {
    const card = createElement("article", "creation-card");
    card.style.animationDelay = `${Math.min(index * 55, 330)}ms`;

    const imageWrap = createElement("div", "creation-image-wrap");
    const image = createElement("img", "creation-image");
    image.src = creation.image;
    image.alt = creation.imageAlt || creation.name;
    image.loading = "lazy";
    imageWrap.append(image);
    imageWrap.append(createElement("span", "creation-category", creation.categoryLabel || creation.category));

    const meta = createElement("div", "creation-card-meta");
    const title = createElement("h3", "", creation.name);
    const subtitle = createElement("span", "", creation.subtitle || creation.categoryLabel || "Création sur mesure");
    meta.append(title, subtitle);

    const description = createElement("p", "creation-description", creation.description || "Une création imaginée pour vous.");
    card.append(imageWrap, meta, description);
    creationGrid.append(card);
  });
  creationGrid.setAttribute("aria-busy", "false");
}

async function loadCreations() {
  let baseCreations = [];
  try {
    const response = await fetch("creations.json");
    if (!response.ok) throw new Error(`Chargement impossible (${response.status})`);
    const data = await response.json();
    if (Array.isArray(data)) baseCreations = data.filter((item) => item && item.name && item.image);
  } catch (error) {
    console.error("Impossible de charger creations.json :", error);
  }

  try {
    const [addedProducts, hiddenProducts] = await Promise.all([
      getAll("products"),
      getAll("hiddenProducts")
    ]);
    const hiddenIds = new Set(hiddenProducts.map((item) => item.id));
    creations = [
      ...baseCreations.filter((item) => !hiddenIds.has(item.id)),
      ...addedProducts
    ];
  } catch (error) {
    console.error("Impossible de lire les créations enregistrées sur cet appareil :", error);
    creations = baseCreations;
  }
  renderCreations();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
    renderCreations();
  });
});

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Ouvrir le menu" : "Fermer le menu");
  navigation.classList.toggle("is-open", !isOpen);
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Ouvrir le menu");
  });
});

document.querySelector("[data-admin-open]").addEventListener("click", () => {
  document.querySelector("#login-error").textContent = "";
  adminDialog.showModal();
});
document.querySelector("[data-admin-close]").addEventListener("click", () => adminDialog.close());
adminDialog.addEventListener("click", (event) => {
  if (event.target === adminDialog) adminDialog.close();
});

const contentDialog = document.querySelector("#content-dialog");
const contentDetails = {
  engraving: {
    kicker: "Le geste artisanal",
    title: "Gravure de prestige",
    paragraphs: [
      "Une gravure transforme un objet choisi en attention personnelle. Prénom, date ou quelques mots : chaque détail est composé pour rester lisible et élégant.",
      "L’atelier vous accompagne dans le choix du texte et de son placement selon la matière et le format de votre pièce."
    ],
    bullets: ["Personnalisation de textes courts", "Conseil sur le placement et le rendu", "Finition pensée pour l’objet choisi"]
  },
  "fine-art": {
    kicker: "Vos souvenirs, sublimés",
    title: "Impression fine art",
    paragraphs: [
      "Vos photographies et créations prennent une nouvelle présence sur des supports choisis pour la richesse de leurs couleurs et la finesse de leur rendu.",
      "Chaque projet est préparé avec attention pour préserver les nuances de l’image et offrir une impression digne du souvenir qu’elle représente."
    ],
    bullets: ["Photos et compositions personnalisées", "Choix du format selon votre projet", "Préparation soignée avant impression"]
  },
  "gift-box": {
    kicker: "L’art d’offrir",
    title: "L’art du coffret",
    paragraphs: [
      "Le coffret compose une surprise complète autour de la personne qui la reçoit. Les objets, leurs couleurs et leur présentation racontent ensemble une même attention.",
      "Pour un anniversaire, une célébration ou un geste spontané, l’atelier imagine un assortiment harmonieux et un emballage prêt à offrir."
    ],
    bullets: ["Sélection d’objets selon l’occasion", "Harmonisation des couleurs et des messages", "Présentation cadeau soignée"]
  },
  legal: {
    kicker: "Informations de l’éditeur",
    title: "Mentions légales",
    paragraphs: [
      "VoxAura est un atelier de cadeaux personnalisés situé à Bukavu, dans la province du Sud-Kivu, en République démocratique du Congo.",
      "Pour toute question concernant le site ou ses contenus, contactez l’atelier à l’adresse michelinekalehezo@gmail.com ou au 0992056878.",
    ],
    bullets: []
  },
  privacy: {
    kicker: "Vos données",
    title: "Confidentialité",
    paragraphs: [
      "Le formulaire prépare un message WhatsApp avec votre nom, votre numéro de téléphone et votre demande. Rien n’est envoyé avant votre confirmation dans WhatsApp.",
      "Les créations ajoutées depuis l’administration sont également conservées localement dans ce navigateur. Effacer les données du navigateur peut les supprimer.",
      "Aucun service serveur de collecte ou de synchronisation n’est configuré sur ce site."
    ],
    bullets: []
  },
  sales: {
    kicker: "Votre commande sur mesure",
    title: "Conditions de vente",
    paragraphs: [
      "Les créations VoxAura étant personnalisées, les choix de modèle, de texte, de format et de présentation sont confirmés avec l’atelier avant le lancement du projet.",
      "Le prix, les modalités de règlement, le délai de préparation et les possibilités de livraison sont communiqués individuellement avant toute confirmation de commande.",
      "Pour obtenir une proposition adaptée à votre besoin, décrivez votre projet dans le formulaire de contact."
    ],
    bullets: []
  }
};

function openContentDialog(contentKey) {
  const details = contentDetails[contentKey];
  if (!details) return;
  document.querySelector("#content-kicker").textContent = details.kicker;
  document.querySelector("#content-title").textContent = details.title;
  const body = document.querySelector("#content-body");
  body.replaceChildren();
  details.paragraphs.forEach((paragraph) => body.append(createElement("p", "", paragraph)));
  if (details.bullets.length > 0) {
    const list = createElement("ul", "content-detail-list");
    details.bullets.forEach((bullet) => list.append(createElement("li", "", bullet)));
    body.append(list);
  }
  contentDialog.showModal();
}

document.querySelectorAll("[data-open-content]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openContentDialog(trigger.dataset.openContent);
  });
  if (trigger.matches("[role='button']")) {
    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openContentDialog(trigger.dataset.openContent);
    });
  }
});

document.querySelectorAll("[data-content-close]").forEach((button) => {
  button.addEventListener("click", () => contentDialog.close());
});
contentDialog.addEventListener("click", (event) => {
  if (event.target === contentDialog) contentDialog.close();
});

document.querySelector("#admin-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const passwordInput = document.querySelector("#admin-password");
  const loginError = document.querySelector("#login-error");
  if (passwordInput.value !== ADMIN_PASSWORD) {
    loginError.textContent = "Mot de passe incorrect.";
    passwordInput.select();
    return;
  }

  loginError.textContent = "";
  passwordInput.value = "";
  adminDialog.close();
  publicSite.hidden = true;
  adminDashboard.hidden = false;
  window.scrollTo(0, 0);
  await renderAdminDashboard();
});

async function renderAdminDashboard() {
  await Promise.all([renderMessages(), renderAdminProducts()]);
}

async function renderMessages() {
  const list = document.querySelector("#message-list");
  list.replaceChildren();
  let messages = [];
  try {
    messages = await getAll("messages");
  } catch (error) {
    console.error("Impossible de lire les demandes :", error);
  }

  messages.sort((first, second) => second.createdAt - first.createdAt);
  if (messages.length === 0) {
    list.append(createElement("p", "admin-empty", "Aucune demande reçue pour le moment."));
    return;
  }

  messages.forEach((message) => {
    const row = createElement("article", "admin-message");
    const details = document.createElement("div");
    details.append(createElement("strong", "", message.name));
    const email = createElement("p", "", message.email);
    const body = createElement("p", "", message.message);
    details.append(email, body);
    const time = createElement("time", "", new Date(message.createdAt).toLocaleDateString("fr-FR"));
    time.dateTime = new Date(message.createdAt).toISOString();
    row.append(details, time);
    list.append(row);
  });
}

async function renderAdminProducts() {
  const list = document.querySelector("#admin-product-list");
  list.replaceChildren();
  let baseProducts = [];
  let addedProducts = [];
  let hiddenProducts = [];
  try {
    const response = await fetch("creations.json");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) baseProducts = data;
    }
  } catch (error) {
    console.error("Impossible de lire le catalogue initial :", error);
  }
  try {
    [addedProducts, hiddenProducts] = await Promise.all([
      getAll("products"),
      getAll("hiddenProducts")
    ]);
  } catch (error) {
    console.error("Impossible de lire les articles publiés :", error);
  }

  const hiddenIds = new Set(hiddenProducts.map((product) => product.id));
  const products = [
    ...baseProducts.filter((product) => !hiddenIds.has(product.id)).map((product) => ({ ...product, source: "catalog" })),
    ...addedProducts.map((product) => ({ ...product, source: "device" }))
  ];
  document.querySelector("#admin-item-count").textContent = products.length;
  if (products.length === 0) {
    list.append(createElement("p", "admin-empty", "Aucune création publiée pour le moment."));
    return;
  }

  products.sort((first, second) => second.createdAt - first.createdAt).forEach((product) => {
    const row = createElement("article", "admin-product");
    const main = createElement("div", "admin-product-main");
    const image = createElement("img");
    image.src = product.image;
    image.alt = "";
    const text = document.createElement("div");
    text.append(createElement("strong", "", product.name));
    text.append(createElement("p", "", product.categoryLabel));
    main.append(image, text);
    const remove = createElement("button", "", "Retirer");
    remove.type = "button";
    remove.setAttribute("aria-label", `Retirer ${product.name} du catalogue`);
    remove.addEventListener("click", async () => {
      if (product.source === "catalog") {
        await saveItem("hiddenProducts", { id: product.id });
      } else {
        await removeItem("products", product.id);
      }
      await loadCreations();
      await renderAdminProducts();
    });
    row.append(main, remove);
    list.append(row);
  });
}

const imageInput = document.querySelector("#bulk-images");
const uploadLabel = document.querySelector("#upload-label");
const uploadZone = document.querySelector("#upload-zone");
const uploadStatus = document.querySelector("#upload-status");

imageInput.addEventListener("change", () => {
  const count = imageInput.files.length;
  uploadLabel.textContent = count
    ? `${count} photo${count > 1 ? "s" : ""} sélectionnée${count > 1 ? "s" : ""}`
    : "Cliquez pour sélectionner vos photos";
});

["dragenter", "dragover"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.add("is-dragging");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.remove("is-dragging");
  });
});
uploadZone.addEventListener("drop", (event) => {
  imageInput.files = event.dataTransfer.files;
  imageInput.dispatchEvent(new Event("change", { bubbles: true }));
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

document.querySelector("#bulk-upload-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const files = [...imageInput.files].filter((file) => file.type.startsWith("image/"));
  if (files.length === 0) {
    uploadStatus.textContent = "Sélectionnez au moins une image avant de publier.";
    return;
  }

  const category = document.querySelector("#bulk-category").value;
  const categoryLabels = {
    coffrets: "Coffrets Prestige",
    souvenirs: "Souvenirs",
    papeterie: "Papeterie"
  };
  uploadStatus.textContent = "Enregistrement des créations…";

  try {
    const subtitle = document.querySelector("#bulk-subtitle").value.trim();
    const products = await Promise.all(files.map(async (file) => ({
      id: `admin-${crypto.randomUUID()}`,
      name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      subtitle: subtitle || "Création sur mesure",
      category,
      categoryLabel: categoryLabels[category],
      description: "Une création personnalisée VoxAura.",
      image: await readFileAsDataUrl(file),
      imageAlt: file.name,
      createdAt: Date.now()
    })));

    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("products", "readwrite");
      products.forEach((product) => transaction.objectStore("products").put(product));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    imageInput.value = "";
    document.querySelector("#bulk-subtitle").value = "";
    uploadLabel.textContent = "Cliquez pour sélectionner vos photos";
    uploadStatus.textContent = `${products.length} création${products.length > 1 ? "s" : ""} ${products.length > 1 ? "publiées" : "publiée"} sur cet appareil.`;
    await Promise.all([loadCreations(), renderAdminProducts()]);
  } catch (error) {
    console.error("Échec de l’enregistrement des images :", error);
    uploadStatus.textContent = "Échec de l’enregistrement. Essayez avec moins d’images ou des fichiers plus légers.";
  }
});

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const message = [
    "Bonjour VoxAura, je souhaite faire une demande.",
    "",
    `Nom : ${formData.get("name").trim()}`,
    `Téléphone : ${formData.get("mobile").trim()}`,
    `Projet : ${formData.get("message").trim()}`
  ].join("\n");
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  document.querySelector("#form-status").textContent = "Ouverture de WhatsApp avec votre demande…";

  const chooser = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  if (!chooser) {
    window.location.href = whatsappUrl;
  }
});

document.querySelectorAll("[data-admin-home]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    adminDashboard.hidden = true;
    publicSite.hidden = false;
    window.scrollTo(0, 0);
  });
});

document.querySelector("[data-admin-logout]").addEventListener("click", () => {
  adminDashboard.hidden = true;
  publicSite.hidden = false;
  window.scrollTo(0, 0);
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
loadCreations();