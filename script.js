const secciones = {
    tec: {
        nombre: "Tecnología",
        prefijo: "tec",
        cantidad: 7,
        niveles: [2, 4, 6, 7]
    },
    sistemas: {
        nombre: "Sistemas operativos",
        prefijo: "sis",
        cantidad: 9,
        niveles: [2, 4, 6, 9]
    },
    len: {
        nombre: "Lenguajes de programación",
        prefijo: "len",
        cantidad: 9,
        niveles: [2, 4, 6, 9]
    },
    dep: {
        nombre: "DevOps",
        prefijo: "dep",
        cantidad: 4,
        niveles: [1, 2, 3, 4]
    }
};

const $ = id => document.getElementById(id);

const categoria = $("categoria");
const nivel = $("nivel");
const modo = $("modo");
const tablero = $("tablero");
const mensaje = $("mensaje");

const CLAVE_RECORDS = "memorama-club-records-v1";

let records = cargarRecords();
let configuracion;
let cartas = [];
let seleccionadas = [];
let memoria = new Map();
let puntos = [0, 0];
let turno = 0;
let movimientos = 0;
let encontradas = 0;
let totalParejas = 0;
let bloqueado = false;
let terminada = true;
let partida = 0;
let inicioTiempo = 0;
let reloj = null;
let erroresImagen = new Set();

function cargarRecords() {
    try {
        const datos = JSON.parse(
            localStorage.getItem(CLAVE_RECORDS) || "{}"
        );

        if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
            return {};
        }

        // Descarta entradas incompletas o dañadas.
        return Object.fromEntries(
            Object.entries(datos).filter(([, r]) =>
                r &&
                typeof r.nombre === "string" &&
                secciones[r.categoria] &&
                Number.isInteger(r.nivel) &&
                r.nivel >= 1 && r.nivel <= 4 &&
                Number.isInteger(r.movimientos) &&
                r.movimientos > 0 &&
                Number.isFinite(r.segundos) &&
                r.segundos >= 0
            )
        );
    } catch {
        return {};
    }
}

function mezclar(lista) {
    const copia = [...lista];

    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }

    return copia;
}

function azar(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatoTiempo(segundos) {
    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;

    return `${String(minutos).padStart(2, "0")}:` +
           `${String(resto).padStart(2, "0")}`;
}

function segundosActuales() {
    return Math.floor((performance.now() - inicioTiempo) / 1000);
}

function actualizarNiveles() {
    secciones[categoria.value].niveles.forEach((cantidad, indice) => {
        nivel.options[indice].textContent =
            `Nivel ${indice + 1}: ${cantidad} ` +
            (cantidad === 1 ? "pareja" : "parejas");
    });
}

function actualizarModo() {
    $("campo-jugador2").hidden = modo.value !== "dos";

    const explicaciones = {
        solo: "Juega a tu ritmo y consigue un récord con tu nombre.",
        dos: "Dos personas en la misma computadora: si aciertas, " +
             "repites; si fallas, juega la otra persona.",
        computadora: "Juega contra la computadora. Recuerda las " +
                     "cartas que se han mostrado, igual que tú."
    };

    $("ayuda-modo").textContent = explicaciones[modo.value];
}

function actualizarEstado() {
    $("movimientos").textContent = movimientos;
    $("parejas").textContent = `${encontradas} / ${totalParejas}`;
    $("marcador").hidden = configuracion.modo === "solo";

    $("marcador1").textContent =
        `😊 ${configuracion.nombres[0]}: ${puntos[0]}`;

    $("marcador2").textContent =
        `😎 ${configuracion.nombres[1]}: ${puntos[1]}`;

    [0, 1].forEach(indice => {
        $(`marcador${indice + 1}`).classList.toggle(
            "activo",
            !terminada && turno === indice
        );
    });

    $("turno").textContent = terminada
        ? "🎉 ¡Partida terminada!"
        : configuracion.modo === "solo"
            ? `¡Vamos, ${configuracion.nombres[0]}!`
            : `Turno de ${configuracion.nombres[turno]}`;
}

function crearCarta(id, posicion, partidaActual) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "carta";
    boton.setAttribute("aria-label", `Carta ${posicion + 1}, oculta`);

    const simbolo = document.createElement("span");
    simbolo.className = "simbolo";
    simbolo.textContent = "★";
    simbolo.setAttribute("aria-hidden", "true");

    const imagen = document.createElement("img");
    imagen.alt = "";
    imagen.draggable = false;

    const datos = secciones[configuracion.categoria];
    const ruta =
        `img/${configuracion.categoria}/` +
        `${datos.prefijo}${id}.jpeg.jpeg`;

    imagen.addEventListener("error", () => {
        if (partidaActual !== partida) return;

        erroresImagen.add(ruta);
        mensaje.textContent = `No se encontró la imagen: ${ruta}`;
    });

    imagen.src = ruta;
    boton.append(simbolo, imagen);

    const carta = {
        id,
        posicion,
        boton,
        visible: false,
        encontrada: false
    };

    boton.addEventListener("click", () => {
        if (bloqueado || terminada) return;

        // En "dos personas" nunca se ejecuta un turno automático.
        if (configuracion.modo === "computadora" && turno === 1) {
            return;
        }

        elegirCarta(carta);
    });

    tablero.append(boton);
    return carta;
}

