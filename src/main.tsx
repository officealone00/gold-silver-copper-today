import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");
let appBootstrapped = false;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderFatal = (message: string) => {
  if (!rootElement) return;

  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f7f7f7;color:#222;">
      <div style="max-width:340px;width:100%;border-radius:16px;border:1px solid #e5e5e5;background:#fff;padding:24px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <h2 style="font-size:16px;font-weight:600;margin:0;">앱 로딩 중 오류가 발생했습니다</h2>
        <p style="margin:8px 0 0;font-size:14px;color:#888;">${escapeHtml(message)}</p>
        <button onclick="window.location.reload()" style="margin-top:16px;padding:8px 16px;border-radius:8px;border:none;background:#3b82f6;color:#fff;font-size:14px;font-weight:500;cursor:pointer;">
          다시 시도
        </button>
      </div>
    </div>
  `;
};

window.addEventListener("error", (event) => {
  // Ignore non-Error resource/script load issues (common in embedded webviews)
  if (!(event.error instanceof Error)) {
    console.warn("Non-fatal global error ignored:", event.message ?? event.type);
    return;
  }

  console.error("Global error:", event.error);

  // Only show fatal screen if app hasn't bootstrapped yet
  if (!appBootstrapped) {
    renderFatal(`앱 로딩 오류: ${event.error.message}`);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "Unknown rejection");
  console.warn("Unhandled rejection (non-fatal):", reason);

  // Only show fatal screen if app hasn't bootstrapped yet
  // After bootstrap, unhandled rejections (e.g. ad SDK) should not destroy the React tree
  if (!appBootstrapped) {
    renderFatal(`앱 초기화 실패: ${reason}`);
  }
});

async function bootstrap() {
  try {
    if (!rootElement) throw new Error("root element not found");
    const { default: App } = await import("./App.tsx");
    createRoot(rootElement).render(<App />);
    appBootstrapped = true;
    console.log("[Bootstrap] App rendered successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Bootstrap error:", error);
    renderFatal(`앱 초기화 실패: ${message}`);
  }
}

void bootstrap();
