
"use strict";

/* =====================================
   MATHIA — APLICACIÓN PRINCIPAL
===================================== */

const $ = (id) => document.getElementById(id);

const elements = {
  sidebar: $("sidebar"),
  collapse: $("collapseSidebar"),
  open: $("openSidebar"),
  newChat: $("newChat"),
  accountButton: $("accountButton"),
  accountMenu: $("accountMenu"),
  themeToggle: $("themeToggle"),
  chatForm: $("chatForm"),
  input: $("messageInput"),
  messages: $("messages"),
  welcome: $("welcomeScreen"),
  sendButton: $("sendButton"),
  chatList: $("chatList"),
  search: $("searchChats"),
  saveChat: $("saveCurrentChat"),
  toast: $("toastContainer")
};

/* =====================================
   ESTADO
===================================== */

let conversations = JSON.parse(
  localStorage.getItem("mathia_chats") || "[]"
);

let currentChat = null;
let isGenerating = false;
let currentHistory = [];

/* =====================================
   UTILIDADES
===================================== */

function saveStorage() {
  localStorage.setItem(
    "mathia_chats",
    JSON.stringify(conversations)
  );
}

function toast(message) {
  const notification = document.createElement("div");
  notification.className = "toast";
  notification.textContent = message;

  elements.toast.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function generateId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

/* =====================================
   TEMAS
===================================== */

function setTheme(theme) {
  document.body.classList.toggle(
    "light",
    theme === "light"
  );

  localStorage.setItem("mathia_theme", theme);

  refreshIcons();
}

setTheme(localStorage.getItem("mathia_theme") || "dark");

elements.themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("light")
    ? "dark"
    : "light";

  setTheme(nextTheme);

  toast(
    nextTheme === "light"
      ? "Tema claro activado"
      : "Tema oscuro activado"
  );
});

/* =====================================
   BARRA LATERAL
===================================== */

elements.collapse.addEventListener("click", () => {
  elements.sidebar.classList.add("collapsed");

  elements.open.classList.remove("hidden");
});

elements.open.addEventListener("click", () => {
  elements.sidebar.classList.remove("collapsed");

  elements.open.classList.add("hidden");
});

function closeSidebarOnMobile() {
  if (window.innerWidth <= 760) {
    elements.sidebar.classList.add("collapsed");
  }
}

elements.accountButton.addEventListener("click", () => {
  elements.accountMenu.classList.toggle("hidden");
});

document.addEventListener("click", (event) => {
  if (
    !elements.accountButton.contains(event.target) &&
    !elements.accountMenu.contains(event.target)
  ) {
    elements.accountMenu.classList.add("hidden");
  }
});

/* =====================================
   GESTIÓN DE CONVERSACIONES
===================================== */

function createNewChat() {
  currentChat = null;
  currentHistory = [];

  elements.messages.innerHTML = "";

  elements.messages.classList.add("hidden");
  elements.welcome.classList.remove("hidden");

  elements.input.value = "";
  elements.input.focus();

  renderChatList();
  closeSidebarOnMobile();
}

elements.newChat.addEventListener("click", createNewChat);

function ensureChat() {
  if (currentChat) return;

  currentChat = {
    id: generateId(),
    title: "Nueva conversación",
    saved: false,
    createdAt: Date.now(),
    messages: []
  };

  conversations.unshift(currentChat);

  saveStorage();
}

function saveCurrentMessage(role, text) {
  ensureChat();

  currentChat.messages.push({
    role,
    text,
    timestamp: Date.now()
  });

  if (
    currentChat.title === "Nueva conversación" &&
    role === "user"
  ) {
    currentChat.title = text.slice(0, 42);
  }

  currentHistory.push({
    role: role === "assistant" ? "model" : "user",
    parts: [{ text }]
  });

  saveStorage();
  renderChatList();
}

function renderChatList(filter = "") {
  elements.chatList.innerHTML = "";

  const filtered = conversations.filter(chat =>
    chat.title.toLowerCase().includes(filter.toLowerCase())
  );

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-chats";
    empty.textContent = filter
      ? "No se encontraron conversaciones."
      : "Tus conversaciones aparecerán aquí.";

    elements.chatList.appendChild(empty);
    return;
  }

  filtered.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-history-item";

    if (currentChat?.id === chat.id) {
      item.classList.add("selected");
    }

    const title = document.createElement("span");

    title.textContent =
      (chat.saved ? "★ " : "") + chat.title;

    title.title = chat.title;

    const menu = document.createElement("button");
    menu.type = "button";
    menu.title = "Eliminar conversación";
    menu.innerHTML = '<i data-lucide="trash-2"></i>';

    menu.addEventListener("click", event => {
      event.stopPropagation();
      deleteChat(chat.id);
    });

    item.append(title, menu);

    item.addEventListener("click", () => {
      openChat(chat.id);
    });

    elements.chatList.appendChild(item);
  });

  refreshIcons();
}

function openChat(id) {
  const chat = conversations.find(item => item.id === id);

  if (!chat) return;

  currentChat = chat;

  currentHistory = chat.messages.map(message => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.text }]
  }));

  elements.welcome.classList.add("hidden");
  elements.messages.classList.remove("hidden");

  elements.messages.innerHTML = "";

  chat.messages.forEach(message => {
    renderMessage(message.role, message.text);
  });

  elements.accountMenu.classList.add("hidden");

  renderChatList(elements.search.value);
  elements.messages.scrollTop = elements.messages.scrollHeight;

  closeSidebarOnMobile();
}