function comenzar(reiniciar = false) {
    if (!reiniciar || !configuracion) {
        const nombre1 = $("jugador1").value.trim();
        const nombre2 = $("jugador2").value.trim();

        if (!nombre1) {
            mensaje.textContent = "😊 Escribe tu nombre para comenzar.";
            $("jugador1").focus();
            return;
        }

        if (modo.value === "dos" && !nombre2) {
            mensaje.textContent = "😎 Falta el nombre de la segunda persona.";
            $("jugador2").focus();
            return;
        }

        configuracion = {
            categoria: categoria.value,
            nivel: Number(nivel.value),
            modo: modo.value,
            nombres: [
                nombre1,
                modo.value === "computadora" ? "Computadora" : nombre2
            ]
        };
    }

    partida++;
    clearInterval(reloj);

    categoria.value = configuracion.categoria;
    actualizarNiveles();
    nivel.value = String(configuracion.nivel);
    modo.value = configuracion.modo;
    $("jugador1").value = configuracion.nombres[0];
    $("jugador2").value =
        configuracion.modo === "dos" ? configuracion.nombres[1] : "";
    actualizarModo();

    cartas = [];
    seleccionadas = [];
    memoria = new Map();
    erroresImagen = new Set();
    puntos = [0, 0];
    turno = 0;
    movimientos = 0;
    encontradas = 0;
    bloqueado = false;
    terminada = false;

    mensaje.textContent = "";
    tablero.replaceChildren();
    $("reiniciar").disabled = false;
    $("tiempo").textContent = "00:00";

    const datos = secciones[configuracion.categoria];
    totalParejas = datos.niveles[configuracion.nivel - 1];

    const disponibles = Array.from(
        { length: datos.cantidad },
        (_, i) => i + 1
    );

    const elegidas = mezclar(disponibles).slice(0, totalParejas);
    const mazo = mezclar([...elegidas, ...elegidas]);

    cartas = mazo.map((id, posicion) =>
        crearCarta(id, posicion, partida)
    );

    inicioTiempo = performance.now();

    reloj = setInterval(() => {
        $("tiempo").textContent = formatoTiempo(segundosActuales());
    }, 250);

    actualizarEstado();
}

function mostrar(carta) {
    carta.visible = true;
    carta.boton.classList.add("volteada");
    carta.boton.setAttribute(
        "aria-label",
        `Carta ${carta.posicion + 1}, imagen ${carta.id}`
    );
    memoria.set(carta.posicion, carta.id);
}

function ocultar(carta) {
    carta.visible = false;
    carta.boton.classList.remove("volteada");
    carta.boton.setAttribute(
        "aria-label",
        `Carta ${carta.posicion + 1}, oculta`
    );
}

async function elegirCarta(carta) {
    if (terminada || carta.visible || carta.encontrada) return;

    const partidaActual = partida;

    mostrar(carta);
    seleccionadas.push(carta);

    if (seleccionadas.length < 2) return;

    bloqueado = true;
    movimientos++;

    const [primera, segunda] = seleccionadas;
    const acierto = primera.id === segunda.id;
    const tiempoFinal = segundosActuales();

    actualizarEstado();
    await esperar(acierto ? 450 : 1000);

    if (partidaActual !== partida) return;

    if (acierto) {
        for (const elegida of seleccionadas) {
            elegida.encontrada = true;
            elegida.boton.classList.add("encontrada");
            elegida.boton.disabled = true;
            elegida.boton.setAttribute(
                "aria-label",
                `Pareja encontrada, imagen ${elegida.id}`
            );
            memoria.delete(elegida.posicion);
        }

        encontradas++;
        puntos[turno]++;
    } else {
        ocultar(primera);
        ocultar(segunda);

        if (configuracion.modo !== "solo") {
            turno = 1 - turno;
        }
    }

    seleccionadas = [];
    bloqueado = false;

    if (encontradas === totalParejas) {
        finalizar(tiempoFinal);
        return;
    }

    actualizarEstado();

    // Solo este modo activa a la computadora.
    if (configuracion.modo === "computadora" && turno === 1) {
        jugarComputadora(partidaActual);
    }
}

