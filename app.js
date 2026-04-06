const SUPABASE_URL = "https://qmcgjabudzmvtefjgmfn.supabase.co";

// Pega aquí tu anon/publishable key de Supabase
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtY2dqYWJ1ZHptdnRlZmpnbWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDIzODMsImV4cCI6MjA5MTA3ODM4M30.tzGY5hRrgb7HC6pprGi2qyWdo6CQcFRbo_o8RUpClt0";

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
  try {
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
      showError(
        tarjetaError?.message
          ? `Error tarjeta: ${tarjetaError.message}`
          : "Tarjeta no encontrada."
      );
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
      } else if (usuarioError) {
        console.error("Error usuario:", usuarioError);
      }
    }

    document.getElementById("codigo_tarjeta").textContent =
      tarjeta.codigo_tarjeta || "-";
    document.getElementById("estatus").textContent =
      tarjeta.estatus || "-";
    document.getElementById("saldo_actual").textContent =
      formatMoney(tarjeta.saldo_actual);
    document.getElementById("fecha_vencimiento_saldo").textContent =
      formatDate(tarjeta.fecha_vencimiento_saldo);
    document.getElementById("nombre_cliente").textContent =
      nombreCliente;

    loadingEl.classList.add("hidden");
    errorEl.classList.add("hidden");
    contentEl.classList.remove("hidden");
  } catch (err) {
    console.error("Error general:", err);
    showError(`Error general: ${err.message}`);
  }
}

loadCard();