function deleteChat(id) {
  const chat = conversations.find(item => item.id === id);

  if (!chat) return;

  if (!confirm("¿Eliminar esta conversación?")) return;

  conversations = conversations.filter(item => item.id !== id);

  if (currentChat?.id === id) {
    createNewChat();
  }

  saveStorage();
  renderChatList(elements.search.value);

  toast("Conversación eliminada");
}

/* =====================================
   GUARDAR CONVERSACIONES
===================================== */

elements.saveChat.addEventListener("click", () => {
  if (!currentChat) {
    toast("Primero inicia una conversación");
    return;
  }

  currentChat.saved = !currentChat.saved;

  saveStorage();
  renderChatList(elements.search.value);

  toast(
    currentChat.saved
      ? "Conversación guardada"
      : "Conversación quitada de guardados"
  );
});

/* =====================================
   BUSCADOR
===================================== */

elements.search.addEventListener("input", event => {
  renderChatList(event.target.value);
});

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.search.focus();
  }
});

/* =====================================
   MOSTRAR MENSAJES
===================================== */

function renderMessage(role, text) {
  const message = document.createElement("article");

  message.className = "message";

  if (role === "user") {
    message.classList.add("user-message");
  }

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";

  if (role === "assistant") {
    avatar.innerHTML = '<i data-lucide="sparkles"></i>';
  }

  const content = document.createElement("div");
  content.className = "message-content";

  const name = document.createElement("strong");

  name.textContent = role === "user"
    ? "Tú"
    : "MathIA";

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  content.append(name, paragraph);

  message.append(avatar, content);

  elements.messages.appendChild(message);

  refreshIcons();

  elements.messages.scrollTop =
    elements.messages.scrollHeight;
}

/* =====================================
   INDICADOR DE RESPUESTA
===================================== */

function showTyping() {
  const typing = document.createElement("div");

  typing.className = "message";
  typing.id = "typingIndicator";

  typing.innerHTML = `
    <div class="message-avatar">
      <i data-lucide="sparkles"></i>
    </div>
    <div class="message-content">
      <strong>MathIA</strong>
      <p class="typing">Pensando...</p>
    </div>
  `;

  elements.messages.appendChild(typing);

  refreshIcons();

  elements.messages.scrollTop =
    elements.messages.scrollHeight;
}

/* =====================================
   ENVIAR MENSAJES A GEMINI
===================================== */

async function sendMessage(text) {
  if (isGenerating || !text.trim()) return;

  isGenerating = true;

  elements.sendButton.disabled = true;

  elements.welcome.classList.add("hidden");
  elements.messages.classList.remove("hidden");

  renderMessage("user", text);

  saveCurrentMessage("user", text);

  showTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        message: text,
        history: currentHistory.slice(0, -1)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error del servidor");
    }

    const answer = data.reply || "No recibí una respuesta.";

    document.getElementById("typingIndicator")?.remove();

    renderMessage("assistant", answer);

    saveCurrentMessage("assistant", answer);

  } catch (error) {
    document.getElementById("typingIndicator")?.remove();

    const errorMessage =
      "No pude comunicarme con Gemini. Comprueba la conexión y la configuración del servidor.";

    renderMessage("assistant", errorMessage);

    console.error("MathIA:", error);

    toast("Error al conectar con la IA");

  } finally {
    isGenerating = false;

    elements.sendButton.disabled = false;

    elements.input.focus();
  }
}

/* =====================================
   FORMULARIO
===================================== */

elements.chatForm.addEventListener("submit", event => {
  event.preventDefault();

  const text = elements.input.value.trim();

  if (!text || isGenerating) return;

  elements.input.value = "";
  elements.input.style.height = "auto";

  sendMessage(text);
});

elements.input.addEventListener("input", () => {
  elements.input.style.height = "auto";

  elements.input.style.height =
    Math.min(elements.input.scrollHeight, 180) + "px";
});

elements.input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.chatForm.requestSubmit();
  }
});

/* =====================================
   SUGERENCIAS
===================================== */

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.prompt;

    elements.input.value = prompt;

    elements.chatForm.requestSubmit();
  });
});

/* =====================================
   NAVEGACIÓN SECUNDARIA
===================================== */

document.querySelectorAll("[data-section]").forEach(button => {
  button.addEventListener("click", () => {
    const section = button.dataset.section;

    elements.accountMenu.classList.add("hidden");

    const labels = {
      images: "Imágenes",
      tasks: "Tareas programadas",
      plugins: "Complementos",
      codex: "Codex",
      projects: "Explorar proyectos",
      personalize: "Personalización",
      profile: "Perfil",
      settings: "Configuración",
      help: "Ayuda"
    };

    toast(labels[section] + " estará disponible próximamente.");

    closeSidebarOnMobile();
  });
});

/* =====================================
   ADJUNTAR ARCHIVOS
===================================== */

$("attachButton").addEventListener("click", () => {
  $("fileInput").click();
});

$("imageButton").addEventListener("click", () => {
  $("fileInput").click();
});

$("fileInput").addEventListener("change", event => {
  const file = event.target.files[0];

  if (!file) return;

  toast("Archivo seleccionado: " + file.name +
    ". La carga de archivos estará disponible próximamente.");

  event.target.value = "";
});

/* =====================================
   COMPARTIR
===================================== */

$("shareButton").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);

    toast("Dirección copiada");
  } catch {
    toast("No se pudo copiar la dirección");
  }
});

/* =====================================
   CUENTA
===================================== */

$("logoutButton").addEventListener("click", () => {
  toast("El sistema de cuentas se configurará próximamente.");
});

/* =====================================
   INICIALIZACIÓN
===================================== */

renderChatList();

refreshIcons();

console.log("MathIA iniciado correctamente.");