function parejaConocida(disponibles) {
    const vistas = new Map();

    for (const carta of disponibles) {
        const id = memoria.get(carta.posicion);
        if (id === undefined) continue;

        if (vistas.has(id)) {
            return [vistas.get(id), carta];
        }

        vistas.set(id, carta);
    }

    return null;
}

async function jugarComputadora(partidaActual) {
    bloqueado = true;

    await esperar(700);
    if (partidaActual !== partida || terminada) return;

    const disponibles = cartas.filter(carta => !carta.encontrada);
    const pareja = parejaConocida(disponibles);
    const desconocidas = disponibles.filter(
        carta => !memoria.has(carta.posicion)
    );

    const primera = pareja
        ? pareja[0]
        : azar(desconocidas.length ? desconocidas : disponibles);

    mostrar(primera);
    seleccionadas = [primera];

    await esperar(700);
    if (partidaActual !== partida || terminada) return;

    const restantes = disponibles.filter(carta => carta !== primera);
    const recordada = restantes.find(
        carta => memoria.get(carta.posicion) === primera.id
    );
    const sinVer = restantes.filter(
        carta => !memoria.has(carta.posicion)
    );

    const segunda = recordada || azar(
        sinVer.length ? sinVer : restantes
    );

    await elegirCarta(segunda);
}

function guardarRecord(segundos) {
    const clave = `${configuracion.categoria}-${configuracion.nivel}`;
    const anterior = records[clave];

    const mejora = !anterior ||
        movimientos < anterior.movimientos ||
        (
            movimientos === anterior.movimientos &&
            segundos < anterior.segundos
        );

    if (!mejora) return "";

    records[clave] = {
        nombre: configuracion.nombres[0],
        categoria: configuracion.categoria,
        nivel: configuracion.nivel,
        movimientos,
        segundos
    };

    try {
        localStorage.setItem(CLAVE_RECORDS, JSON.stringify(records));
        $("aviso-guardado").textContent = "";
        mostrarRecords();
        return " 🏆 ¡Nuevo récord guardado!";
    } catch {
        mostrarRecords();
        $("aviso-guardado").textContent =
            "El navegador no permitió guardar el récord. " +
            "Solo estará disponible mientras esta página siga abierta.";
        return " 🏆 ¡Nueva mejor marca!";
    }
}

function finalizar(segundos) {
    terminada = true;
    clearInterval(reloj);
    $("tiempo").textContent = formatoTiempo(segundos);
    actualizarEstado();

    if (erroresImagen.size) {
        mensaje.textContent =
            "La partida terminó, pero faltaron imágenes. " +
            "Revisa: " + [...erroresImagen].join(", ");
        return;
    }

    if (configuracion.modo === "solo") {
        mensaje.textContent =
            `🎉 ¡Muy bien, ${configuracion.nombres[0]}! ` +
            `${movimientos} movimientos en ${formatoTiempo(segundos)}.` +
            guardarRecord(segundos);
    } else if (puntos[0] === puntos[1]) {
        mensaje.textContent = "🤝 ¡Empate! Los dos jugaron muy bien.";
    } else {
        const ganador = puntos[0] > puntos[1] ? 0 : 1;

        mensaje.textContent =
            `🏆 ¡Ganó ${configuracion.nombres[ganador]} ` +
            `con ${puntos[ganador]} parejas!`;
    }
}

function mostrarRecords() {
    const contenedor = $("lista-records");
    contenedor.replaceChildren();

    const lista = Object.values(records).sort(
        (a, b) =>
            a.categoria.localeCompare(b.categoria) ||
            a.nivel - b.nivel
    );

    if (!lista.length) {
        contenedor.textContent =
            "🌟 Todavía no hay récords. ¡Consigue el primero!";
        return;
    }

    const tabla = document.createElement("table");
    const cabecera = document.createElement("thead");
    const filaTitulos = document.createElement("tr");

    ["Nombre", "Sección", "Nivel", "Movimientos", "Tiempo"]
        .forEach(titulo => {
            const celda = document.createElement("th");
            celda.scope = "col";
            celda.textContent = titulo;
            filaTitulos.append(celda);
        });

    cabecera.append(filaTitulos);

    const cuerpo = document.createElement("tbody");

    for (const record of lista) {
        const fila = document.createElement("tr");

        const valores = [
            record.nombre,
            secciones[record.categoria].nombre,
            record.nivel,
            record.movimientos,
            formatoTiempo(record.segundos)
        ];

        for (const valor of valores) {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.append(celda);
        }

        cuerpo.append(fila);
    }

    tabla.append(cabecera, cuerpo);
    contenedor.append(tabla);
}

categoria.addEventListener("change", actualizarNiveles);
modo.addEventListener("change", actualizarModo);
$("iniciar").addEventListener("click", () => comenzar());
$("reiniciar").addEventListener("click", () => comenzar(true));

actualizarNiveles();
actualizarModo();
mostrarRecords();