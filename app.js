const SUPABASE_URL = "https://qmcgjabudzmvtefjgmfn.supabase.co";

// La key se pide una vez y se guarda localmente
let SUPABASE_ANON_KEY = localStorage.getItem("SUPABASE_ANON_KEY");

if (!SUPABASE_ANON_KEY) {
  SUPABASE_ANON_KEY = prompt(
    "Pega tu Supabase publishable key (se guardará localmente en este dispositivo)."
  );
}

if (!SUPABASE_ANON_KEY) {
  alert("No se proporcionó publishable key. No se puede cargar la tarjeta.");
  throw new Error("Missing key");
}

localStorage.setItem("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const contentEl = document.getElementById("content");

function showError(message) {
  loadingEl.classList.add("hidden");
  contentEl.classList.add("hidden");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString("es-MX");
}

function getCodigoFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const card = params.get("card");
  if (card) return card;

  const pathParts = window.location.pathname.split("/").filter(Boolean);
  return pathParts[pathParts.length - 1] || null;
}

async function loadCard() {
  const codigo = getCodigoFromUrl();

  if (!codigo) {
    showError("No se encontró el código de tarjeta en la URL.");
    return;
  }

  const { data: tarjeta, error: tarjetaError } = await client
    .from("tarjetas")
    .select("codigo_tarjeta, estatus, saldo_actual, fecha_vencimiento_saldo, usuario_id")
    .eq("codigo_tarjeta", codigo)
    .single();

  if (tarjetaError || !tarjeta) {
    console.error("Error tarjeta:", tarjetaError);
    showError("Tarjeta no encontrada.");
    return;
  }

  let nombreCliente = "-";

  if (tarjeta.usuario_id) {
    const { data: usuario, error: usuarioError } = await client
      .from("usuarios")
      .select("nombre_completo")
      .eq("id", tarjeta.usuario_id)
      .single();

    if (!usuarioError && usuario) {
      nombreCliente = usuario.nombre_completo || "-";
    } else {
      console.error("Error usuario:", usuarioError);
    }
  }

  document.getElementById("codigo_tarjeta").textContent =
    tarjeta.codigo_tarjeta || "-";
  document.getElementById("estatus").textContent = tarjeta.estatus || "-";
  document.getElementById("saldo_actual").textContent = formatMoney(tarjeta.saldo_actual);
  document.getElementById("fecha_vencimiento_saldo").textContent =
    formatDate(tarjeta.fecha_vencimiento_saldo);
  document.getElementById("nombre_cliente").textContent = nombreCliente;

  loadingEl.classList.add("hidden");
  errorEl.classList.add("hidden");
  contentEl.classList.remove("hidden");
}

loadCard();
