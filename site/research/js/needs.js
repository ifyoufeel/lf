/* What a plant needs today, from weather and a few readings. Water uses FAO-56 Penman-Monteith reference
   evapotranspiration (Allen et al. 1998) times a single crop coefficient from FAO-56 Table 12. Light uses the DLI
   formula DLI = PPFD x hours x 0.0036; outdoor DLI assumes 48% of shortwave is PAR at 4.57 umol per joule.
   Blight uses the Hutton criteria (AHDB 2017). Every output names its basis and evidence strength. */
(function (g) {
  "use strict";
  // FAO-56 Table 12 single Kc (initial, mid, end) and an example spacing (m2 per plant)
  const CROPS = {
    tomatoes: { name: "Tomatoes", kc: [0.60, 1.15, 0.80], area: 0.5, kind: "fruiting", blight: true, base: 10 },
    lettuce: { name: "Lettuce", kc: [0.70, 1.00, 0.95], area: 0.09, kind: "leafy" },
    pepper: { name: "Sweet peppers", kc: [0.60, 1.05, 0.90], area: 0.35, kind: "fruiting", base: 10 },
    cucumber: { name: "Cucumbers", kc: [0.60, 1.00, 0.75], area: 0.6, kind: "fruiting", base: 10 },
    strawberry: { name: "Strawberries", kc: [0.40, 0.85, 0.75], area: 0.12, kind: "fruiting" },
    potato: { name: "Potatoes", kc: [0.50, 1.15, 0.75], area: 0.25, kind: "field", blight: true },
    maize: { name: "Maize", kc: [0.30, 1.20, 0.60], area: 0.13, kind: "field", base: 10, cap: 30 },
    wheat: { name: "Spring wheat", kc: [0.30, 1.15, 0.40], area: 0.004, kind: "field" }
  };
  const STAGES = { ini: "Initial", dev: "Development", mid: "Mid-season", late: "Late season" };
  const PRESETS = {
    kansas: { name: "Kansas pivots, summer 2026", note: "Means of 1 Jun to 31 Aug 2026, NASA POWER (MERRA-2, FLASHFlux)", tmax: 36.5, tmin: 21.4, rh: 47, u2: 3.5, rs: 26.5, lat: 38.06, elev: 940, doy: 196, setting: "outdoor", raw: 50, crop: "maize" },
    mkushi: { name: "Mkushi pivots, dry season 2026", note: "Means of 1 Jun to 31 Aug 2026, NASA POWER", tmax: 26.0, tmin: 10.8, rh: 51, u2: 2.6, rs: 20.0, lat: -13.84, elev: 1152, doy: 196, setting: "outdoor", raw: 40 },
    java: { name: "West Java lowland, dry season 2026", note: "Means of 1 Jul to 30 Sep 2026, NASA POWER", tmax: 31.5, tmin: 22.9, rh: 72, u2: 3.6, rs: 21.3, lat: -6.52, elev: 121, doy: 227, setting: "outdoor", raw: 30 },
    greenhouse: { name: "Greenhouse, example readings", note: "Example values to edit, not a measurement", tmax: 27, tmin: 17, rh: 70, u2: 0.5, rs: 12, lat: 52, elev: 10, doy: 135, setting: "greenhouse", raw: 4 },
    indoor: { name: "Indoor rack, example readings", note: "Example values to edit, not a measurement", tmax: 24, tmin: 20, rh: 65, u2: 0.3, rs: 0, ppfd: 250, hours: 16, lat: 52, elev: 10, doy: 135, setting: "indoor", raw: 2 }
  };

  const es = (T) => 0.6108 * Math.exp(17.27 * T / (T + 237.3));
  function et0(i) {
    const Tmax = +i.tmax, Tmin = +i.tmin, T = (Tmax + Tmin) / 2;
    const P = 101.3 * Math.pow((293 - 0.0065 * (+i.elev || 0)) / 293, 5.26);
    const gamma = 0.000665 * P;
    const esm = (es(Tmax) + es(Tmin)) / 2, ea = esm * (+i.rh) / 100;
    const delta = 4098 * es(T) / Math.pow(T + 237.3, 2);
    const u2 = Math.max(0.1, +i.u2);
    let Rs = +i.rs;
    if (i.setting === "indoor") Rs = dliToRs(dli(i)); // grow-light energy as shortwave-equivalent
    const J = +i.doy || 180, phi = (+i.lat || 0) * Math.PI / 180;
    const dr = 1 + 0.033 * Math.cos(2 * Math.PI * J / 365), dec = 0.409 * Math.sin(2 * Math.PI * J / 365 - 1.39);
    const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec))));
    const Ra = 24 * 60 / Math.PI * 0.0820 * dr * (ws * Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.sin(ws));
    const Rso = (0.75 + 2e-5 * (+i.elev || 0)) * Ra;
    const Rns = 0.77 * Rs;
    const ratio = i.setting === "outdoor" ? Math.max(0.25, Math.min(1, Rs / Math.max(Rso, 0.1))) : 0.5;
    const Rnl = 4.903e-9 * (Math.pow(Tmax + 273.16, 4) + Math.pow(Tmin + 273.16, 4)) / 2 * (0.34 - 0.14 * Math.sqrt(Math.max(ea, 0))) * (1.35 * ratio - 0.35);
    const Rn = i.setting === "outdoor" ? Rns - Rnl : Rns * 0.85;
    const v = (0.408 * delta * Rn + gamma * 900 / (T + 273) * u2 * (esm - ea)) / (delta + gamma * (1 + 0.34 * u2));
    return { et0: Math.max(0, v), vpd: Math.max(0, esm - ea), ea, Ra };
  }
  const dli = (i) => i.setting === "indoor" ? (+i.ppfd || 0) * (+i.hours || 0) * 0.0036 : (+i.rs || 0) * 0.48 * 4.57;
  const dliToRs = (d) => d / (0.48 * 4.57);
  function kcFor(crop, stage) { const k = CROPS[crop].kc; return stage === "ini" ? k[0] : stage === "dev" ? (k[0] + k[1]) / 2 : stage === "mid" ? k[1] : k[2]; }

  function predict(i) {
    const c = CROPS[i.crop] || CROPS.tomatoes;
    const e = et0(i);
    const kc = kcFor(i.crop, i.stage);
    const etc = e.et0 * kc;
    const area = +i.area || c.area;
    const litres = etc * area; // 1 mm over 1 m2 = 1 L
    const raw = Math.max(1, +i.raw || 20);
    const interval = raw / Math.max(etc, 0.05);
    const flow = Math.max(0.1, +i.flow || 2);
    const minutes = raw * area / flow * 60;
    const D = dli(i);
    const out = { crop: c, et0: e.et0, kc, etc, litres, interval, perEvent: raw * area, minutes, vpd: e.vpd, dli: D, flags: [] };
    // light
    const target = c.kind === "leafy" ? [12, 17] : c.kind === "fruiting" ? [15, null] : null;
    out.light = target ? { target, ok: D >= target[0], text: D < target[0] ? `Below the ${target[0]} mol m⁻² d⁻¹ minimum that MSU Extension gives for ${c.kind === "leafy" ? "leafy greens" : "fruiting vegetables"}.` : `At or above the ${target[0]} mol m⁻² d⁻¹ minimum (MSU Extension guidance).` } : { target: null, ok: true, text: "Field crop in sunlight: no supplementary light target applies." };
    // air
    out.air = e.vpd < 0.4 ? { level: "humid", text: "Very humid air. Leaves stay wet longer, which favours many fungal diseases. Ventilate or warm slightly." }
      : e.vpd > 1.6 ? { level: "dry", text: "Drying air. Transpiration runs high and stomata may close in the afternoon. Water demand rises." }
      : { level: "ok", text: "Within the range most greenhouse guidance treats as workable. A practitioner range, not a crop-specific target." };
    // heat
    out.heat = +i.tmax >= 35 ? { level: "high", text: "Maximum at or above 35 °C. Heat at flowering cuts fruit set and grain fill in many crops." } : { level: "ok", text: "No heat flag at this maximum." };
    if (c.base) {
      const cap = c.cap || 30, base = c.base;
      out.gdd = Math.max(0, (Math.min(+i.tmax, cap) + Math.max(+i.tmin, base)) / 2 - base);
    }
    // disease: Hutton criteria for late blight hosts
    if (c.blight) {
      const d1 = +i.tminY >= 10 && +i.humidY >= 6, d2 = +i.tmin >= 10 && +i.humid >= 6;
      out.blight = d1 && d2 ? { level: "high", text: "Hutton period met: two days with minimum ≥ 10 °C and ≥ 6 h at RH ≥ 90%. High late blight risk; act before the next wet spell." }
        : (d1 || d2) ? { level: "watch", text: "One of two Hutton days met. Watch tomorrow’s humidity." }
        : { level: "ok", text: "Hutton criteria not met." };
    }
    // nutrients
    if (i.ph !== "" && i.ph !== undefined && isFinite(+i.ph) && +i.ph > 0) {
      const ph = +i.ph;
      out.ph = ph < 5.5 ? { level: "low", text: `pH ${ph.toFixed(1)} is below the 5.5–6.5 window most hydroponic guides use. HortusPilot pH doses pH+ to bring it back.` }
        : ph > 6.5 ? { level: "high", text: `pH ${ph.toFixed(1)} is above the 5.5–6.5 window. Iron and manganese become harder for roots to take up. HortusPilot pH doses pH−.` }
        : { level: "ok", text: `pH ${ph.toFixed(1)} is inside the 5.5–6.5 window.` };
    }
    if (isFinite(+i.ec) && +i.ec > 0 && isFinite(+i.ecTarget) && +i.ecTarget > 0) {
      const d = +i.ec - +i.ecTarget;
      out.ec = Math.abs(d) <= 0.3 ? { level: "ok", text: `EC ${(+i.ec).toFixed(1)} mS/cm is within 0.3 of your recipe.` }
        : d < 0 ? { level: "low", text: `EC is ${(-d).toFixed(1)} mS/cm under your recipe. HortusPilot N feeds to the set EC, then corrects pH.` }
        : { level: "high", text: `EC is ${d.toFixed(1)} mS/cm over your recipe. Top up with water before the next feed.` };
    }
    if (i.setting !== "outdoor" && isFinite(+i.co2) && +i.co2 > 0) {
      const co2 = +i.co2;
      out.co2 = co2 > 5000 ? { level: "high", text: "Above 5,000 ppm, the US OSHA 8-hour exposure limit. Ventilate before anyone works in the room." }
        : co2 < 400 ? { level: "low", text: "Below outdoor air. Ventilate during the light period." }
        : { level: "ok", text: "Plants use extra CO₂ only while the lights are on. HortusRoom C holds a threshold between 400 and 2,000 ppm." };
    }
    // soil moisture trigger
    if (isFinite(+i.moisture) && +i.moisture > 0) {
      const m = +i.moisture, trig = +i.trigger || 30;
      out.moisture = m <= trig ? { level: "low", text: `Reading ${m}% is at or below your ${trig}% trigger. Water now: about ${(raw * area).toFixed(1)} L per plant.` } : { level: "ok", text: `Reading ${m}% is above your ${trig}% trigger. Next watering in about ${Math.max(0, interval).toFixed(1)} days at today’s demand.` };
    }
    out.plan = Array.from({ length: 7 }, (_, d) => ({ day: d + 1, need: litres, water: (d + 1) % Math.max(1, Math.round(interval)) === 0 }));
    return out;
  }

  const TIERS = [
    { id: 0, name: "Look", short: "Phone photo, AI vision, a log", senses: ["Photo: colour indices (ExG, VARI)", "Your notes"], decides: ["What to inspect first", "When to ask an expert"], acts: ["You water, feed and treat by hand"], hw: ["This page"], ev: "Limited", evx: "Colour indices screen for stress; they do not diagnose. Field accuracy of image classifiers falls sharply outside their training conditions." },
    { id: 1, name: "Sense", short: "Soil moisture, air temperature and humidity", senses: ["Root-zone moisture", "Air temperature and humidity"], decides: ["Water when the roots ask", "Heat or cool on two channels"], acts: ["One pump on a moisture trigger", "Heater and cooler sockets"], hw: ["HortusRoom S: waters from a moisture reading, 10 seconds to 60 minutes, pause 1 minute to 10 hours, pump up to 1,500 W", "HortusRoom A: two channels up to 1,500 W each, −40 to +80 °C"], ev: "Moderate", evx: "Sensor-triggered irrigation is established practice; probes must be calibrated to the substrate." },
    { id: 2, name: "Control", short: "Closed loops for feed, pH, climate and CO₂", senses: ["EC and pH of the feed", "Solution and air temperature", "CO₂"], decides: ["Feed to the set EC, then correct pH", "Raise CO₂ while the light is on"], acts: ["Peristaltic dosing of up to three nutrients", "pH+ and pH− pumps", "CO₂ regulator or fan"], hw: ["HortusPilot N: EC 0.1–5.0 mS, pH 3.0–14.0, tanks 10–2,000 L", "HortusPilot F: 15 sensors, 26 alarms, RS-485 Modbus", "HortusPilot pH: PI control, pH 3.0–12.0", "HortusRoom C: CO₂ 300–5,000 ppm, threshold 400–2,000 ppm"], ev: "Moderate", evx: "Closed-loop EC and pH control is standard in commercial hydroponics; probe drift is the main failure." },
    { id: 3, name: "Predict", short: "Weather, satellite and crop models", senses: ["Weather: temperature, humidity, wind, radiation", "Satellite canopy (NDVI, NDRE, NDMI)", "Logs from tiers 1–2"], decides: ["Water demand from ET₀ × Kc", "Light and heat budgets", "Blight periods ahead of time"], acts: ["Set points move with the forecast", "Alerts before stress shows"], hw: ["Tier 2 hardware plus a data link (Wi-Fi or RS-485)"], ev: "Moderate", evx: "FAO-56 water budgeting is a mature method; satellite crop coefficients need local calibration." },
    { id: 4, name: "Autonomy", short: "Model-predictive control and robotics", senses: ["All of the above, continuously"], decides: ["Trade yield against energy, water and CO₂ cost", "Plan days ahead"], acts: ["The system runs the room; people audit it"], hw: ["A climate computer on top of tiers 1–3"], ev: "Limited", evx: "In the first Autonomous Greenhouse Challenge one AI team out-produced the manual reference; results across crops and sites are still few." }
  ];

  g.HortusNeeds = { CROPS, STAGES, PRESETS, TIERS, predict, et0, dli };
})(window);
