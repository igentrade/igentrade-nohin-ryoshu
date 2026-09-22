const yen = (n) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const todayISO = () => new Date().toISOString().slice(0, 10);
const stateKey = "igentrade-nohin-ryoshu-draft-v1";

function el(id) {
  return document.getElementById(id);
}

function defaultItem() {
  return { name: "", qty: 1, unit: "式", price: 0 };
}

function escapeAttr(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

let items = [defaultItem(), defaultItem(), defaultItem()];

function renderItemInputs() {
  const root = el("items");
  root.innerHTML = "";
  items.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input data-k="name" data-i="${idx}" placeholder="品目" value="${escapeAttr(item.name)}" />
      <input data-k="qty" data-i="${idx}" type="number" min="0" step="1" value="${item.qty}" />
      <input data-k="unit" data-i="${idx}" placeholder="単位" value="${escapeAttr(item.unit)}" />
      <input data-k="price" data-i="${idx}" type="number" min="0" step="1" value="${item.price}" />
      <button type="button" data-del="${idx}" title="削除">×</button>
    `;
    root.appendChild(row);
  });
}

function readForm() {
  return {
    docType: el("docType").value,
    issueDate: el("issueDate").value,
    docNumber: el("docNumber").value.trim(),
    orderNumber: el("orderNumber").value.trim(),
    sellerName: el("sellerName").value.trim(),
    sellerAddress: el("sellerAddress").value.trim(),
    sellerContact: el("sellerContact").value.trim(),
    invoiceReg: el("invoiceReg").value.trim(),
    buyerName: el("buyerName").value.trim(),
    buyerAddress: el("buyerAddress").value.trim(),
    proviso: el("proviso").value.trim(),
    payMethod: el("payMethod").value,
    taxRate: Number(el("taxRate").value),
    notes: el("notes").value.trim(),
    items: items.map((x) => ({
      name: x.name,
      qty: Number(x.qty) || 0,
      unit: x.unit,
      price: Number(x.price) || 0,
    })),
  };
}

function calc(data) {
  const lines = data.items.filter((i) => i.name || i.price || i.qty);
  const subtotal = lines.reduce((sum, i) => sum + i.qty * i.price, 0);
  const tax = Math.floor(subtotal * data.taxRate);
  const total = subtotal + tax;
  return { lines, subtotal, tax, total };
}

function refreshPreview() {
  const data = readForm();
  const { lines, subtotal, tax, total } = calc(data);
  const isReceipt = data.docType === "receipt";

  el("receiptOnly").style.display = isReceipt ? "block" : "none";
  el("orderLabel").style.display = isReceipt ? "none" : "block";
  el("orderRow").style.display = isReceipt ? "none" : "block";
  el("receiptMeta").hidden = !isReceipt;

  el("docLabel").textContent = isReceipt ? "領収書" : "納品書";
  el("docSub").textContent = isReceipt ? "Receipt" : "Delivery Note";
  el("dateLabel").textContent = isReceipt ? "発行日" : "納品日";
  el("totalBannerLabel").textContent = isReceipt
    ? "領収金額（税込）"
    : "納品合計（税込）";
  el("pHonor").textContent = isReceipt
    ? "上記正に領収いたしました。"
    : "下記の通り納品いたしました。";
  el("pConfirmText").textContent = isReceipt
    ? "必要に応じて社印・担当印をご利用ください。5万円以上は収入印紙の確認を。"
    : "受領印など必要に応じてご利用ください。";

  el("pDocNumber").textContent = data.docNumber || "—";
  el("pIssueDate").textContent = data.issueDate || "—";
  el("pOrderNumber").textContent = data.orderNumber || "—";
  el("pBuyerName").textContent = data.buyerName || "（宛名）";
  el("pBuyerAddress").textContent = data.buyerAddress;
  el("pSellerName").textContent = data.sellerName || "（自社名）";
  el("pSellerAddress").textContent = data.sellerAddress;
  el("pSellerContact").textContent = data.sellerContact;
  el("pInvoiceReg").textContent = data.invoiceReg
    ? `登録番号: ${data.invoiceReg}`
    : "";
  el("pProviso").textContent = data.proviso || "—";
  el("pPayMethod").textContent = data.payMethod || "—";

  const tbody = el("pItems");
  tbody.innerHTML = "";
  if (!lines.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="color:#5b6475">明細を入力してください</td></tr>';
  } else {
    lines.forEach((i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeAttr(i.name)}</td>
        <td>${i.qty}</td>
        <td>${escapeAttr(i.unit || "")}</td>
        <td>${yen(i.price)}</td>
        <td>${yen(i.qty * i.price)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  const ratePct = Math.round(data.taxRate * 100);
  el("pTaxLabel").textContent =
    data.taxRate === 0 ? "消費税" : `消費税（${ratePct}%）`;
  el("pSubtotal").textContent = yen(subtotal);
  el("pTax").textContent = yen(tax);
  el("pTotal").textContent = yen(total);
  el("pGrandTotal").textContent = yen(total);
  el("pNotes").textContent = data.notes || "—";
}

function applyDocDefaults() {
  const isReceipt = el("docType").value === "receipt";
  const year = new Date().getFullYear();
  if (isReceipt) {
    if (!el("docNumber").value || el("docNumber").value.startsWith("DN-")) {
      el("docNumber").value = `RC-${year}-001`;
    }
    if (!el("notes").value) {
      el("notes").value = "本領収書は再発行できません。";
    }
  } else {
    if (!el("docNumber").value || el("docNumber").value.startsWith("RC-")) {
      el("docNumber").value = `DN-${year}-001`;
    }
  }
  refreshPreview();
}

function bind() {
  el("issueDate").value = todayISO();
  el("sellerName").value = "合同会社威源国際貿易";
  el("proviso").value = "お品代として";
  el("notes").value = "内容に相違なければ受領印をお願いいたします。";
  el("docNumber").value = `DN-${new Date().getFullYear()}-001`;

  renderItemInputs();
  refreshPreview();

  el("items").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.k) return;
    const i = Number(t.dataset.i);
    items[i][t.dataset.k] = t.type === "number" ? Number(t.value) : t.value;
    refreshPreview();
  });
  el("items").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    items.splice(Number(btn.dataset.del), 1);
    if (!items.length) items.push(defaultItem());
    renderItemInputs();
    refreshPreview();
  });
  el("addItem").addEventListener("click", () => {
    items.push(defaultItem());
    renderItemInputs();
    refreshPreview();
  });
  el("docType").addEventListener("change", applyDocDefaults);

  [
    "issueDate",
    "docNumber",
    "orderNumber",
    "sellerName",
    "sellerAddress",
    "sellerContact",
    "invoiceReg",
    "buyerName",
    "buyerAddress",
    "proviso",
    "payMethod",
    "taxRate",
    "notes",
  ].forEach((id) => el(id).addEventListener("input", refreshPreview));

  el("printBtn").addEventListener("click", () => window.print());
  el("saveLocal").addEventListener("click", () => {
    localStorage.setItem(stateKey, JSON.stringify(readForm()));
    alert("下書きをこのブラウザに保存しました。");
  });
  el("loadLocal").addEventListener("click", () => {
    const raw = localStorage.getItem(stateKey);
    if (!raw) {
      alert("保存された下書きがありません。");
      return;
    }
    const data = JSON.parse(raw);
    el("docType").value = data.docType || "delivery";
    el("issueDate").value = data.issueDate || "";
    el("docNumber").value = data.docNumber || "";
    el("orderNumber").value = data.orderNumber || "";
    el("sellerName").value = data.sellerName || "";
    el("sellerAddress").value = data.sellerAddress || "";
    el("sellerContact").value = data.sellerContact || "";
    el("invoiceReg").value = data.invoiceReg || "";
    el("buyerName").value = data.buyerName || "";
    el("buyerAddress").value = data.buyerAddress || "";
    el("proviso").value = data.proviso || "";
    el("payMethod").value = data.payMethod || "振込";
    el("taxRate").value = String(data.taxRate ?? 0.1);
    el("notes").value = data.notes || "";
    items = (data.items && data.items.length ? data.items : [defaultItem()]).map(
      (x) => ({
        name: x.name || "",
        qty: x.qty ?? 1,
        unit: x.unit || "式",
        price: x.price ?? 0,
      })
    );
    renderItemInputs();
    refreshPreview();
  });
}

bind();
