"use strict";

const $ = (id) => document.getElementById(id);
const terminal = $("terminal");
const salida = $("codigo");

let nombreGuardado = "";
let posicion = 0;
let intervalo = null;
let imagenURL = null;

const codigo = `#include <stdio.h>
#include <stdlib.h>

struct session_info {
    unsigned int session_id;
    unsigned int status;
    char buffer[256];
};

static int initialize_session(struct session_info *session)
{
    if (session == NULL) {
        return -1;
    }

    session->status = 1;

    for (int block = 0; block < 128; block++) {
        unsigned int checksum = block ^ 0xA7F3;
        printf("Processing block: %08x", checksum);
    }

    return 0;
}

/* Local simulation environment */
int main(void)
{
    struct session_info session = {0};
    initialize_session(&session);
    return 0;
}

`;

function detener() {
  clearInterval(intervalo);
  intervalo = null;
}

function abrir(id) {
  detener();

  document.querySelectorAll("dialog[open]").forEach((dialogo) => {
    dialogo.close();
  });

  $(id).showModal();
}

function escribir() {
  let fragmento = "";

  for (let i = 0; i < 10; i++) {
    fragmento += codigo[posicion];
    posicion = (posicion + 1) % codigo.length;
  }

  salida.textContent += fragmento;

  if (salida.textContent.length > 20000) {
    salida.textContent = salida.textContent.slice(-14000);
  }

  terminal.scrollTop = terminal.scrollHeight;
}

function configurarNombre() {
  $("nombre").value = nombreGuardado;
  abrir("nombreDialogo");
  $("nombre").focus();
}

$("nombreFormulario").addEventListener("submit", (evento) => {
  evento.preventDefault();

  const nombre = $("nombre").value.trim();

  if (!nombre) {
    $("nombre").setCustomValidity("Escribe un nombre o alias.");
    $("nombre").reportValidity();
    return;
  }

  $("nombre").setCustomValidity("");
  nombreGuardado = nombre;
  $("nombreDialogo").close();
  terminal.focus();
});

$("nombre").addEventListener("input", () => {
  $("nombre").setCustomValidity("");
});

$("abrirConfiguracion").onclick = () => abrir("configuracion");
$("abrirAyuda").onclick = () => abrir("ayuda");

document.querySelectorAll("[data-cerrar]").forEach((boton) => {
  boton.onclick = () => boton.closest("dialog").close();
});

document.querySelectorAll("dialog").forEach((dialogo) => {
  dialogo.addEventListener("close", () => {
    if (dialogo.id === "efecto") detener();

    if (!document.querySelector("dialog[open]")) {
      terminal.focus();
    }
  });
});

$("fondo").oninput = (evento) => {
  document.documentElement.style.setProperty(
    "--fondo", evento.target.value
  );
};

$("texto").oninput = (evento) => {
  document.documentElement.style.setProperty(
    "--texto", evento.target.value
  );
};

$("imagen").onchange = (evento) => {
  const archivo = evento.target.files[0];

  if (!archivo || !archivo.type.startsWith("image/")) return;

  if (imagenURL) URL.revokeObjectURL(imagenURL);

  imagenURL = URL.createObjectURL(archivo);

  document.body.style.backgroundImage =
    `linear-gradient(#0007, #0007), url("${imagenURL}")`;
};

$("quitarImagen").onclick = () => {
  document.body.style.backgroundImage = "none";
  $("imagen").value = "";

  if (imagenURL) URL.revokeObjectURL(imagenURL);
  imagenURL = null;
};

function crearAnimacion(tipo) {
  const contenedor = $("animacion");
  contenedor.replaceChildren();

  const elemento = document.createElement("div");

  if (tipo === "radar") {
    elemento.className = "radar";
  } else if (tipo === "onda") {
    elemento.className = "onda";

    for (let i = 0; i < 18; i++) {
      elemento.append(document.createElement("span"));
    }
  } else {
    elemento.className = "icono";
    elemento.textContent = tipo;
  }

  contenedor.append(elemento);
}

