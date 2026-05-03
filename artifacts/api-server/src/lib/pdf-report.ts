import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const HUB_ORANGE = "#f97316";
const HUB_DARK = "#3b1f0e";
const HUB_LIGHT_ORANGE = "#fff7ed";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";
const BORDER_GRAY = "#e5e7eb";

export interface ReportData {
  businessId: number;
  businessName: string;
  planType: string;
  zone: string;
  month: string;
  totalClicks: number;
  whatsappClicks: number;
  phoneClicks: number;
  profileViews: number;
  rating: number;
  reviewsCount: number;
  boostActive: boolean;
  boostType: string | null;
  dailyClicks: { date: string; clicks: number }[];
  prevMonth?: {
    totalClicks: number;
    whatsappClicks: number;
    phoneClicks: number;
  } | null;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}

function delta(current: number, prev: number | undefined): string {
  if (prev === undefined || prev === null) return "";
  if (prev === 0) return current > 0 ? " (+∞%)" : "";
  const pct = Math.round(((current - prev) / prev) * 100);
  return pct >= 0 ? ` (+${pct}%)` : ` (${pct}%)`;
}

function deltaColor(current: number, prev: number | undefined): string {
  if (prev === undefined || prev === null) return GRAY;
  if (current >= prev) return "#16a34a";
  return "#dc2626";
}

function recommendations(data: ReportData): string[] {
  const tips: string[] = [];

  if (data.whatsappClicks < 5) {
    tips.push("Adicione seu WhatsApp ao perfil e responda rapidamente — clientes convertem mais pelo chat.");
  }
  if (data.rating < 4.0 && data.reviewsCount > 0) {
    tips.push("Sua avaliação média está abaixo de 4,0. Peça para clientes satisfeitos deixarem avaliações.");
  }
  if (data.reviewsCount < 5) {
    tips.push("Com menos de 5 avaliações você aparece menos nas buscas. Peça avaliações para clientes frequentes.");
  }
  if (!data.boostActive) {
    tips.push("Ative o Destaque de Zona para aparecer no topo da sua região por 30 dias.");
  }
  if (data.profileViews < 20) {
    tips.push("Poucas visualizações este mês. Complete as fotos e descrição do perfil para melhorar o ranqueamento.");
  }
  if (data.phoneClicks === 0 && data.totalClicks > 10) {
    tips.push("Nenhum clique no telefone. Certifique-se que o número está correto no perfil.");
  }

  if (tips.length === 0) {
    tips.push("Ótimo desempenho! Continue mantendo o perfil atualizado e respondendo às avaliações.");
    tips.push("Considere adicionar fotos novas do seu espaço para atrair mais clientes.");
  }

  return tips.slice(0, 4);
}

