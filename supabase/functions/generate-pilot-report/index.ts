import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { requestOpenAI } from "../_shared/openai.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };
type Property = {
  id: string;
  name: string;
  pilot_start_date: string;
  pilot_report_status: string;
};

function utcDay(date: string, days = 0) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function ascii(value: unknown) {
  return String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "")
    .replace(/[()\\]/g, "\\$&");
}

function wrap(value: string, width = 88) {
  const words = ascii(value).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
}

// A small, dependency-free PDF writer is sufficient for this one-page text report.
export function createReportPdf(
  lines: { text: string; size?: number; bold?: boolean }[],
) {
  let y = 750;
  const commands = lines.flatMap(({ text, size = 11, bold = false }) =>
    wrap(text, size >= 18 ? 55 : 88).map((line) => {
      const command = `BT /${
        bold ? "F2" : "F1"
      } ${size} Tf 54 ${y} Td (${line}) Tj ET`;
      y -= size + 7;
      return command;
    })
  ).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${
      new TextEncoder().encode(commands).length
    } >>\nstream\n${commands}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${
    offsets.slice(1).map((offset) =>
      `${String(offset).padStart(10, "0")} 00000 n `
    ).join("\n")
  }\n`;
  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Use POST to generate pilot reports." }),
      { status: 405, headers: JSON_HEADERS },
    );
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("PORTER_CRON_SECRET");
  if (!url || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Report generation is not configured." }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
  const serviceAuthorized =
    request.headers.get("authorization") === `Bearer ${serviceKey}`;
  const cronAuthorized = Boolean(
    cronSecret && request.headers.get("x-porter-cron-secret") === cronSecret,
  );
  if (!serviceAuthorized && !cronAuthorized) {
    return new Response(JSON.stringify({ error: "Not authorized." }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  let body: { property_id?: string } = {};
  try {
    body = await request.json();
  } catch { /* scheduled calls have an empty body */ }
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  let query = db.from("properties").select(
    "id,name,pilot_start_date,pilot_report_status",
  ).not("pilot_start_date", "is", null);
  if (body.property_id) query = query.eq("id", body.property_id);
  else query = query.eq("pilot_report_status", "pending");
  const { data, error } = await query;
  if (error) {
    return new Response(
      JSON.stringify({ error: "Properties could not be loaded." }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const targets = (data as Property[] ?? []).filter((property) =>
    body.property_id ||
    utcDay(property.pilot_start_date, 30).toISOString().slice(0, 10) === today
  );
  const processed: { property_id: string; status: "ready" | "failed" }[] = [];
  for (const property of targets) {
    await db.from("properties").update({ pilot_report_status: "generating" })
      .eq("id", property.id);
    try {
      const since = utcDay(property.pilot_start_date).toISOString();
      const until = utcDay(property.pilot_start_date, 30).toISOString();
      const [statsResult, intentsResult] = await Promise.all([
        db.rpc("get_dashboard_stats", {
          p_property_id: property.id,
          p_since: since,
          p_until: until,
        }),
        db.rpc("get_top_intents", {
          p_property_id: property.id,
          p_since: since,
          p_until: until,
          p_limit: 5,
        }),
      ]);
      if (statsResult.error || intentsResult.error) {
        throw statsResult.error ?? intentsResult.error;
      }
      const stats = statsResult.data?.[0] ?? {};
      const total = Number(stats.total_conversations ?? 0);
      const deflection = total
        ? `${(Number(stats.resolved_conversations) / total * 100).toFixed(1)}%`
        : "--";
      const escalation = total
        ? `${(Number(stats.escalated_conversations) / total * 100).toFixed(1)}%`
        : "--";
      const intentSummary = (intentsResult.data ?? []).map((
        item: { intent: string; conversation_count: number },
      ) => `${item.intent} (${item.conversation_count})`).join(", ") ||
        "No detected intents";
      let narrative =
        `During the pilot, Porter handled ${total} guest conversations with a ${deflection} deflection rate and ${escalation} escalation rate. It also drove ${
          stats.upsell_clicks ?? 0
        } upsell clicks and captured ${
          stats.identities_captured ?? 0
        } guest identities.`;
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      const highlightPrompt =
        `Write a factual two-sentence executive highlight for a hotel GM. Conversations: ${total}; deflection: ${deflection}; escalation: ${escalation}; upsell clicks: ${
          stats.upsell_clicks ?? 0
        }; identities captured: ${
          stats.identities_captured ?? 0
        }; top intents: ${intentSummary}.`;
      if (openaiKey) {
        try {
          narrative = await requestOpenAI(openaiKey, highlightPrompt, {
            maxOutputTokens: 180,
          });
        } catch (aiError) {
          console.error("OpenAI report narrative failed", aiError);
        }
      } else if (anthropicKey) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251010",
            max_tokens: 180,
            messages: [{ role: "user", content: highlightPrompt }],
          }),
        });
        if (response.ok) {
          const result = await response.json();
          narrative = result.content?.[0]?.text?.trim() || narrative;
        }
      }
      const lines = [
        { text: "Porter - 30-Day Pilot Report", size: 22, bold: true },
        { text: property.name, size: 16, bold: true },
        {
          text: `Pilot window: ${property.pilot_start_date} to ${
            until.slice(0, 10)
          }`,
        },
        { text: " " },
        { text: "Performance", size: 15, bold: true },
        { text: `Deflection rate: ${deflection}` },
        { text: `Escalation rate: ${escalation}` },
        { text: `Upsell clicks: ${stats.upsell_clicks ?? 0}` },
        { text: `Identities captured: ${stats.identities_captured ?? 0}` },
        { text: "Top intents", size: 15, bold: true },
        ...(intentsResult.data?.length
          ? intentsResult.data.map((
            item: { intent: string; conversation_count: number },
          ) => ({ text: `${item.intent}: ${item.conversation_count}` }))
          : [{ text: "--" }]),
        { text: "Highlights", size: 15, bold: true },
        { text: narrative },
      ];
      const upload = await db.storage.from("pilot-reports").upload(
        `${property.id}/day30.pdf`,
        createReportPdf(lines),
        { contentType: "application/pdf", upsert: true },
      );
      if (upload.error) throw upload.error;
      const ready = await db.from("properties").update({
        pilot_report_status: "ready",
      }).eq("id", property.id);
      if (ready.error) throw ready.error;
      processed.push({ property_id: property.id, status: "ready" });
    } catch (failure) {
      console.error("Pilot report failed", property.id, failure);
      await db.from("properties").update({ pilot_report_status: "failed" }).eq(
        "id",
        property.id,
      );
      processed.push({ property_id: property.id, status: "failed" });
    }
  }
  return new Response(JSON.stringify({ processed }), {
    status: 200,
    headers: JSON_HEADERS,
  });
});
