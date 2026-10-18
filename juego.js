// IMÁGENES DEL JUEGO
const imagenes = [
    "bardz.png",
    "cina.png",
    "hello.jpg",
    "keropi.jpg",
    "kuromi.jpg",
    "melody.jpg",
    "pochaco.jpg",
    "pumpom.png"
];

const tablero = document.getElementById("tablero");

// ESTADO DE LA PARTIDA
let jugador = "";
let totalParejas = 8;
let claveJugador = "";
let historial = [];

let primeraTarjeta = null;
let bloqueado = false;
let puntos = 0;
let intentos = 0;
let parejasEncontradas = 0;
let segundos = 0;
let pistasRestantes = 2;

let cronometro = null;
let esperaTarjetas = null;
let esperaVictoria = null;

let sonidoActivado = true;
let contextoAudio = null;

// HISTORIAL DEL JUGADOR
function cargarHistorial() {
    historial = [];

    try {
        const guardado = JSON.parse(
            localStorage.getItem(claveJugador) || "[]"
        );

        if (Array.isArray(guardado)) {
            historial = guardado.filter(function (partida) {
                return partida &&
                    Number.isFinite(partida.tiempo) &&
                    partida.tiempo >= 0 &&
                    Number.isInteger(partida.intentos) &&
                    partida.intentos >= totalParejas;
            });
        }
    } catch (error) {
        historial = [];
    }
}

function guardarHistorial() {
    try {
        localStorage.setItem(
            claveJugador,
            JSON.stringify(historial)
        );
        return true;
    } catch (error) {
        return false;
    }
}

function actualizarRecord() {
    const record = document.getElementById("record");

    if (historial.length === 0) {
        record.textContent = "Sin récord todavía";
        return;
    }

    const mejor = Math.min(
        ...historial.map(function (partida) {
            return partida.tiempo;
        })
    );

    record.textContent = mejor + " segundos";
}

// REINICIAMOS SIN PERDER EL JUGADOR
function iniciarPartida() {
    clearInterval(cronometro);
    clearTimeout(esperaTarjetas);
    clearTimeout(esperaVictoria);

    cronometro = null;
    primeraTarjeta = null;
    bloqueado = false;
    puntos = 0;
    intentos = 0;
    parejasEncontradas = 0;
    segundos = 0;
    pistasRestantes = 2;
document.getElementById("pista").textContent = "💡 Pistas: 2";
document.getElementById("pista").disabled = jugador === "";

    document.getElementById("puntos").textContent = 0;
    document.getElementById("intentos").textContent = 0;
    document.getElementById("tiempo").textContent = 0;

    document.getElementById("victoria").close();
    document.getElementById("historial").close();

    document.querySelectorAll(".confeti").forEach(function (papel) {
        papel.remove();
    });

    actualizarRecord();
    crearTablero();
}

// CREAMOS Y MEZCLAMOS LAS TARJETAS
function crearTablero() {
    tablero.replaceChildren();

   const seleccionadas = imagenes.slice(0, totalParejas);
const tarjetas = [...seleccionadas, ...seleccionadas];

    for (let i = tarjetas.length - 1; i > 0; i--) {
        const posicion = Math.floor(Math.random() * (i + 1));

        const temporal = tarjetas[i];
        tarjetas[i] = tarjetas[posicion];
        tarjetas[posicion] = temporal;
    }

    tarjetas.forEach(function (nombre) {
        const tarjeta = document.createElement("button");
        tarjeta.type = "button";
        tarjeta.className = "tarjeta";
        tarjeta.dataset.imagen = nombre;
        tarjeta.disabled = jugador === "";
        tarjeta.setAttribute("aria-label", "Voltear tarjeta");

        const interior = document.createElement("div");
        interior.className = "tarjeta-interior";

        const reverso = document.createElement("div");
        reverso.className = "cara reverso";
        reverso.textContent = "🎀";

        const frente = document.createElement("div");
        frente.className = "cara frente";

        const imagen = document.createElement("img");
        imagen.src = "imagenes/" + nombre;
        imagen.alt = nombre;

        frente.appendChild(imagen);
        interior.appendChild(reverso);
        interior.appendChild(frente);
        tarjeta.appendChild(interior);
        tablero.appendChild(tarjeta);

        tarjeta.addEventListener("click", function () {
            elegirTarjeta(tarjeta);
        });
    });
}

