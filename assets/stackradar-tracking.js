(function () {
  "use strict";

  var config = window.STACKRADAR_CONFIG || {};
  var measurementId = config.measurementId || "";

  if (measurementId && !window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { anonymize_ip: true });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function event(name, params) {
    if (window.gtag) window.gtag("event", name, params || {});
    window.dispatchEvent(new CustomEvent("stackradar:measurement", { detail: { name: name, params: params || {} } }));
  }

  document.addEventListener("click", function (click) {
    var link = click.target.closest && click.target.closest("a");
    if (!link) return;

    var offer = link.getAttribute("data-offer");
    var external = link.hostname && link.hostname !== window.location.hostname;
    if (!offer && !external) return;

    var url;
    try { url = new URL(link.href); } catch (_) { return; }
    if (offer) {
      url.searchParams.set("utm_source", "stackradar");
      url.searchParams.set("utm_medium", "organic");
      url.searchParams.set("utm_campaign", "product_cta");
      url.searchParams.set("utm_content", offer);
      link.href = url.toString();
    }
    event(offer ? "product_cta_click" : "outbound_click", {
      offer: offer || undefined,
      destination: url.hostname,
      page_path: window.location.pathname,
      link_text: (link.textContent || "").trim().slice(0, 100)
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    event("page_ready", { page_path: window.location.pathname });
  });
}());
