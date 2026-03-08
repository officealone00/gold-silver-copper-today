import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

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
    <div class="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div class="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h2 class="text-base font-semibold">앱 로딩 중 오류가 발생했습니다</h2>
        <p class="mt-2 text-sm text-muted-foreground">${escapeHtml(message)}</p>
        <button class="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" onclick="window.location.reload()">
          다시 시도
        </button>
      </div>
    </div>
  `;
};

window.addEventListener("error", (event) => {
  const message = event.error instanceof Error ? event.error.message : String(event.message ?? "Unknown error");
  console.error("Global error:", event.error ?? event.message);
  renderFatal(`앱 로딩 오류: ${message}`);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "Unknown rejection");
  console.error("Unhandled rejection:", event.reason);
  renderFatal(`앱 로딩 오류: ${reason}`);
});

async function bootstrap() {
  try {
    if (!rootElement) throw new Error("root element not found");
    const { default: App } = await import("./App.tsx");
    createRoot(rootElement).render(<App />);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Bootstrap error:", error);
    renderFatal(`앱 초기화 실패: ${message}`);
  }
}

void bootstrap();