// CONTROLAMOS LOS TURNOS
function elegirTarjeta(tarjeta) {
    if (
        !jugador ||
        bloqueado ||
        tarjeta.classList.contains("volteada")
    ) {
        return;
    }

    tarjeta.classList.add("volteada");

    if (cronometro === null) {
        cronometro = setInterval(function () {
            segundos++;
            document.getElementById("tiempo").textContent = segundos;
        }, 1000);
    }

    if (primeraTarjeta === null) {
        primeraTarjeta = tarjeta;
        return;
    }

    const primera = primeraTarjeta;
    const segunda = tarjeta;

    primeraTarjeta = null;
    bloqueado = true;
    intentos++;

    document.getElementById("intentos").textContent = intentos;

    if (primera.dataset.imagen === segunda.dataset.imagen) {
        puntos += 10;
        parejasEncontradas++;

        document.getElementById("puntos").textContent = puntos;

        primera.disabled = true;
        segunda.disabled = true;

        reproducirSonido(parejasEncontradas === totalParejas);

        if (parejasEncontradas === totalParejas) {
            terminarPartida();
        } else {
            bloqueado = false;
        }
    } else {
        esperaTarjetas = setTimeout(function () {
            primera.classList.remove("volteada");
            segunda.classList.remove("volteada");
            bloqueado = false;
        }, 1000);
    }
}

// GUARDAMOS SOLAMENTE LAS PARTIDAS COMPLETADAS
function terminarPartida() {
    clearInterval(cronometro);

    historial.push({
        tiempo: segundos,
        intentos: intentos
    });

    const guardado = guardarHistorial();
    actualizarRecord();

    document.getElementById("jugador-actual").textContent = guardado
        ? "🎀 Jugando: " + jugador
        : "Tu resultado queda en esta sesión; no pudo guardarse al cerrar.";

    esperaVictoria = setTimeout(function () {
        document.getElementById("puntos-finales").textContent = puntos;
        document.getElementById("intentos-finales").textContent = intentos;
        document.getElementById("tiempo-final").textContent = segundos;

        document.getElementById("victoria").showModal();
        lanzarConfeti();
    }, 600);
}

// ELEGIMOS EL JUGADOR
document.getElementById("guardar-jugador").addEventListener("click", function () {
    const campo = document.getElementById("nombre-jugador");
    const nombre = campo.value.trim().replace(/\s+/g, " ");

    if (!nombre) {
        document.getElementById("jugador-actual").textContent =
            "Escribe tu nombre primero 🎀";
        campo.focus();
        return;
    }

    const partidaEnCurso =
        cronometro !== null &&
        parejasEncontradas < totalParejas;

    if (
        partidaEnCurso &&
        !confirm("¿Empezar otra partida? Se perderá el avance actual.")
    ) {
        return;
    }

    jugador = nombre;
    totalParejas = Number(document.getElementById("nivel").value);

    // Mayúsculas y minúsculas cuentan como el mismo nombre.
    claveJugador = "sanrio-historial:" +
    encodeURIComponent(nombre.normalize("NFC").toLowerCase()) +
    (totalParejas === 4 ? ":facil" : "");

    cargarHistorial();

    document.getElementById("jugador-actual").textContent =
        "🎀 Jugando: " + jugador;

    iniciarPartida();
});

// MOSTRAMOS LA TABLA DE TIEMPOS
function mostrarHistorial() {
    const lista = document.getElementById("lista-tiempos");
    lista.replaceChildren();

    document.getElementById("nombre-historial").textContent =
        "Jugador: " + jugador;

    document.getElementById("historial-vacio").hidden =
        historial.length > 0;

    document.getElementById("tabla-tiempos").hidden =
        historial.length === 0;

    document.getElementById("borrar-historial").disabled =
        historial.length === 0;

    historial.forEach(function (partida, indice) {
        const fila = document.createElement("tr");

        const datos = [
            indice + 1,
            partida.tiempo + " segundos",
            partida.intentos
        ];

        datos.forEach(function (dato) {
            const celda = document.createElement("td");
            celda.textContent = dato;
            fila.appendChild(celda);
        });

        lista.appendChild(fila);
    });
}

document.getElementById("ver-tiempos").addEventListener("click", function () {
    if (!jugador) {
        document.getElementById("jugador-actual").textContent =
            "Escribe tu nombre y pulsa Empezar para ver tus tiempos.";
        document.getElementById("nombre-jugador").focus();
        return;
    }

    document.getElementById("mensaje-historial").textContent = "";
    mostrarHistorial();
    document.getElementById("historial").showModal();
});

document.getElementById("cerrar-historial").addEventListener("click", function () {
    document.getElementById("historial").close();
});

// BORRAMOS SOLO EL HISTORIAL DEL JUGADOR ACTUAL
document.getElementById("borrar-historial").addEventListener("click", function () {
    if (!confirm("¿Borrar todos los tiempos de " + jugador + "?")) {
        return;
    }

    try {
        localStorage.removeItem(claveJugador);
    } catch (error) {
        document.getElementById("mensaje-historial").textContent =
            "No se pudo borrar el historial. Inténtalo de nuevo.";
        return;
    }

    historial = [];
    actualizarRecord();
    mostrarHistorial();

    document.getElementById("mensaje-historial").textContent =
        "Historial borrado.";
});