function mostrarEfecto(letra) {
  const nombre = nombreGuardado || "Usuario de prueba";

  const escenas = {
    A: {
      inicio: "VERIFICANDO ACCESO...",
      final: "ACCESO CONCEDIDO",
      animacion: "✓",
      lineas: [
        `> Perfil: ${nombre}`,
        "> Identificador: NX-2048",
        "> Validando sesión de demostración...",
        "> Comprobando permisos del entorno...",
        `> Acceso ficticio concedido a ${nombre}.`
      ]
    },

    L: {
      inicio: `LOCALIZANDO A ${nombre.toUpperCase()}...`,
      final: `UBICACIÓN LOCALIZADA DE ${nombre.toUpperCase()}`,
      animacion: "radar",
      lineas: [
        `> Perfil seleccionado: ${nombre}`,
        "> Iniciando rastreo simulado...",
        "> Nodo: relay-07.demo.invalid",
        "> IP de ejemplo: 192.0.2.47",
        "> Zona ficticia: Distrito Central / Sector 07",
        "> Coordenadas de ejemplo: 00.0000, 00.0000",
        `> Rastreo ficticio de ${nombre} completado.`
      ]
    },

    M: {
      inicio: "MICRÓFONO ACTIVADO",
      final: "CANAL DE AUDIO SIMULADO ACTIVO",
      animacion: "onda",
      lineas: [
        `> Perfil seleccionado: ${nombre}`,
        "> Canal visual: AUDIO-07",
        "> Formato de escena: 48 kHz / estéreo",
        "> Escuchando todo lo que dices… [FICCIÓN]",
        "> Generando onda animada...",
        "> Micrófono real: sin acceso"
      ]
    },

    D: {
      inicio: `DESCARGANDO DOCUMENTOS DE ${nombre.toUpperCase()}...`,
      final: "DOCUMENTOS: SIMULACIÓN COMPLETADA",
      animacion: "↓",
      lineas: [
        `> Perfil seleccionado: ${nombre}`,
        "> Preparando archivos de ejemplo...",
        "> informe_demo.pdf ........ 2.4 MB",
        "> notas_ejemplo.txt ........ 18 KB",
        "> proyecto_demo.zip ....... 8.1 MB",
        "> Destino ficticio: /sandbox/documentos/",
        "> Finalizado. No se copiaron archivos reales."
      ]
    },

    C: {
      inicio: `DESCARGANDO CONVERSACIONES DE ${nombre.toUpperCase()}...`,
      final: "CONVERSACIONES: SIMULACIÓN COMPLETADA",
      animacion: "↓",
      lineas: [
        `> Perfil seleccionado: ${nombre}`,
        "> Preparando historial ficticio...",
        "> chat_demo_01.txt .... 124 mensajes de ejemplo",
        "> chat_demo_02.txt .... 86 mensajes de ejemplo",
        "> historial_demo.zip ....... 1.8 MB",
        "> Ordenando registros de demostración...",
        "> Finalizado. Sin acceso a conversaciones reales."
      ]
    }
  };

  const escena = escenas[letra];
  if (!escena) return;

  abrir("efecto");

  $("titulo").textContent = escena.inicio;
  $("perfil").textContent = `PERFIL: ${nombre}`;
  $("detalles").textContent = "";
  $("progreso").value = 0;
  $("estado").textContent = "Iniciando simulación…";

  crearAnimacion(escena.animacion);

  let porcentaje = 0;

  intervalo = setInterval(() => {
    porcentaje = Math.min(100, porcentaje + 2);

    $("progreso").value = porcentaje;
    $("estado").textContent = `Procesando… ${porcentaje}%`;

    const cantidad = Math.floor(
      porcentaje / 100 * escena.lineas.length
    );

    $("detalles").textContent =
      escena.lineas.slice(0, cantidad).join("\n");

    if (porcentaje === 100) {
      detener();
      $("titulo").textContent = escena.final;
      $("estado").textContent = "✓ Secuencia ficticia completada.";
    }
  }, 90);
}

function ejecutar(letra) {
  switch (letra) {
    case "N":
      configurarNombre();
      break;

    case "H":
      abrir("ayuda");
      break;

    case "B":
      abrir("configuracion");
      break;

    case "R":
      detener();

      document.querySelectorAll("dialog[open]").forEach((dialogo) => {
        dialogo.close();
      });

      salida.textContent = "";
      posicion = 0;
      terminal.focus();
      break;

    default:
      mostrarEfecto(letra);
  }
}

document.querySelectorAll("[data-comando]").forEach((boton) => {
  boton.onclick = () => ejecutar(boton.dataset.comando);
});

terminal.addEventListener("click", () => terminal.focus());

document.addEventListener("keydown", (evento) => {
  const elemento = evento.target;

  if (
    elemento instanceof Element &&
    elemento.closest("input, textarea, select, [contenteditable]")
  ) return;

  if (
    evento.altKey &&
    evento.shiftKey &&
    !evento.ctrlKey &&
    !evento.metaKey
  ) {
    const letra = evento.code.startsWith("Key")
      ? evento.code.slice(3)
      : evento.key.toUpperCase();

    const comandos = ["N", "A", "L", "M", "D", "C", "B", "H", "R"];

    if (comandos.includes(letra)) {
      evento.preventDefault();

      if (!evento.repeat) ejecutar(letra);
    }

    return;
  }

  if (document.querySelector("dialog[open]")) return;

  if (
    evento.ctrlKey ||
    evento.altKey ||
    evento.metaKey ||
    evento.key.length !== 1
  ) return;

  if (
    elemento instanceof Element &&
    elemento.closest("button, a")
  ) return;

  evento.preventDefault();
  escribir();
});

// Mensaje inicial para comprobar que JavaScript cargó.
salida.textContent = "// Terminal lista. Presiona cualquier tecla.\n\n";
terminal.focus();