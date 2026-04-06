const SUPABASE_URL = "https://qmcgjabudzmvtefjgmfn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtY2dqYWJ1ZHptdnRlZmpnbWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDIzODMsImV4cCI6MjA5MTA3ODM4M30.tzGY5hRrgb7HC6pprGi2qyWdo6CQcFRbo_o8RUpClt0";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const codigoInput = document.getElementById("codigoInput");
const buscarBtn = document.getElementById("buscarBtn");
const mensajeEl = document.getElementById("mensaje");

const fichaEl = document.getElementById("ficha");
const operacionBoxEl = document.getElementById("operacionBox");
const historialBoxEl = document.getElementById("historialBox");

const fichaCodigoEl = document.getElementById("fichaCodigo");
const fichaClienteEl = document.getElementById("fichaCliente");
const fichaEstatusEl = document.getElementById("fichaEstatus");
const fichaSaldoEl = document.getElementById("fichaSaldo");
const fichaVenceEl = document.getElementById("fichaVence");

const tipoOperacionEl = document.getElementById("tipoOperacion");
const montoInputEl = document.getElementById("montoInput");
const descripcionInputEl = document.getElementById("descripcionInput");
const guardarOperacionBtn = document.getElementById("guardarOperacionBtn");

const historialListaEl = document.getElementById("historialLista");

let tarjetaActual = null;
let usuarioActual = null;

function showMessage(text, type = "") {
  mensajeEl.textContent = text;
  mensajeEl.className = `message ${type}`.trim();
  mensajeEl.classList.remove("hidden");
}

function hideMessage() {
  mensajeEl.className = "message hidden";
  mensajeEl.textContent = "";
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-MX");
}

function renderFicha(tarjeta, usuario) {
  fichaCodigoEl.textContent = tarjeta.codigo_tarjeta || "-";
  fichaClienteEl.textContent = usuario?.nombre_completo || "-";
  fichaEstatusEl.textContent = tarjeta.estatus || "-";
  fichaSaldoEl.textContent = formatMoney(tarjeta.saldo_actual);
  fichaVenceEl.textContent = formatDate(tarjeta.fecha_vencimiento_saldo);

  fichaEl.classList.remove("hidden");
  operacionBoxEl.classList.remove("hidden");
  historialBoxEl.classList.remove("hidden");
}

function renderHistorial(items) {
  if (!items?.length) {
    historialListaEl.innerHTML = `<div class="history-item">Sin movimientos aún.</div>`;
    return;
  }

  historialListaEl.innerHTML = items
    .map(
      (item) => `
        <div class="history-item">
          <div class="history-top">
            <span class="history-type">${item.tipo || "-"}</span>
            <span class="history-amount">${formatMoney(item.monto)}</span>
          </div>
          <div class="history-meta">${item.descripcion || "-"}</div>
          <div class="history-meta">${formatDate(item.fecha_hora)}</div>
        </div>
      `
    )
    .join("");
}

async function cargarHistorial(codigoTarjeta) {
  const { data: tarjeta, error: tarjetaError } = await client
    .from("tarjetas")
    .select("id")
    .eq("codigo_tarjeta", codigoTarjeta)
    .single();

  if (tarjetaError || !tarjeta) {
    renderHistorial([]);
    return;
  }

  const { data, error } = await client
    .from("movimientos")
    .select("tipo, monto, descripcion, fecha_hora")
    .eq("tarjeta_id", tarjeta.id)
    .order("fecha_hora", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error historial:", error);
    renderHistorial([]);
    return;
  }

  renderHistorial(data || []);
}