// BOTONES PARA VOLVER A JUGAR
document.getElementById("reiniciar").addEventListener("click", iniciarPartida);
document.getElementById("jugar-otra-vez").addEventListener("click", iniciarPartida);

// CONFETI PASTEL
function lanzarConfeti() {
    const colores = ["#f7c6dc", "#e6d5f7", "#bde0fe", "#cdeac0", "#fff1b6"];
    const ventana = document.getElementById("victoria");

    for (let i = 0; i < 50; i++) {
        const papelito = document.createElement("span");
        papelito.className = "confeti";
        papelito.setAttribute("aria-hidden", "true");

        papelito.style.left = Math.random() * 100 + "vw";
        papelito.style.backgroundColor = colores[i % colores.length];
        papelito.style.animationDelay = Math.random() * 0.8 + "s";

        ventana.appendChild(papelito);

        setTimeout(function () {
            papelito.remove();
        }, 4000);
    }
}

// ACTIVAMOS O SILENCIAMOS EL SONIDO
document.getElementById("sonido").addEventListener("click", function () {
    sonidoActivado = !sonidoActivado;

    this.textContent = sonidoActivado
        ? "🔊 Sonido activado"
        : "🔇 Sonido desactivado";

    this.setAttribute("aria-pressed", String(sonidoActivado));
});

// SONIDOS DE ACIERTO Y VICTORIA
function reproducirSonido(victoria = false) {
    if (!sonidoActivado) {
        return;
    }

    try {
        if (contextoAudio === null) {
            contextoAudio = new AudioContext();
        }

        contextoAudio.resume().then(function () {
            const notas = victoria
                ? [523, 659, 784, 1047]
                : [659, 880];

            const inicio = contextoAudio.currentTime;

            notas.forEach(function (frecuencia, indice) {
                const nota = contextoAudio.createOscillator();
                const volumen = contextoAudio.createGain();
                const momento = inicio + indice * 0.15;

                nota.type = "sine";
                nota.frequency.value = frecuencia;

                volumen.gain.setValueAtTime(0, momento);
                volumen.gain.linearRampToValueAtTime(0.12, momento + 0.02);
                volumen.gain.exponentialRampToValueAtTime(
                    0.001,
                    momento + 0.25
                );

                nota.connect(volumen);
                volumen.connect(contextoAudio.destination);

                nota.start(momento);
                nota.stop(momento + 0.3);
            });
        }).catch(function () {});
    } catch (error) {
        // El juego funciona aunque el audio no esté disponible.
    }
}

// Al abrir la página, esperamos a que escriban un nombre.
iniciarPartida();
// Mostramos una pista sin cambiar las parejas encontradas.
document.getElementById("pista").addEventListener("click", function () {
    if (!jugador || bloqueado || pistasRestantes === 0) {
        return;
    }

    if (primeraTarjeta !== null) {
        document.getElementById("jugador-actual").textContent =
            "Completa tu turno antes de pedir una pista 🎀";
        return;
    }

    bloqueado = true;
    pistasRestantes--;

    this.textContent = "💡 Pistas: " + pistasRestantes;
    this.disabled = pistasRestantes === 0;

    document.getElementById("jugador-actual").textContent =
        "🎀 Jugando: " + jugador;

    const ocultas = tablero.querySelectorAll(
        ".tarjeta:not(.volteada)"
    );

    ocultas.forEach(function (tarjeta) {
        tarjeta.classList.add("volteada");
    });

    esperaTarjetas = setTimeout(function () {
        ocultas.forEach(function (tarjeta) {
            tarjeta.classList.remove("volteada");
        });

        bloqueado = false;
    }, 1000);
});
// Conectamos el botón de pistas.
document.getElementById("pista").onclick = function () {
    if (!jugador || bloqueado || pistasRestantes === 0) {
        return;
    }

    if (primeraTarjeta !== null) {
        document.getElementById("jugador-actual").textContent =
            "Completa tu turno antes de pedir una pista 🎀";
        return;
    }

    bloqueado = true;
    pistasRestantes--;

    this.textContent = "💡 Pistas: " + pistasRestantes;
    this.disabled = pistasRestantes === 0;

    const ocultas = tablero.querySelectorAll(
        ".tarjeta:not(.volteada)"
    );

    ocultas.forEach(function (tarjeta) {
        tarjeta.classList.add("volteada");
    });

    esperaTarjetas = setTimeout(function () {
        ocultas.forEach(function (tarjeta) {
            tarjeta.classList.remove("volteada");
        });

        bloqueado = false;
    }, 1000);
};