export async function generatePdfReport(data: ReportData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const doc = new PDFDocument({ size: "A4", margin: 0, compress: true });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const W = doc.page.width;
    const H = doc.page.height;
    const M = 48;
    const contentW = W - M * 2;

    let y = 0;

    function rect(x: number, ry: number, w: number, h: number, color: string, radius = 0) {
      doc.save().fillColor(color).roundedRect(x, ry, w, h, radius).fill().restore();
    }

    function hLine(ry: number, color = BORDER_GRAY) {
      doc.save().strokeColor(color).lineWidth(0.5).moveTo(M, ry).lineTo(W - M, ry).stroke().restore();
    }

    function metricCard(x: number, cardY: number, w: number, label: string, value: string, delta: string, dColor: string) {
      rect(x, cardY, w, 72, LIGHT_GRAY, 8);
      doc.fontSize(9).fillColor(GRAY).font("Helvetica").text(label, x + 12, cardY + 12, { width: w - 24 });
      doc.fontSize(22).fillColor(HUB_DARK).font("Helvetica-Bold").text(value, x + 12, cardY + 26, { width: w - 24 });
      if (delta) {
        doc.fontSize(9).fillColor(dColor).font("Helvetica").text(delta, x + 12, cardY + 54, { width: w - 24 });
      }
    }

    // ─── HEADER ───────────────────────────────────────────────────────
    rect(0, 0, W, 110, HUB_DARK);

    doc.fontSize(22).fillColor(HUB_ORANGE).font("Helvetica-Bold")
      .text("Hub", M, 32, { continued: true })
      .fillColor("#ffffff").font("Helvetica").text(" Londrina");

    doc.fontSize(10).fillColor("rgba(255,255,255,0.65)").font("Helvetica")
      .text("Relatório Premium de Desempenho", M, 60);

    doc.fontSize(11).fillColor(HUB_ORANGE).font("Helvetica-Bold")
      .text(formatMonth(data.month), M, 78);

    doc.fontSize(10).fillColor("#ffffff").font("Helvetica-Bold")
      .text(data.businessName, W - M - 200, 32, { width: 200, align: "right" });
    doc.fontSize(9).fillColor("rgba(255,255,255,0.65)").font("Helvetica")
      .text(`Plano ${data.planType.charAt(0).toUpperCase() + data.planType.slice(1)} · Zona ${data.zone.charAt(0).toUpperCase() + data.zone.slice(1)}`, W - M - 200, 50, { width: 200, align: "right" });

    y = 130;

    // ─── MÉTRICAS PRINCIPAIS ──────────────────────────────────────────
    doc.fontSize(13).fillColor(HUB_DARK).font("Helvetica-Bold")
      .text("Métricas do mês", M, y);
    y += 22;

    const cardW = (contentW - 12) / 4;
    const prev = data.prevMonth;

    metricCard(M, y, cardW, "Visualizações", String(data.profileViews),
      delta(data.profileViews, prev?.totalClicks),
      deltaColor(data.profileViews, prev?.totalClicks));

    metricCard(M + cardW + 4, y, cardW, "Cliques WhatsApp", String(data.whatsappClicks),
      delta(data.whatsappClicks, prev?.whatsappClicks),
      deltaColor(data.whatsappClicks, prev?.whatsappClicks));

    metricCard(M + (cardW + 4) * 2, y, cardW, "Cliques Telefone", String(data.phoneClicks),
      delta(data.phoneClicks, prev?.phoneClicks),
      deltaColor(data.phoneClicks, prev?.phoneClicks));

    const ratingColor = data.rating >= 4.5 ? "#16a34a" : data.rating >= 3.5 ? "#d97706" : "#dc2626";
    metricCard(M + (cardW + 4) * 3, y, cardW, "Avaliação Média",
      data.rating > 0 ? `${data.rating} ★` : "—",
      data.reviewsCount > 0 ? `${data.reviewsCount} avaliações` : "Sem avaliações",
      ratingColor);

    y += 88;

    // ─── GRÁFICO DE BARRAS (cliques diários) ──────────────────────────
    if (data.dailyClicks.length > 0) {
      doc.fontSize(13).fillColor(HUB_DARK).font("Helvetica-Bold")
        .text("Cliques diários — últimos 30 dias", M, y);
      y += 22;

      const chartH = 100;
      const chartW = contentW;
      const maxVal = Math.max(...data.dailyClicks.map(d => d.clicks), 1);

      rect(M, y, chartW, chartH + 20, LIGHT_GRAY, 8);

      const barW = Math.max(2, Math.floor((chartW - 24) / data.dailyClicks.length) - 1);
      data.dailyClicks.forEach((d, i) => {
        const barH = Math.max(2, Math.round((d.clicks / maxVal) * (chartH - 16)));
        const bx = M + 12 + i * (barW + 1);
        const by = y + 10 + (chartH - 16) - barH;
        rect(bx, by, barW, barH, HUB_ORANGE);
      });

      doc.fontSize(8).fillColor(GRAY).font("Helvetica");
      const first = data.dailyClicks[0]?.date?.slice(5) || "";
      const last = data.dailyClicks[data.dailyClicks.length - 1]?.date?.slice(5) || "";
      doc.text(first, M + 12, y + chartH + 6);
      doc.text(last, W - M - 40, y + chartH + 6, { width: 40, align: "right" });

      y += chartH + 36;
    }

    // ─── STATUS IMPULSIONAMENTO ────────────────────────────────────────
    doc.fontSize(13).fillColor(HUB_DARK).font("Helvetica-Bold")
      .text("Impulsionamento", M, y);
    y += 22;

    const boostColor = data.boostActive ? "#16a34a" : "#6b7280";
    const boostBg = data.boostActive ? "#f0fdf4" : LIGHT_GRAY;
    const boostText = data.boostActive
      ? `✓ Ativo — ${data.boostType || "Destaque"}`
      : "Sem impulsionamento ativo no período";

    rect(M, y, contentW, 36, boostBg, 8);
    doc.fontSize(10).fillColor(boostColor).font("Helvetica-Bold")
      .text(boostText, M + 12, y + 12, { width: contentW - 24 });
    y += 52;

    // ─── RECOMENDAÇÕES ────────────────────────────────────────────────
    hLine(y - 4);
    doc.fontSize(13).fillColor(HUB_DARK).font("Helvetica-Bold")
      .text("Recomendações", M, y + 4);
    y += 28;

    const tips = recommendations(data);
    tips.forEach((tip, i) => {
      rect(M, y, 4, 14, HUB_ORANGE, 2);
      doc.fontSize(10).fillColor(HUB_DARK).font("Helvetica")
        .text(`${tip}`, M + 12, y, { width: contentW - 12 });
      y += doc.currentLineHeight() * 1.8 + 6;
    });

    y += 10;

    // ─── RODAPÉ ───────────────────────────────────────────────────────
    hLine(H - 48);
    const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    doc.fontSize(8).fillColor(GRAY).font("Helvetica")
      .text(`Hub Londrina — Relatório gerado em ${now}`, M, H - 36)
      .text("www.hublondrina.com.br", W - M - 150, H - 36, { width: 150, align: "right" });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}