async function consultarTarjeta() {
  hideMessage();

  const codigo = codigoInput.value.trim().toUpperCase();

  if (!codigo) {
    showMessage("Escribe un código de tarjeta.", "error");
    return;
  }

  const { data: tarjeta, error: tarjetaError } = await client
    .from("tarjetas")
    .select("id, codigo_tarjeta, estatus, saldo_actual, fecha_vencimiento_saldo, usuario_id")
    .eq("codigo_tarjeta", codigo)
    .single();

  if (tarjetaError || !tarjeta) {
    console.error("Error tarjeta:", tarjetaError);
    showMessage("Tarjeta no encontrada.", "error");
    fichaEl.classList.add("hidden");
    operacionBoxEl.classList.add("hidden");
    historialBoxEl.classList.add("hidden");
    tarjetaActual = null;
    usuarioActual = null;
    return;
  }

  let usuario = null;

  if (tarjeta.usuario_id) {
    const { data: usuarioData, error: usuarioError } = await client
      .from("usuarios")
      .select("id, nombre_completo")
      .eq("id", tarjeta.usuario_id)
      .single();

    if (!usuarioError && usuarioData) {
      usuario = usuarioData;
    } else if (usuarioError) {
      console.error("Error usuario:", usuarioError);
    }
  }

  tarjetaActual = tarjeta;
  usuarioActual = usuario;

  renderFicha(tarjeta, usuario);
  await cargarHistorial(codigo);
  showMessage("Tarjeta cargada correctamente.", "success");
}

async function guardarOperacion() {
  hideMessage();

  if (!tarjetaActual) {
    showMessage("Primero consulta una tarjeta.", "error");
    return;
  }

  const tipo = tipoOperacionEl.value;
  const monto = Number(montoInputEl.value);
  const descripcion = descripcionInputEl.value.trim();

  if (!monto || monto <= 0) {
    showMessage("Ingresa un monto válido.", "error");
    return;
  }

  let nuevoSaldo = Number(tarjetaActual.saldo_actual || 0);

  if (tipo === "recarga") {
    nuevoSaldo += monto;
  } else {
    if (nuevoSaldo < monto) {
      showMessage("Saldo insuficiente para descontar ese monto.", "error");
      return;
    }
    nuevoSaldo -= monto;
  }

  const updateData = {
    saldo_actual: nuevoSaldo,
  };

  if (tipo === "recarga") {
    const ahora = new Date();
    ahora.setDate(ahora.getDate() + 30);
    updateData.fecha_vencimiento_saldo = ahora.toISOString();
  }

  const { error: updateError } = await client
    .from("tarjetas")
    .update(updateData)
    .eq("id", tarjetaActual.id);

  if (updateError) {
    console.error("Error actualizando saldo:", updateError);
    showMessage(`No se pudo actualizar saldo: ${updateError.message}`, "error");
    return;
  }

  const movimientoPayload = {
    tarjeta_id: tarjetaActual.id,
    usuario_id: tarjetaActual.usuario_id,
    tipo,
    monto,
    descripcion:
      descripcion ||
      (tipo === "recarga" ? "Recarga en caja" : "Descuento en caja"),
    realizado_por: "caja",
    origen: "caja",
    referencia: tarjetaActual.codigo_tarjeta,
  };

  const { error: movimientoError } = await client
    .from("movimientos")
    .insert([movimientoPayload]);

  if (movimientoError) {
    console.error("Error movimiento:", movimientoError);
    showMessage(
      `Saldo actualizado, pero falló el registro: ${movimientoError.message}`,
      "error"
    );
    return;
  }

  tarjetaActual.saldo_actual = nuevoSaldo;

  if (updateData.fecha_vencimiento_saldo) {
    tarjetaActual.fecha_vencimiento_saldo = updateData.fecha_vencimiento_saldo;
  }

  renderFicha(tarjetaActual, usuarioActual);
  await cargarHistorial(tarjetaActual.codigo_tarjeta);

  montoInputEl.value = "";
  descripcionInputEl.value = "";

  showMessage(
    tipo === "recarga"
      ? "Recarga registrada correctamente."
      : "Descuento registrado correctamente.",
    "success"
  );
}

buscarBtn.addEventListener("click", consultarTarjeta);
guardarOperacionBtn.addEventListener("click", guardarOperacion);

codigoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") consultarTarjeta();
});
